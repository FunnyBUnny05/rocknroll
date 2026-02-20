/**
 * Guitar Chord Voicing Database
 *
 * Maps chord names to standard guitar voicings (6-string fret positions).
 * Format: "x-3-2-0-1-0" where x = muted, 0 = open, numbers = fret.
 * Strings are ordered low E to high E (6th to 1st).
 *
 * Multiple voicings are provided, ordered by playability
 * (most common/easiest first).
 */

export interface ChordVoicing {
  /** Fret position string, e.g. "x-3-2-0-1-0" */
  frets: string;
  /** Position on neck (0 = open/nut position) */
  position: number;
  /** Whether this is a barre chord */
  barre: boolean;
}

/** Full voicing database keyed by chord name */
const VOICING_DB: Record<string, ChordVoicing[]> = {
  // ── Major chords ─────────────────────────────
  'C':     [{ frets: 'x-3-2-0-1-0', position: 0, barre: false },
            { frets: '8-10-10-9-8-8', position: 8, barre: true }],
  'D':     [{ frets: 'x-x-0-2-3-2', position: 0, barre: false },
            { frets: 'x-5-7-7-7-5', position: 5, barre: true }],
  'E':     [{ frets: '0-2-2-1-0-0', position: 0, barre: false }],
  'F':     [{ frets: '1-3-3-2-1-1', position: 1, barre: true },
            { frets: 'x-x-3-2-1-1', position: 1, barre: false }],
  'G':     [{ frets: '3-2-0-0-0-3', position: 0, barre: false },
            { frets: '3-5-5-4-3-3', position: 3, barre: true }],
  'A':     [{ frets: 'x-0-2-2-2-0', position: 0, barre: false },
            { frets: '5-7-7-6-5-5', position: 5, barre: true }],
  'B':     [{ frets: 'x-2-4-4-4-2', position: 2, barre: true },
            { frets: '7-9-9-8-7-7', position: 7, barre: true }],
  'Db':    [{ frets: 'x-4-6-6-6-4', position: 4, barre: true }],
  'Eb':    [{ frets: 'x-6-8-8-8-6', position: 6, barre: true },
            { frets: 'x-x-1-3-4-3', position: 1, barre: false }],
  'Gb':    [{ frets: '2-4-4-3-2-2', position: 2, barre: true }],
  'Ab':    [{ frets: '4-6-6-5-4-4', position: 4, barre: true }],
  'Bb':    [{ frets: 'x-1-3-3-3-1', position: 1, barre: true },
            { frets: '6-8-8-7-6-6', position: 6, barre: true }],

  // ── Minor chords ─────────────────────────────
  'Cm':    [{ frets: 'x-3-5-5-4-3', position: 3, barre: true },
            { frets: '8-10-10-8-8-8', position: 8, barre: true }],
  'Dm':    [{ frets: 'x-x-0-2-3-1', position: 0, barre: false },
            { frets: 'x-5-7-7-6-5', position: 5, barre: true }],
  'Em':    [{ frets: '0-2-2-0-0-0', position: 0, barre: false }],
  'Fm':    [{ frets: '1-3-3-1-1-1', position: 1, barre: true }],
  'Gm':    [{ frets: '3-5-5-3-3-3', position: 3, barre: true }],
  'Am':    [{ frets: 'x-0-2-2-1-0', position: 0, barre: false },
            { frets: '5-7-7-5-5-5', position: 5, barre: true }],
  'Bm':    [{ frets: 'x-2-4-4-3-2', position: 2, barre: true },
            { frets: '7-9-9-7-7-7', position: 7, barre: true }],
  'Dbm':   [{ frets: 'x-4-6-6-5-4', position: 4, barre: true }],
  'Ebm':   [{ frets: 'x-6-8-8-7-6', position: 6, barre: true }],
  'Gbm':   [{ frets: '2-4-4-2-2-2', position: 2, barre: true }],
  'Abm':   [{ frets: '4-6-6-4-4-4', position: 4, barre: true }],
  'Bbm':   [{ frets: 'x-1-3-3-2-1', position: 1, barre: true }],

  // ── Dominant 7th ─────────────────────────────
  'C7':    [{ frets: 'x-3-2-3-1-0', position: 0, barre: false }],
  'D7':    [{ frets: 'x-x-0-2-1-2', position: 0, barre: false }],
  'E7':    [{ frets: '0-2-0-1-0-0', position: 0, barre: false }],
  'F7':    [{ frets: '1-3-1-2-1-1', position: 1, barre: true }],
  'G7':    [{ frets: '3-2-0-0-0-1', position: 0, barre: false }],
  'A7':    [{ frets: 'x-0-2-0-2-0', position: 0, barre: false }],
  'B7':    [{ frets: 'x-2-1-2-0-2', position: 0, barre: false }],
  'Bb7':   [{ frets: 'x-1-3-1-3-1', position: 1, barre: true }],
  'Eb7':   [{ frets: 'x-6-8-6-8-6', position: 6, barre: true }],
  'Ab7':   [{ frets: '4-6-4-5-4-4', position: 4, barre: true }],
  'Db7':   [{ frets: 'x-4-6-4-6-4', position: 4, barre: true }],
  'Gb7':   [{ frets: '2-4-2-3-2-2', position: 2, barre: true }],

  // ── Major 7th ────────────────────────────────
  'Cmaj7': [{ frets: 'x-3-2-0-0-0', position: 0, barre: false }],
  'Dmaj7': [{ frets: 'x-x-0-2-2-2', position: 0, barre: false }],
  'Emaj7': [{ frets: '0-2-1-1-0-0', position: 0, barre: false }],
  'Fmaj7': [{ frets: 'x-x-3-2-1-0', position: 0, barre: false }],
  'Gmaj7': [{ frets: '3-2-0-0-0-2', position: 0, barre: false }],
  'Amaj7': [{ frets: 'x-0-2-1-2-0', position: 0, barre: false }],
  'Bmaj7': [{ frets: 'x-2-4-3-4-2', position: 2, barre: true }],
  'Bbmaj7':[{ frets: 'x-1-3-2-3-1', position: 1, barre: true }],
  'Ebmaj7':[{ frets: 'x-6-8-7-8-6', position: 6, barre: true }],
  'Abmaj7':[{ frets: '4-6-5-5-4-4', position: 4, barre: true }],

  // ── Minor 7th ────────────────────────────────
  'Cm7':   [{ frets: 'x-3-5-3-4-3', position: 3, barre: true }],
  'Dm7':   [{ frets: 'x-x-0-2-1-1', position: 0, barre: false }],
  'Em7':   [{ frets: '0-2-0-0-0-0', position: 0, barre: false }],
  'Fm7':   [{ frets: '1-3-1-1-1-1', position: 1, barre: true }],
  'Gm7':   [{ frets: '3-5-3-3-3-3', position: 3, barre: true }],
  'Am7':   [{ frets: 'x-0-2-0-1-0', position: 0, barre: false }],
  'Bm7':   [{ frets: 'x-2-4-2-3-2', position: 2, barre: true }],
  'Bbm7':  [{ frets: 'x-1-3-1-2-1', position: 1, barre: true }],
  'Ebm7':  [{ frets: 'x-6-8-6-7-6', position: 6, barre: true }],
  'Abm7':  [{ frets: '4-6-4-4-4-4', position: 4, barre: true }],

  // ── Diminished ───────────────────────────────
  'Cdim':  [{ frets: 'x-3-4-2-4-2', position: 2, barre: false }],
  'Ddim':  [{ frets: 'x-x-0-1-3-1', position: 0, barre: false }],
  'Edim':  [{ frets: '0-1-2-0-x-x', position: 0, barre: false }],
  'Fdim':  [{ frets: 'x-x-3-4-3-4', position: 3, barre: false }],
  'Gdim':  [{ frets: 'x-x-5-6-5-6', position: 5, barre: false }],
  'Adim':  [{ frets: 'x-0-1-2-1-x', position: 0, barre: false }],
  'Bdim':  [{ frets: 'x-2-3-4-3-x', position: 2, barre: false }],

  // ── Augmented ────────────────────────────────
  'Caug':  [{ frets: 'x-3-2-1-1-0', position: 0, barre: false }],
  'Daug':  [{ frets: 'x-x-0-3-3-2', position: 0, barre: false }],
  'Eaug':  [{ frets: '0-3-2-1-1-0', position: 0, barre: false }],
  'Faug':  [{ frets: 'x-x-3-2-2-1', position: 1, barre: false }],
  'Gaug':  [{ frets: '3-2-1-0-0-3', position: 0, barre: false }],
  'Aaug':  [{ frets: 'x-0-3-2-2-1', position: 0, barre: false }],
  'Baug':  [{ frets: 'x-2-1-0-0-3', position: 0, barre: false }],

  // ── Sus2 ─────────────────────────────────────
  'Csus2': [{ frets: 'x-3-0-0-1-3', position: 0, barre: false }],
  'Dsus2': [{ frets: 'x-x-0-2-3-0', position: 0, barre: false }],
  'Esus2': [{ frets: '0-2-4-4-0-0', position: 0, barre: false }],
  'Gsus2': [{ frets: '3-0-0-0-3-3', position: 0, barre: false }],
  'Asus2': [{ frets: 'x-0-2-2-0-0', position: 0, barre: false }],

  // ── Sus4 ─────────────────────────────────────
  'Csus4': [{ frets: 'x-3-3-0-1-1', position: 0, barre: false }],
  'Dsus4': [{ frets: 'x-x-0-2-3-3', position: 0, barre: false }],
  'Esus4': [{ frets: '0-2-2-2-0-0', position: 0, barre: false }],
  'Gsus4': [{ frets: '3-5-5-5-3-3', position: 3, barre: true }],
  'Asus4': [{ frets: 'x-0-2-2-3-0', position: 0, barre: false }],

  // ── add9 ─────────────────────────────────────
  'Cadd9': [{ frets: 'x-3-2-0-3-0', position: 0, barre: false }],
  'Dadd9': [{ frets: 'x-x-0-2-3-0', position: 0, barre: false }],
  'Eadd9': [{ frets: '0-2-2-1-0-2', position: 0, barre: false }],
  'Gadd9': [{ frets: '3-2-0-2-0-3', position: 0, barre: false }],
  'Aadd9': [{ frets: 'x-0-2-4-2-0', position: 0, barre: false }],

  // ── 9th ──────────────────────────────────────
  'C9':    [{ frets: 'x-3-2-3-3-0', position: 0, barre: false }],
  'D9':    [{ frets: 'x-5-4-5-5-0', position: 4, barre: false }],
  'E9':    [{ frets: '0-2-0-1-0-2', position: 0, barre: false }],
  'G9':    [{ frets: '3-2-0-2-0-1', position: 0, barre: false }],
  'A9':    [{ frets: 'x-0-2-4-2-3', position: 0, barre: false }],

  // ── Minor 9th ────────────────────────────────
  'Am9':   [{ frets: 'x-0-2-4-1-0', position: 0, barre: false }],
  'Dm9':   [{ frets: 'x-5-3-5-5-0', position: 3, barre: false }],
  'Em9':   [{ frets: '0-2-0-0-0-2', position: 0, barre: false }],

  // ── Dim7 ─────────────────────────────────────
  'Cdim7': [{ frets: 'x-3-4-2-4-2', position: 2, barre: false }],
  'Ddim7': [{ frets: 'x-x-0-1-0-1', position: 0, barre: false }],
  'Edim7': [{ frets: '0-1-2-0-2-0', position: 0, barre: false }],

  // ── 6th chords ───────────────────────────────
  'C6':    [{ frets: 'x-3-2-2-1-0', position: 0, barre: false }],
  'D6':    [{ frets: 'x-x-0-2-0-2', position: 0, barre: false }],
  'E6':    [{ frets: '0-2-2-1-2-0', position: 0, barre: false }],
  'G6':    [{ frets: '3-2-0-0-0-0', position: 0, barre: false }],
  'A6':    [{ frets: 'x-0-2-2-2-2', position: 0, barre: false }],

  // ── Minor 6th ────────────────────────────────
  'Am6':   [{ frets: 'x-0-2-2-1-2', position: 0, barre: false }],
  'Dm6':   [{ frets: 'x-x-0-2-0-1', position: 0, barre: false }],
  'Em6':   [{ frets: '0-2-2-0-2-0', position: 0, barre: false }],
};

