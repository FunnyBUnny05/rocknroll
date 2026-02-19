/**
 * Spotify Audio Analysis → Guitar Tabs/Chords
 *
 * Maps Spotify's 'pitches' (12-element chroma vectors) and 'segments'
 * directly to guitar fretboard coordinates using standard E-A-D-G-B-E tuning.
 *
 * Two-pass approach:
 *   1. Try Spotify Audio Analysis API for segment-level pitch data
 *   2. Fall back to chord progression generation if API unavailable
 */

import type { Song, SongEvent, FingerPlacement, TabNote } from '../types/song';
import type { SpotifyAudioAnalysis, SpotifySegment, SpotifySection } from './SpotifyService';
import { getAudioAnalysis, getAudioFeatures } from './SpotifyService';
import { generateChordProgression, guessProgression } from './chordDetection';
import { generateGuitarInstructions } from './deepseekService';
import { useSettingsStore } from '../store/useSettingsStore';

// --- Pitch class names (chroma index → note name) ---
const PITCH_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Standard tuning open string MIDI notes: E2=40, A2=45, D3=50, G3=55, B3=59, E4=64
const STANDARD_TUNING_MIDI = [40, 45, 50, 55, 59, 64];
// [4, 9, 2, 7, 11, 4] → E, A, D, G, B, E

// --- Chord Templates (chroma vectors) ---
// Each is a 12-element binary array representing which pitch classes are in the chord

interface ChordTemplate {
    name: string;
    symbol: string;
    chroma: number[];
    placements: FingerPlacement[];
    mutedStrings: number[];
    barreFret?: number;
}

const CHORD_TEMPLATES: ChordTemplate[] = [
    {
        name: 'C Major', symbol: 'C', chroma: [1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0],
        placements: [{ string: 2, fret: 1, finger: 1 }, { string: 4, fret: 2, finger: 2 }, { string: 5, fret: 3, finger: 3 }], mutedStrings: [6]
    },
    {
        name: 'C# Major', symbol: 'C#', chroma: [0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0],
        placements: [{ string: 1, fret: 1, finger: 1 }, { string: 2, fret: 1, finger: 1 }, { string: 3, fret: 1, finger: 1 }, { string: 4, fret: 3, finger: 2 }, { string: 5, fret: 4, finger: 3 }, { string: 6, fret: 4, finger: 4 }], mutedStrings: [], barreFret: 1
    },
    {
        name: 'D Major', symbol: 'D', chroma: [0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0],
        placements: [{ string: 3, fret: 2, finger: 1 }, { string: 1, fret: 2, finger: 2 }, { string: 2, fret: 3, finger: 3 }], mutedStrings: [5, 6]
    },
    {
        name: 'D Minor', symbol: 'Dm', chroma: [0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0],
        placements: [{ string: 1, fret: 1, finger: 1 }, { string: 3, fret: 2, finger: 2 }, { string: 2, fret: 3, finger: 3 }], mutedStrings: [5, 6]
    },
    {
        name: 'E Major', symbol: 'E', chroma: [0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1],
        placements: [{ string: 3, fret: 1, finger: 1 }, { string: 4, fret: 2, finger: 2 }, { string: 5, fret: 2, finger: 3 }], mutedStrings: []
    },
    {
        name: 'E Minor', symbol: 'Em', chroma: [0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1],
        placements: [{ string: 4, fret: 2, finger: 1 }, { string: 5, fret: 2, finger: 2 }], mutedStrings: []
    },
    {
        name: 'F Major', symbol: 'F', chroma: [1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0],
        placements: [{ string: 1, fret: 1, finger: 1 }, { string: 2, fret: 1, finger: 1 }, { string: 3, fret: 2, finger: 2 }, { string: 4, fret: 3, finger: 3 }, { string: 5, fret: 3, finger: 4 }], mutedStrings: [6], barreFret: 1
    },
    {
        name: 'G Major', symbol: 'G', chroma: [0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1],
        placements: [{ string: 5, fret: 2, finger: 1 }, { string: 6, fret: 3, finger: 2 }, { string: 1, fret: 3, finger: 3 }], mutedStrings: []
    },
    {
        name: 'A Major', symbol: 'A', chroma: [0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0],
        placements: [{ string: 4, fret: 2, finger: 1 }, { string: 3, fret: 2, finger: 2 }, { string: 2, fret: 2, finger: 3 }], mutedStrings: [6]
    },
    {
        name: 'A Minor', symbol: 'Am', chroma: [1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0],
        placements: [{ string: 2, fret: 1, finger: 1 }, { string: 3, fret: 2, finger: 2 }, { string: 4, fret: 2, finger: 3 }], mutedStrings: [6]
    },
    {
        name: 'B Major', symbol: 'B', chroma: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1],
        placements: [{ string: 1, fret: 2, finger: 1 }, { string: 2, fret: 2, finger: 1 }, { string: 3, fret: 2, finger: 1 }, { string: 4, fret: 4, finger: 2 }, { string: 5, fret: 4, finger: 3 }, { string: 6, fret: 4, finger: 4 }], mutedStrings: [], barreFret: 2
    },
    {
        name: 'B7', symbol: 'B7', chroma: [0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 1],
        placements: [{ string: 4, fret: 1, finger: 1 }, { string: 1, fret: 2, finger: 2 }, { string: 3, fret: 2, finger: 3 }, { string: 5, fret: 2, finger: 4 }], mutedStrings: [6]
    },
    {
        name: 'F# Minor', symbol: 'F#m', chroma: [0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0],
        placements: [{ string: 1, fret: 2, finger: 1 }, { string: 2, fret: 2, finger: 1 }, { string: 3, fret: 2, finger: 1 }, { string: 4, fret: 4, finger: 3 }, { string: 5, fret: 4, finger: 4 }], mutedStrings: [6], barreFret: 2
    },
    {
        name: 'B Minor', symbol: 'Bm', chroma: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1],
        placements: [{ string: 1, fret: 2, finger: 1 }, { string: 2, fret: 2, finger: 1 }, { string: 3, fret: 4, finger: 3 }, { string: 4, fret: 4, finger: 4 }, { string: 5, fret: 2, finger: 1 }], mutedStrings: [6], barreFret: 2
    },
    {
        name: 'G Minor', symbol: 'Gm', chroma: [0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0],
        placements: [{ string: 1, fret: 3, finger: 1 }, { string: 2, fret: 3, finger: 1 }, { string: 3, fret: 3, finger: 1 }, { string: 4, fret: 5, finger: 3 }, { string: 5, fret: 5, finger: 4 }, { string: 6, fret: 3, finger: 1 }], mutedStrings: [], barreFret: 3
    },
];

