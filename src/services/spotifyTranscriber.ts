import { useSettingsStore } from '../store/useSettingsStore';
import type { Song, SheetSection } from '../types/song';
import { buildVoicingMap } from './chordVoicings';

interface MLBackendSheetResult {
    success: boolean;
    sheet: {
        title: string;
        artist: string;
        originalKey: string;
        bpm: number;
        type: 'chord' | 'tab';
        chordsUsed: string[];
        sections: SheetSection[];
    };
}

/**
 * Transcribe a Spotify track into a static printable Guitar Sheet.
 *
 * Pipeline:
 *  1. Send request to Python FAST Audio-to-Chords Pipeline
 *  2. Merge backend result into Song model
 *  3. Attach guitar voicings
 */
export async function transcribeSpotifyTrack(
    trackId: string,
    trackName: string,
    artistName: string,
    trackUri: string,
    mode: 'chord' | 'tab'
): Promise<Song> {

    try {
        const { level } = useSettingsStore.getState();

        const CACHE_VERSION = 'v-ml-sheet-1'; // Bump this when changing schema
        const cacheKey = `rocknroll-sheet-${CACHE_VERSION}-${trackId}-${mode}-${level}`;
        const cached = localStorage.getItem(cacheKey);

        if (cached) {
            try {
                return JSON.parse(cached);
            } catch {
                // Ignore invalid cache
            }
        }

        console.log(`Routing transcription request for ${trackName} to Python ML Backend...`)

        // Use FormData to match the Backend's expected format
        const formData = new FormData();
        formData.append("spotify_url", trackUri); // Or send preview_url if available

        const response = await fetch("http://localhost:8000/api/transcribe", {
            method: "POST",
            body: formData
        });

        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`ML Backend failed with status ${response.status}: ${errBody}`);
        }

        const result: MLBackendSheetResult = await response.json();

        if (!result.success || !result.sheet) {
            throw new Error("Backend did not return a valid sheet structure.");
        }

        const mlSheet = result.sheet;

        // Build voicings map
        const voicings = buildVoicingMap(mlSheet.chordsUsed || []);

        // Map to Song model
        const finalSong: Song = {
            id: trackId,
            bpm: mlSheet.bpm || 120,
            timeSignature: [4, 4], // Default, can be updated by backend later
            type: mode,
            chordsUsed: mlSheet.chordsUsed || [],
            voicings: voicings,
            sections: mlSheet.sections || [],
            audioSrc: trackUri,
            tuning: ['Standard E'],
            capo: 0,
            metadata: {
                name: trackName,
                artist: artistName,
                originalKey: mlSheet.originalKey || 'C',
                scale: [], // Placeholder
                transcribedAt: new Date().toISOString(),
                transcriptionEngine: 'heavy-ml-pipeline',
                confidence: 0.95
            },
            uncertainties: []
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