// ── Sharp-name aliases (map C# -> Db, etc.) ────────────────────────────

const SHARP_TO_FLAT: Record<string, string> = {
  'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb',
};

function normalizeChordName(name: string): string {
  // Extract root (1-2 chars) and suffix
  let root: string;
  let suffix: string;

  if (name.length >= 2 && (name[1] === '#' || name[1] === 'b')) {
    root = name.substring(0, 2);
    suffix = name.substring(2);
  } else {
    root = name[0];
    suffix = name.substring(1);
  }

  // Convert sharp roots to flat equivalents
  if (root.includes('#') && SHARP_TO_FLAT[root]) {
    root = SHARP_TO_FLAT[root];
  }

  return root + suffix;
}

// ── Public API ──────────────────────────────────────────────────────────

/**
 * Look up guitar voicings for a chord name.
 * Returns the most playable voicing first.
 * Returns null if no voicing is found.
 */
export function getVoicings(chordName: string): ChordVoicing[] | null {
  const normalized = normalizeChordName(chordName);

  // Direct lookup
  if (VOICING_DB[normalized]) {
    return VOICING_DB[normalized];
  }

  // Try without suffix remapping (e.g. "Cmaj" -> "C")
  if (normalized.endsWith('maj') && !normalized.includes('maj7')) {
    const base = normalized.replace(/maj$/, '');
    if (VOICING_DB[base]) return VOICING_DB[base];
  }

  return null;
}

/**
 * Build a voicing map for a list of chord names.
 * Returns a record of chord name -> fret string (most playable voicing).
 */
export function buildVoicingMap(chordNames: string[]): Record<string, string> {
  const map: Record<string, string> = {};

  for (const name of chordNames) {
    const voicings = getVoicings(name);
    if (voicings && voicings.length > 0) {
      map[name] = voicings[0].frets;
    }
  }

  return map;
}

/**
 * Build a detailed voicing map including all alternative voicings.
 */
export function buildDetailedVoicingMap(
  chordNames: string[],
): Record<string, ChordVoicing[]> {
  const map: Record<string, ChordVoicing[]> = {};

  for (const name of chordNames) {
    const voicings = getVoicings(name);
    if (voicings) {
      map[name] = voicings;
    }
  }

  return map;
}
