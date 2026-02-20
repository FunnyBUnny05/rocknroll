import { getAudioAnalysis, getAudioFeatures } from './SpotifyService';
import { generateGuitarInstructions } from './deepseekService';
import { analyzeAudio } from './audioAnalysisEngine';
import { buildVoicingMap } from './chordVoicings';
import { useSettingsStore } from '../store/useSettingsStore';
import type { Song, SheetSection, TranscriptionUncertainty } from '../types/song';
import type { AudioAnalysisResult } from './audioAnalysisEngine';

interface DeepSeekSheetResult {
    title: string;
    artist: string;
    originalKey: string;
    bpm: number;
    timeSignature?: string;
    type: 'chord' | 'tab';
    chordsUsed: string[];
    voicings?: Record<string, string>;
    sections: SheetSection[];
    uncertainties?: { location: string; message: string; candidates: string[]; confidences: number[] }[];
}

/**
 * Transcribe a Spotify track into a static printable Guitar Sheet.
 *
 * Pipeline:
 *  1. Fetch Spotify Audio Analysis & Features
 *  2. Run local harmonic analysis (key/scale/tempo/chord detection from chroma)
 *  3. Send structured analysis to DeepSeek AI for full sheet generation
 *  4. Merge local analysis + AI output into Song model
 *  5. Attach guitar voicings and uncertainties
 */
