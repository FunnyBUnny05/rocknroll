/**
 * GhostGuitar Song Schema
 *
 * Defines the complete data model for a song including audio references,
 * tab/chord data, and hand-pose keyframes for the Ghost Hand visualization.
 */

/** Individual finger placement on the fretboard */
export interface FingerPlacement {
  /** Guitar string number (1=high E, 6=low E) */
  string: 1 | 2 | 3 | 4 | 5 | 6;
  /** Fret number (0 = open string) */
  fret: number;
  /** Finger used (1=index, 2=middle, 3=ring, 4=pinky, 0=thumb) */
  finger: 0 | 1 | 2 | 3 | 4;
}

/** A chord shape with name and finger positions */
export interface ChordShape {
  name: string;
  /** e.g. "Am", "G7", "Cmaj7" */
  symbol: string;
  placements: FingerPlacement[];
  /** Strings that should be muted (not played) */
  mutedStrings: number[];
  /** Optional barre fret */
  barreFret?: number;
}

/** A single note in tablature */
export interface TabNote {
  string: 1 | 2 | 3 | 4 | 5 | 6;
  fret: number;
  /** Duration in beats */
  duration: number;
  /** Technique: normal pick, hammer-on, pull-off, slide, bend */
  technique?: 'normal' | 'hammer-on' | 'pull-off' | 'slide-up' | 'slide-down' | 'bend';
}

/** 3D hand pose keyframe for Ghost Hand animation */
export interface HandPose {
  /** Timestamp in seconds */
  time: number;
  /** Duration this pose is held */
  duration: number;
  /** Finger placements active in this pose */
  placements: FingerPlacement[];
  /** Wrist rotation in degrees for natural positioning */
  wristAngle: number;
  /** How far up the neck the hand is positioned (fret center) */
  handPosition: number;
}

/** A timed event during playback */
export interface SongEvent {
  /** Timestamp in seconds from start */
  time: number;
  /** Duration in seconds */
  duration: number;
  /** Event type */
  type: 'chord' | 'tab';
  /** Chord data (when type is 'chord') */
  chord?: ChordShape;
  /** Tab notes (when type is 'tab') */
  notes?: TabNote[];
  /** Corresponding hand pose */
  handPose: HandPose;
}

/** Difficulty-specific track data */
export interface SongTrack {
  /** Beginner: simplified chords, slower tempo */
  beginner: {
    events: SongEvent[];
    tempoMultiplier: number;
  };
  /** Professional: full tabs at original speed */
  professional: {
    events: SongEvent[];
    tempoMultiplier: number;
  };
}

/** Complete Song object */
export interface Song {
  id: string;
  title: string;
  artist: string;
  /** BPM of the original recording */
  bpm: number;
  /** Time signature [beats per measure, beat unit] */
  timeSignature: [number, number];
  /** Duration in seconds */
  duration: number;
  /** Audio source - URL or local file reference */
  audioSrc: string;
  /** Guitar tuning (standard = ['E2','A2','D3','G3','B3','E4']) */
  tuning: string[];
  /** Capo position (0 = no capo) */
  capo: number;
  /** Track data for both difficulty modes */
  tracks: SongTrack;
  /** Metadata */
  metadata: {
    transcribedAt: string;
    transcriptionEngine: string;
    confidence: number;
  };
}

/** JSON Schema definition for validation */
export const songJsonSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  title: 'GhostGuitar Song',
  description: 'Complete song data including audio, tabs, chords, and hand-pose keyframes',
  type: 'object',
  required: ['id', 'title', 'artist', 'bpm', 'duration', 'audioSrc', 'tracks'],
  properties: {
    id: { type: 'string', format: 'uuid' },
    title: { type: 'string' },
    artist: { type: 'string' },
    bpm: { type: 'number', minimum: 20, maximum: 300 },
    timeSignature: {
      type: 'array',
      items: { type: 'number' },
      minItems: 2,
      maxItems: 2,
    },
    duration: { type: 'number', minimum: 0 },
    audioSrc: { type: 'string' },
    tuning: {
      type: 'array',
      items: { type: 'string' },
      default: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'],
    },
    capo: { type: 'integer', minimum: 0, maximum: 12 },
    tracks: {
      type: 'object',
      required: ['beginner', 'professional'],
      properties: {
        beginner: {
          type: 'object',
          properties: {
            events: { type: 'array' },
            tempoMultiplier: { type: 'number', minimum: 0.25, maximum: 1 },
          },
        },
        professional: {
          type: 'object',
          properties: {
            events: { type: 'array' },
            tempoMultiplier: { type: 'number', minimum: 0.5, maximum: 2 },
          },
        },
      },
    },
  },
} as const;
