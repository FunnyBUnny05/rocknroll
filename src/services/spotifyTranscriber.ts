import { getAudioAnalysis, getAudioFeatures } from './SpotifyService';
import { generateGuitarInstructions } from './deepseekService';
import { useSettingsStore } from '../store/useSettingsStore';
import type { Song, SheetSection } from '../types/song';

interface DeepSeekSheetResult {
    title: string;
    artist: string;
    originalKey: string;
    bpm: number;
    type: 'chord' | 'tab';
    chordsUsed: string[];
    sections: SheetSection[];
}

/** Extract tempo from audio analysis sections */
function extractTempo(analysis: { sections?: { duration: number, tempo: number, time_signature?: number }[] }): number {
    if (!analysis || !analysis.sections || analysis.sections.length === 0) return 120;
    let longest = analysis.sections[0];
    for (const s of analysis.sections) {
        if (s.duration > longest.duration) longest = s;
    }
    return Math.round(longest.tempo) || 120;
}

/** Extract time signature from analysis */
function extractTimeSignature(analysis: { sections?: { duration: number, tempo: number, time_signature?: number }[] }): [number, number] {
    if (!analysis || !analysis.sections || analysis.sections.length === 0) return [4, 4];
    const sig = analysis.sections[0].time_signature;
    return [sig || 4, 4];
}

/**
 * Transcribe a Spotify track into a static printable Guitar Sheet.
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

        const CACHE_VERSION = 'v-sheet-1'; // Bump this when changing DeepSeek JSON schema
        const cacheKey = `rocknroll-sheet-${CACHE_VERSION}-${trackId}-${mode}-${level}`;
        const cached = localStorage.getItem(cacheKey);

        if (cached) {
            try {
                return JSON.parse(cached);
            } catch {
                // Ignore invalid cache
            }
        }

        // Try Audio Analysis API
        const [analysis, features] = await Promise.allSettled([
            getAudioAnalysis(trackId),
            getAudioFeatures(trackId),
        ]);

        let summary: Record<string, unknown> = {
            instructions: "Spotify audio analysis was unavailable. Please provide the exact layout of this song."
        };

        if (analysis.status === 'fulfilled' && analysis.value.segments.length > 0) {
            const data = analysis.value;
            // Get base data
            bpm = extractTempo(data);
            timeSignature = extractTimeSignature(data);

            if (features.status === 'fulfilled') {
                bpm = Math.round(features.value.tempo) || bpm;
            }

            // create a summary of the analysis for DeepSeek
            summary = {
                totalSegments: data.segments.length,
                bpm,
                timeSignature,
                key: data.sections[0]?.key || 0,
                mode: data.sections[0]?.mode || 1, // 1 = major, 0 = minor
                segments: data.segments.map((s: { start: number, duration: number, pitches: number[], timbre: number[] }) => ({
                    start_ms: Math.round(s.start * 1000),
                    end_ms: Math.round((s.start + s.duration) * 1000),
                    pitches: s.pitches.map((p: number) => Number(p.toFixed(3))),
                    timbre: s.timbre.map((t: number) => Number(t.toFixed(2)))
                }))
            };
            confidence = 0.9;
        }

        // 1. Generate via DeepSeek
        const dsResult = await generateGuitarInstructions({
            trackName,
            artist: artistName,
            audioAnalysisSummary: summary,
            type: mode,
            simplify: level === 'Beginner'
        }) as unknown as DeepSeekSheetResult;

        // 2. Map to Song model
        const finalSong: Song = {
            id: trackId,
            bpm: dsResult.bpm || bpm,
            type: dsResult.type || mode,
            chordsUsed: dsResult.chordsUsed || [],
            sections: dsResult.sections || [],
            audioSrc: trackUri,
            tuning: ['Standard E'],
            capo: 0,
            metadata: {
                name: trackName,
                artist: artistName,
                originalKey: dsResult.originalKey || 'C',
                transcribedAt: new Date().toISOString(),
                transcriptionEngine: 'deepseek-sheet-generator',
                confidence
            }
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