export async function transcribeSpotifyTrack(
    trackId: string,
    trackName: string,
    artistName: string,
    trackUri: string,
    mode: 'chord' | 'tab'
): Promise<Song> {

    let bpm = 120;
    let timeSignature: [number, number] = [4, 4];
    let confidence = 0.5;

    try {
        const { level } = useSettingsStore.getState();

        const CACHE_VERSION = 'v-sheet-3';
        const cacheKey = `rocknroll-sheet-${CACHE_VERSION}-${trackId}-${mode}-${level}-${useSettingsStore.getState().aiProvider}`;
        const cached = localStorage.getItem(cacheKey);

        if (cached) {
            try {
                return JSON.parse(cached);
            } catch {
                // Ignore invalid cache
            }
        }

        // 1. Fetch Spotify Audio Analysis & Features
        console.info('[Pipeline] Step 1: Fetching Spotify audio data...');
        const [analysis, features] = await Promise.allSettled([
            getAudioAnalysis(trackId),
            getAudioFeatures(trackId),
        ]);

        if (analysis.status === 'rejected') {
            console.warn('[Pipeline] Spotify audio-analysis failed:', analysis.reason);
        }
        if (features.status === 'rejected') {
            console.warn('[Pipeline] Spotify audio-features failed:', features.reason);
        }

        let summary: Record<string, unknown> = {
            instructions: "Spotify audio analysis was unavailable. Please provide the exact layout of this song."
        };

        let localAnalysis: AudioAnalysisResult | null = null;

        if (analysis.status === 'fulfilled' && analysis.value.segments.length > 0) {
            const data = analysis.value;
            const featuresData = features.status === 'fulfilled' ? features.value : undefined;

            // 2. Run local harmonic analysis engine
            console.info(`[Pipeline] Step 2: Running local analysis (${data.segments.length} segments)...`);
            localAnalysis = analyzeAudio(data, featuresData);

            bpm = localAnalysis.tempo;
            timeSignature = localAnalysis.timeSignature;
            confidence = localAnalysis.key.confidence;

            // Build Spotify summary for DeepSeek (reduced payload — key data only)
            summary = {
                totalSegments: data.segments.length,
                bpm,
                timeSignature,
                key: localAnalysis.key.note,
                quality: localAnalysis.key.quality,
                scale: localAnalysis.key.scale,
                detectedChords: localAnalysis.allChordsUsed,
                sections: data.sections.map((s, i) => ({
                    name: localAnalysis!.chordProgressions[i]?.sectionName || `Section ${i + 1}`,
                    start_ms: Math.round(s.start * 1000),
                    duration_ms: Math.round(s.duration * 1000),
                    chords: localAnalysis!.chordProgressions[i]?.chords.map(c => c.name) || [],
                })),
            };
        }

        // 3. Generate via AI (with local analysis context)
        const { aiProvider } = useSettingsStore.getState();
        console.info(`[Pipeline] Step 3: Calling ${aiProvider} API...`, {
            hasLocalAnalysis: !!localAnalysis,
            mode,
            level,
        });
        const dsResult = await generateGuitarInstructions({
            trackName,
            artist: artistName,
            audioAnalysisSummary: summary,
            localAnalysis,
            type: mode,
            simplify: level === 'Beginner'
        }) as unknown as DeepSeekSheetResult;

        console.info(`[Pipeline] Step 3 complete. ${aiProvider} returned:`, {
            sections: dsResult.sections?.length ?? 0,
            chordsUsed: dsResult.chordsUsed?.length ?? 0,
            hasVoicings: !!dsResult.voicings,
            originalKey: dsResult.originalKey,
        });

        // 4. Merge chord lists (union of local + AI detected)
        const allChords = mergeChordLists(
            localAnalysis?.allChordsUsed || [],
            dsResult.chordsUsed || [],
        );

        // 5. Build guitar voicings for all detected chords
        //    AI voicings override defaults (more song-specific positions)
        const voicings = buildVoicingMap(allChords);
        if (dsResult.voicings) {
            for (const [chord, shape] of Object.entries(dsResult.voicings)) {
                voicings[chord] = shape;
            }
        }

        // 6. Merge uncertainties from local analysis + DeepSeek
        const uncertainties = mergeUncertainties(
            localAnalysis?.uncertainties || [],
            dsResult.uncertainties || [],
        );

        // 7. Determine final key/scale
        const finalKey = dsResult.originalKey || localAnalysis?.key.note || 'C';
        const finalScale = localAnalysis?.key.scale || [];

        // Parse AI time signature (e.g. "4/4") if available
        if (dsResult.timeSignature) {
            const parts = dsResult.timeSignature.split('/').map(Number);
            if (parts.length === 2 && parts[0] > 0 && parts[1] > 0) {
                timeSignature = [parts[0], parts[1]];
            }
        }

        // 8. Map to Song model
        const finalSong: Song = {
            id: trackId,
            bpm: dsResult.bpm || bpm,
            timeSignature,
            type: dsResult.type || mode,
            chordsUsed: allChords,
            voicings,
            sections: dsResult.sections || [],
            audioSrc: trackUri,
            tuning: ['Standard E'],
            capo: 0,
            metadata: {
                name: trackName,
                artist: artistName,
                originalKey: finalKey,
                scale: finalScale,
                transcribedAt: new Date().toISOString(),
                transcriptionEngine: 'audio-analysis-engine+deepseek',
                confidence
            },
            uncertainties,
        };

        // Cache the successful generation
        try {
            localStorage.setItem(cacheKey, JSON.stringify(finalSong));
        } catch {
            // ignore storage full errors
        }

        return finalSong;

    } catch (err) {
        console.error('Transcription error:', err);
        throw err;
    }
}

/** Merge two chord lists, preserving order (local first, then AI additions) */
function mergeChordLists(local: string[], ai: string[]): string[] {
    const seen = new Set(local);
    const merged = [...local];
    for (const chord of ai) {
        if (!seen.has(chord)) {
            seen.add(chord);
            merged.push(chord);
        }
    }
    return merged;
}

/** Merge uncertainty lists, deduplicating by location */
function mergeUncertainties(
    local: { location: string; message: string; candidates: string[]; confidences: number[] }[],
    ai: { location: string; message: string; candidates: string[]; confidences: number[] }[],
): TranscriptionUncertainty[] {
    const seen = new Set<string>();
    const merged: TranscriptionUncertainty[] = [];

    for (const u of [...local, ...ai]) {
        const key = `${u.location}:${u.message}`;
        if (!seen.has(key)) {
            seen.add(key);
            merged.push(u);
        }
    }

    return merged;
}