// --- Chroma matching ---

/** Cosine similarity between two vectors */
function cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < 12; i++) {
        dot += a[i] * b[i];
        magA += a[i] * a[i];
        magB += b[i] * b[i];
    }
    const mag = Math.sqrt(magA) * Math.sqrt(magB);
    return mag === 0 ? 0 : dot / mag;
}

/** Match a chroma vector to the best chord template */
function matchChord(pitches: number[]): ChordTemplate {
    let bestMatch = CHORD_TEMPLATES[0];
    let bestScore = -1;

    for (const template of CHORD_TEMPLATES) {
        const score = cosineSimilarity(pitches, template.chroma);
        if (score > bestScore) {
            bestScore = score;
            bestMatch = template;
        }
    }

    return bestMatch;
}

// --- MIDI / Guitar Mapping ---

/** Map a pitch class (0-11) to the best guitar position in a given octave range */
function pitchClassToGuitarNotes(pitchClass: number, count: number): TabNote[] {
    const notes: TabNote[] = [];
    // Try octaves 2-4 (guitar range)
    for (let octave = 2; octave <= 4 && notes.length < count; octave++) {
        const midi = pitchClass + octave * 12;
        for (let s = 0; s < 6; s++) {
            const fret = midi - STANDARD_TUNING_MIDI[s];
            if (fret >= 0 && fret <= 15) {
                notes.push({
                    string: (s + 1) as TabNote['string'],
                    fret,
                    duration: 1,
                });
                break;
            }
        }
    }
    return notes;
}

// --- Segment Aggregation ---

/** Average chroma vectors over a time window, weighted by segment duration */
function averageChroma(segments: SpotifySegment[], start: number, end: number): number[] {
    const avg = new Array(12).fill(0);
    let totalDuration = 0;

    for (const seg of segments) {
        const segEnd = seg.start + seg.duration;
        if (seg.start >= end || segEnd <= start) continue;
        // Overlap
        const overlapStart = Math.max(seg.start, start);
        const overlapEnd = Math.min(segEnd, end);
        const weight = overlapEnd - overlapStart;
        for (let i = 0; i < 12; i++) {
            avg[i] += seg.pitches[i] * weight;
        }
        totalDuration += weight;
    }

    if (totalDuration > 0) {
        for (let i = 0; i < 12; i++) avg[i] /= totalDuration;
    }
    return avg;
}

