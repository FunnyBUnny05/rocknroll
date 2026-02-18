/**
 * AI Transcription Pipeline
 *
 * Architecture for converting audio to synchronized chord/tab data.
 *
 * Recommended stack (in order of preference):
 *
 * 1. **Basic Pitch** (Spotify) - Best for monophonic pitch detection
 *    - Runs in-browser via ONNX Runtime Web
 *    - Converts audio -> MIDI with high accuracy for single guitar lines
 *    - MIT licensed, no API costs
 *
 * 2. **Demucs** (Meta) - For source separation
 *    - Separates guitar from full mix before transcription
 *    - Server-side Python process
 *    - Pairs with Basic Pitch for the full pipeline
 *
 * 3. **Whisper + LLM hybrid** - For chord recognition
 *    - Use an audio ML model for onset detection
 *    - Feed spectral features to an LLM for chord classification
 *    - Best for beginner mode chord sheets
 *
 * Pipeline: Audio -> Source Separation -> Pitch Detection -> MIDI ->
 *           Tab Mapping -> Hand Pose Generation
 */

import type {
  Song,
  SongEvent,
  HandPose,
  FingerPlacement,
  ChordShape,
  TabNote,
} from '../types/song';

/** Result from the pitch detection stage */
export interface PitchDetectionResult {
  notes: Array<{
    startTime: number;
    endTime: number;
    pitch: number;
    confidence: number;
    amplitude: number;
  }>;
}

/** MIDI note number to guitar string/fret mapping */
interface GuitarMapping {
  string: 1 | 2 | 3 | 4 | 5 | 6;
  fret: number;
}

/** Standard tuning MIDI note numbers for open strings */
const STANDARD_TUNING_MIDI = [40, 45, 50, 55, 59, 64];

/**
 * Map a MIDI note number to the most ergonomic guitar position.
 */
export function midiToGuitar(
  midiNote: number,
  _preferredPosition = 0
): GuitarMapping | null {
  const candidates: GuitarMapping[] = [];

  for (let s = 0; s < 6; s++) {
    const fret = midiNote - STANDARD_TUNING_MIDI[s];
    if (fret >= 0 && fret <= 22) {
      candidates.push({
        string: (s + 1) as GuitarMapping['string'],
        fret,
      });
    }
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a.fret - b.fret);
  return candidates[0];
}

/**
 * Generate a hand pose from finger placements.
 */
export function generateHandPose(
  placements: FingerPlacement[],
  time: number,
  duration: number
): HandPose {
  const avgFret =
    placements.reduce((sum, p) => sum + p.fret, 0) / placements.length || 1;

  return {
    time,
    duration,
    placements,
    wristAngle: Math.max(-15, Math.min(15, (avgFret - 5) * 2)),
    handPosition: avgFret,
  };
}

/**
 * Convert pitch detection results to tab events.
 */
export function pitchesToEvents(
  pitchResult: PitchDetectionResult,
  _chordThreshold = 0.05
): SongEvent[] {
  const events: SongEvent[] = [];

  for (const note of pitchResult.notes) {
    const mapping = midiToGuitar(note.pitch);
    if (!mapping) continue;

    const placement: FingerPlacement = {
      string: mapping.string,
      fret: mapping.fret,
      finger: mapping.fret === 0
        ? 0
        : (Math.min(mapping.fret, 4) as FingerPlacement['finger']),
    };

    const _tabNote: TabNote = {
      string: mapping.string,
      fret: mapping.fret,
      duration: note.endTime - note.startTime,
    };

    const duration = note.endTime - note.startTime;
    const handPose = generateHandPose([placement], note.startTime, duration);

    events.push({
      time: note.startTime,
      duration,
      type: 'tab',
      notes: [_tabNote],
      handPose,
    });
  }

  return events;
}

/** Helper to build a demo chord */
function demoChord(
  name: string,
  symbol: string,
  placements: FingerPlacement[],
  mutedStrings: number[]
): ChordShape {
  return { name, symbol, placements, mutedStrings };
}

/**
 * Full transcription pipeline.
 * In production this calls server-side ML models.
 * Returns a demo song for development.
 */
export async function transcribeAudio(audioSrc: string): Promise<Song> {
  console.log(
    `[GhostGuitar] Transcription pipeline initialized for: ${audioSrc}`
  );

  const am = demoChord(
    'A Minor',
    'Am',
    [
      { string: 2, fret: 1, finger: 1 },
      { string: 3, fret: 2, finger: 2 },
      { string: 4, fret: 2, finger: 3 },
    ],
    [6]
  );

  const c = demoChord(
    'C Major',
    'C',
    [
      { string: 2, fret: 1, finger: 1 },
      { string: 4, fret: 2, finger: 2 },
      { string: 5, fret: 3, finger: 3 },
    ],
    [6]
  );

  const g = demoChord(
    'G Major',
    'G',
    [
      { string: 1, fret: 3, finger: 3 },
      { string: 5, fret: 2, finger: 1 },
      { string: 6, fret: 3, finger: 2 },
    ],
    []
  );

  const demoEvents: SongEvent[] = [
    {
      time: 0,
      duration: 2,
      type: 'chord',
      chord: am,
      handPose: generateHandPose(am.placements, 0, 2),
    },
    {
      time: 2,
      duration: 2,
      type: 'chord',
      chord: c,
      handPose: generateHandPose(c.placements, 2, 2),
    },
    {
      time: 4,
      duration: 2,
      type: 'chord',
      chord: g,
      handPose: generateHandPose(g.placements, 4, 2),
    },
  ];

  return {
    id: crypto.randomUUID(),
    title: 'Demo Song',
    artist: 'GhostGuitar',
    bpm: 120,
    timeSignature: [4, 4],
    duration: 6,
    audioSrc,
    tuning: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'],
    capo: 0,
    tracks: {
      beginner: {
        events: demoEvents,
        tempoMultiplier: 0.75,
      },
      professional: {
        events: demoEvents,
        tempoMultiplier: 1,
      },
    },
    metadata: {
      transcribedAt: new Date().toISOString(),
      transcriptionEngine: 'ghost-guitar-demo-v0.1',
      confidence: 0.95,
    },
  };
}
