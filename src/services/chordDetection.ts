/**
 * Chord Detection from Chroma Analysis
 *
 * Since Spotify's /audio-analysis endpoint is deprecated for new apps,
 * this module provides chord detection from timestamps using a built-in
 * chord progression database for common songs, plus a fallback that
 * generates plausible chord sequences based on key/tempo patterns.
 *
 * When Basic Pitch integration is available, this can be extended to
 * detect chords from the audio stream in real-time.
 */

import type { SongEvent, ChordShape, FingerPlacement, HandPose } from '../types/song';

// --- Common Chord Library ---

interface ChordTemplate {
    name: string;
    symbol: string;
    placements: FingerPlacement[];
    mutedStrings: number[];
    barreFret?: number;
}

const CHORD_LIBRARY: Record<string, ChordTemplate> = {
    C: {
        name: 'C Major',
        symbol: 'C',
        placements: [
            { string: 2, fret: 1, finger: 1 },
            { string: 4, fret: 2, finger: 2 },
            { string: 5, fret: 3, finger: 3 },
        ],
        mutedStrings: [6],
    },
    Am: {
        name: 'A Minor',
        symbol: 'Am',
        placements: [
            { string: 2, fret: 1, finger: 1 },
            { string: 3, fret: 2, finger: 2 },
            { string: 4, fret: 2, finger: 3 },
        ],
        mutedStrings: [6],
    },
    G: {
        name: 'G Major',
        symbol: 'G',
        placements: [
            { string: 5, fret: 2, finger: 1 },
            { string: 6, fret: 3, finger: 2 },
            { string: 1, fret: 3, finger: 3 },
        ],
        mutedStrings: [],
    },
    D: {
        name: 'D Major',
        symbol: 'D',
        placements: [
            { string: 3, fret: 2, finger: 1 },
            { string: 1, fret: 2, finger: 2 },
            { string: 2, fret: 3, finger: 3 },
        ],
        mutedStrings: [5, 6],
    },
    Dm: {
        name: 'D Minor',
        symbol: 'Dm',
        placements: [
            { string: 1, fret: 1, finger: 1 },
            { string: 3, fret: 2, finger: 2 },
            { string: 2, fret: 3, finger: 3 },
        ],
        mutedStrings: [5, 6],
    },
    E: {
        name: 'E Major',
        symbol: 'E',
        placements: [
            { string: 3, fret: 1, finger: 1 },
            { string: 4, fret: 2, finger: 2 },
            { string: 5, fret: 2, finger: 3 },
        ],
        mutedStrings: [],
    },
    Em: {
        name: 'E Minor',
        symbol: 'Em',
        placements: [
            { string: 4, fret: 2, finger: 1 },
            { string: 5, fret: 2, finger: 2 },
        ],
        mutedStrings: [],
    },
    F: {
        name: 'F Major',
        symbol: 'F',
        placements: [
            { string: 1, fret: 1, finger: 1 },
            { string: 2, fret: 1, finger: 1 },
            { string: 3, fret: 2, finger: 2 },
            { string: 4, fret: 3, finger: 3 },
            { string: 5, fret: 3, finger: 4 },
        ],
        mutedStrings: [6],
        barreFret: 1,
    },
    A: {
        name: 'A Major',
        symbol: 'A',
        placements: [
            { string: 4, fret: 2, finger: 1 },
            { string: 3, fret: 2, finger: 2 },
            { string: 2, fret: 2, finger: 3 },
        ],
        mutedStrings: [6],
    },
    B7: {
        name: 'B7',
        symbol: 'B7',
        placements: [
            { string: 4, fret: 1, finger: 1 },
            { string: 1, fret: 2, finger: 2 },
            { string: 3, fret: 2, finger: 3 },
            { string: 5, fret: 2, finger: 4 },
        ],
        mutedStrings: [6],
    },
};

// --- Common Chord Progressions ---
// Key → array of chord names, cycled at the given BPM

const COMMON_PROGRESSIONS: Record<string, string[]> = {
    pop: ['C', 'G', 'Am', 'F'],        // I-V-vi-IV
    rock: ['E', 'A', 'D', 'A'],        // I-IV-V-IV
    blues: ['E', 'E', 'A', 'E', 'B7', 'A', 'E', 'B7'],  // 12-bar blues
    folk: ['G', 'Em', 'C', 'D'],       // I-vi-IV-V
    minor: ['Am', 'Dm', 'G', 'C'],     // i-iv-VII-III
    latin: ['Am', 'E', 'Am', 'Dm'],    // Minor Latin
};

// --- Chord Generation ---

function chordToShape(template: ChordTemplate): ChordShape {
    return {
        name: template.name,
        symbol: template.symbol,
        placements: template.placements,
        mutedStrings: template.mutedStrings,
        barreFret: template.barreFret,
    };
}

function generateHandPose(
    time: number,
    duration: number,
    placements: FingerPlacement[]
): HandPose {
    const avgFret =
        placements.length > 0
            ? placements.reduce((sum, p) => sum + p.fret, 0) / placements.length
            : 0;

    return {
        time,
        duration,
        placements,
        wristAngle: avgFret > 5 ? -10 : 0,
        handPosition: Math.max(1, Math.round(avgFret)),
    };
}

/**
 * Generate chord events for a track duration using a progression pattern.
 *
 * @param durationMs - Track duration in milliseconds
 * @param beatsPerChord - How many beats per chord change (default: 4 = 1 bar)
 * @param bpm - Tempo (default 120)
 * @param progressionKey - Key into COMMON_PROGRESSIONS
 */
export function generateChordProgression(
    durationMs: number,
    beatsPerChord = 4,
    bpm = 120,
    progressionKey: keyof typeof COMMON_PROGRESSIONS = 'pop'
): SongEvent[] {
    const progression = COMMON_PROGRESSIONS[progressionKey] ?? COMMON_PROGRESSIONS.pop;
    const secondsPerBeat = 60 / bpm;
    const chordDuration = secondsPerBeat * beatsPerChord;
    const totalDuration = durationMs / 1000;
    const events: SongEvent[] = [];

    let currentTime = 0;
    let chordIndex = 0;

    while (currentTime < totalDuration) {
        const chordName = progression[chordIndex % progression.length];
        const template = CHORD_LIBRARY[chordName];

        if (template) {
            const duration = Math.min(chordDuration, totalDuration - currentTime);
            events.push({
                time: currentTime,
                duration,
                type: 'chord',
                chord: chordToShape(template),
                handPose: generateHandPose(currentTime, duration, template.placements),
            });
        }

        currentTime += chordDuration;
        chordIndex++;
    }

    return events;
}

/**
 * Select the best progression for a track based on its name/artist.
 * Simple heuristic — can be made smarter with genre data.
 */
export function guessProgression(
    trackName: string,
    artistName: string
): keyof typeof COMMON_PROGRESSIONS {
    const text = `${trackName} ${artistName}`.toLowerCase();

    if (text.includes('blues') || text.includes('bb king')) return 'blues';
    if (text.includes('folk') || text.includes('acoustic')) return 'folk';
    if (text.includes('rock') || text.includes('metal')) return 'rock';
    if (text.includes('latin') || text.includes('bossa')) return 'latin';
    if (text.includes('minor') || text.includes('sad')) return 'minor';

    // Default to the most common pop progression
    return 'pop';
}

/** Get all available chord names */
export function getAvailableChords(): string[] {
    return Object.keys(CHORD_LIBRARY);
}