/** Extract dominant pitch classes from a chroma vector */
function dominantPitches(chroma: number[], threshold = 0.6): number[] {
    const pitches: number[] = [];
    for (let i = 0; i < 12; i++) {
        if (chroma[i] >= threshold) pitches.push(i);
    }
    // If nothing above threshold, take top 3
    if (pitches.length === 0) {
        const indexed = chroma.map((v, i) => ({ v, i })).sort((a, b) => b.v - a.v);
        for (let j = 0; j < Math.min(3, indexed.length); j++) {
            if (indexed[j].v > 0.1) pitches.push(indexed[j].i);
        }
    }
    return pitches;
}

// --- Main Transcription ---

/** Build chord events from audio analysis beat-aligned data */
function analysisToChordEvents(analysis: SpotifyAudioAnalysis): SongEvent[] {
    const events: SongEvent[] = [];
    const { segments, beats, bars } = analysis;

    if (segments.length === 0) return events;

    // Use bars for chord-level granularity (1 chord per bar)
    const boundaries = bars.length > 0 ? bars : beats;

    for (const bar of boundaries) {
        const chroma = averageChroma(segments, bar.start, bar.start + bar.duration);
        const chord = matchChord(chroma);

        events.push({
            time: bar.start,
            duration: bar.duration,
            type: 'chord',
            chord: {
                name: chord.name,
                symbol: chord.symbol,
                placements: chord.placements,
                mutedStrings: chord.mutedStrings,
                barreFret: chord.barreFret,
            },
        });
    }

    return events;
}

/** Build tab events from audio analysis segment-level data */
function analysisToTabEvents(analysis: SpotifyAudioAnalysis): SongEvent[] {
    const events: SongEvent[] = [];
    const { segments, beats } = analysis;

    if (segments.length === 0) return events;

    // Use beats for note-level granularity
    const boundaries = beats.length > 0 ? beats : segments;

    for (const beat of boundaries) {
        const chroma = averageChroma(segments, beat.start, beat.start + beat.duration);
        const pitches = dominantPitches(chroma);

        const notes: TabNote[] = [];
        for (const pc of pitches) {
            const mapped = pitchClassToGuitarNotes(pc, 1);
            for (const n of mapped) {
                notes.push({ ...n, duration: beat.duration });
            }
        }

        if (notes.length > 0) {
            events.push({
                time: beat.start,
                duration: beat.duration,
                type: 'tab',
                notes,
            });
        }
    }

    return events;
}

/** Extract tempo from audio analysis sections */
function extractTempo(analysis: SpotifyAudioAnalysis): number {
    if (analysis.sections.length === 0) return 120;
    // Use the longest section's tempo
    let longest: SpotifySection = analysis.sections[0];
    for (const s of analysis.sections) {
        if (s.duration > longest.duration) longest = s;
    }
    return Math.round(longest.tempo) || 120;
}

/** Extract time signature from analysis */
function extractTimeSignature(analysis: SpotifyAudioAnalysis): [number, number] {
    if (analysis.sections.length === 0) return [4, 4];
    const sig = analysis.sections[0].time_signature;
    return [sig || 4, 4];
}

/**
 * Transcribe a Spotify track into a Song with tabs and chords.
 * Tries Audio Analysis API first, falls back to chord progression generation.
 */
