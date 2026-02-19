/**
 * Chord Progression Generation (Fallback)
 *
 * Built-in chord progression database for common songs.
 * Used when Spotify Audio Analysis API is unavailable.
 */

import type { SongEvent, ChordShape, FingerPlacement } from '../types/song';

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
        name: 'C Major', symbol: 'C',
        placements: [
            { string: 2, fret: 1, finger: 1 },
            { string: 4, fret: 2, finger: 2 },
            { string: 5, fret: 3, finger: 3 },
        ],
        mutedStrings: [6],
    },
    Am: {
        name: 'A Minor', symbol: 'Am',
        placements: [
            { string: 2, fret: 1, finger: 1 },
            { string: 3, fret: 2, finger: 2 },
            { string: 4, fret: 2, finger: 3 },
        ],
        mutedStrings: [6],
    },
    G: {
        name: 'G Major', symbol: 'G',
        placements: [
            { string: 5, fret: 2, finger: 1 },
            { string: 6, fret: 3, finger: 2 },
            { string: 1, fret: 3, finger: 3 },
        ],
        mutedStrings: [],
    },
    D: {
        name: 'D Major', symbol: 'D',
        placements: [
            { string: 3, fret: 2, finger: 1 },
            { string: 1, fret: 2, finger: 2 },
            { string: 2, fret: 3, finger: 3 },
        ],
        mutedStrings: [5, 6],
    },
    Dm: {
        name: 'D Minor', symbol: 'Dm',
        placements: [
            { string: 1, fret: 1, finger: 1 },
            { string: 3, fret: 2, finger: 2 },
            { string: 2, fret: 3, finger: 3 },
        ],
        mutedStrings: [5, 6],
    },
    E: {
        name: 'E Major', symbol: 'E',
        placements: [
            { string: 3, fret: 1, finger: 1 },
            { string: 4, fret: 2, finger: 2 },
            { string: 5, fret: 2, finger: 3 },
        ],
        mutedStrings: [],
    },
    Em: {
        name: 'E Minor', symbol: 'Em',
        placements: [
            { string: 4, fret: 2, finger: 1 },
            { string: 5, fret: 2, finger: 2 },
        ],
        mutedStrings: [],
    },
    F: {
        name: 'F Major', symbol: 'F',
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
        name: 'A Major', symbol: 'A',
        placements: [
            { string: 4, fret: 2, finger: 1 },
            { string: 3, fret: 2, finger: 2 },
            { string: 2, fret: 2, finger: 3 },
        ],
        mutedStrings: [6],
    },
    B7: {
        name: 'B7', symbol: 'B7',
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

const COMMON_PROGRESSIONS: Record<string, string[]> = {
    pop: ['C', 'G', 'Am', 'F'],
    rock: ['E', 'A', 'D', 'A'],
    blues: ['E', 'E', 'A', 'E', 'B7', 'A', 'E', 'B7'],
    folk: ['G', 'Em', 'C', 'D'],
    minor: ['Am', 'Dm', 'G', 'C'],
    latin: ['Am', 'E', 'Am', 'Dm'],
};

function chordToShape(template: ChordTemplate): ChordShape {
    return {
        name: template.name,
        symbol: template.symbol,
        placements: template.placements,
        mutedStrings: template.mutedStrings,
        barreFret: template.barreFret,
    };
}

/**
 * Generate chord events for a track duration using a progression pattern.
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
            });
        }

        currentTime += chordDuration;
        chordIndex++;
    }

    return events;
}

/**
 * Select the best progression for a track based on its name/artist.
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

    return 'pop';
}
