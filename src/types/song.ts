/**
 * Song Schema — Spotify Guitar Tabs Tool
 *
 * Data model for a song including audio references,
 * tab/chord data for fretboard visualization and sheet display.
 */

/** Individual finger placement on the fretboard */
export interface FingerPlacement {
  /** Guitar string number (1=high E, 6=low E) */
  string: 1 | 2 | 3 | 4 | 5 | 6;
  /** Fret number (0 = open string) */
  fret: number;
  /** Finger used (1=index, 2=middle, 3=ring, 4=pinky, 0=thumb/open) */
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
  /** Audio source — Spotify URI or URL */
  audioSrc: string;
  /** Guitar tuning (standard = ['E2','A2','D3','G3','B3','E4']) */
  tuning: string[];
  /** Capo position (0 = no capo) */
  capo: number;
  /** Track data for both difficulty modes */
  tracks: SongTrack;
  /** Lyrics synced with timestamps */
  lyricsAligned?: { time: number; text: string }[];
  /** Metadata */
  metadata: {
    transcribedAt: string;
    transcriptionEngine: string;
    confidence: number;
  };
}