export async function transcribeSpotifyTrack(
    trackId: string,
    trackName: string,
    artistName: string,
    durationMs: number,
    trackUri: string,
): Promise<Song> {
    let chordEvents: SongEvent[] = [];
    let tabEvents: SongEvent[] = [];
    let bpm = 120;
    let timeSignature: [number, number] = [4, 4];
    let engine = 'chord-progression';
    let confidence = 0.5;
    let lyricsAligned: { time: number; text: string }[] | undefined = undefined;

    interface DeepSeekResult {
        tuning: string;
        events: SongEvent[];
        lyricsAligned?: { time: number; text: string }[];
    }

    try {
        const { deepseekApiKey, level } = useSettingsStore.getState();

        // Try Audio Analysis API
        const [analysis, features] = await Promise.allSettled([
            getAudioAnalysis(trackId),
            getAudioFeatures(trackId),
        ]);

        if (analysis.status === 'fulfilled' && analysis.value.segments.length > 0) {
            const data = analysis.value;
            // Get base data
            bpm = extractTempo(data);
            timeSignature = extractTimeSignature(data);

            if (features.status === 'fulfilled') {
                bpm = Math.round(features.value.tempo) || bpm;
            }

            if (deepseekApiKey) {
                // Use DeepSeek API
                engine = 'deepseek-' + level;
                confidence = 0.9;

                // create a summary of the analysis for DeepSeek
                const summary = {
                    totalSegments: data.segments.length,
                    duration: durationMs / 1000,
                    bpm,
                    timeSignature,
                    keyEstimates: data.sections.map(s => s.key).filter((v, i, a) => a.indexOf(v) === i)
                };

                const dsResult = await generateGuitarInstructions(trackName, artistName, summary) as unknown as DeepSeekResult;

                // The prompt uses generic 'events', so we map them to both for now or just the selected one
                const resultEvents: SongEvent[] = dsResult.events || [];
                lyricsAligned = dsResult.lyricsAligned;

                if (level === 'Beginner') {
                    chordEvents = resultEvents;
                    // Provide a simple tab fallback from chords
                    tabEvents = chordEvents.map(evt => ({
                        time: evt.time,
                        duration: evt.duration,
                        type: 'tab' as const,
                        notes: evt.chord?.placements?.map(p => ({
                            string: p.string as 1 | 2 | 3 | 4 | 5 | 6,
                            fret: p.fret,
                            duration: evt.duration,
                        })) ?? [],
                    }));
                } else {
                    tabEvents = resultEvents;
                    chordEvents = resultEvents.filter((e) => e.type === 'chord');
                    // Ensure all tab notes are mapped back into chord format if they exist
                }
            } else {
                // Legacy analysis logic
                chordEvents = analysisToChordEvents(data);
                tabEvents = analysisToTabEvents(data);
                engine = 'spotify-audio-analysis';
            }
        } else if (deepseekApiKey) {
            // Mock summary to trigger DeepSeek anyway if Spotify 403s
            // We tell DeepSeek specifically we want the intro/main riff detailed.
            const mockSummary = {
                instructions: "Spotify audio analysis was unavailable. Please provide the exact iconic main riff or solo for this song, broken down note-by-note into at least 16 separate tab events.",
                totalSegments: Math.floor(durationMs / 2000), // Guessing 1 segment per 2s
                duration: durationMs / 1000,
                bpm,
                timeSignature,
                keyEstimates: [0] // C Major default
            };

            const dsResult = await generateGuitarInstructions(trackName, artistName, mockSummary) as unknown as DeepSeekResult;

            const resultEvents: SongEvent[] = dsResult.events || [];
            lyricsAligned = dsResult.lyricsAligned;

            if (level === 'Beginner') {
                chordEvents = resultEvents;
                tabEvents = chordEvents.map(evt => ({
                    time: evt.time,
                    duration: evt.duration,
                    type: 'tab' as const,
                    notes: evt.chord?.placements?.map(p => ({
                        string: p.string as 1 | 2 | 3 | 4 | 5 | 6,
                        fret: p.fret,
                        duration: evt.duration,
                    })) ?? [],
                }));
            } else {
                tabEvents = resultEvents;
                chordEvents = resultEvents.filter((e) => e.type === 'chord');
            }
            engine = 'deepseek-' + level + '-fallback';
            confidence = 0.7;
        } else {
            throw new Error('Audio analysis unavailable and DeepSeek disabled');
        }
    } catch (err) {
        console.warn('Transcription error or fallback:', err);
        // Fallback: generate chord progression from heuristics
        const progression = guessProgression(trackName, artistName);
        chordEvents = generateChordProgression(durationMs, 4, bpm, progression);
        // Generate simple tab events from chord placements
        tabEvents = chordEvents.map(evt => ({
            time: evt.time,
            duration: evt.duration,
            type: 'tab' as const,
            notes: evt.chord?.placements.map(p => ({
                string: p.string,
                fret: p.fret,
                duration: evt.duration,
            })) ?? [],
        }));
    }

    return {
        id: `spotify- ${trackId}`,
        title: trackName,
        artist: artistName,
        duration: durationMs / 1000,
        bpm,
        timeSignature,
        audioSrc: trackUri,
        tuning: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'],
        capo: 0,
        tracks: {
            beginner: { events: chordEvents || [], tempoMultiplier: 0.75 },
            professional: { events: tabEvents || [], tempoMultiplier: 1.0 },
        },
        lyricsAligned,
        metadata: {
            confidence,
            transcriptionEngine: engine,
            transcribedAt: new Date().toISOString(),
        },
    };
}

/** Get a human-readable pitch name from chroma index */
export function pitchName(index: number): string {
    return PITCH_NAMES[index % 12];
}
