/**
 * Song Schema — Spotify Guitar Tabs Tool
 *
 * Data model for a static, printable guitar sheet.
 */

export interface SheetSection {
  name: string;
  content: string; // Lyrics with bracketed chords [G], or ASCII tabs
}

/** Transcription uncertainty record */
export interface TranscriptionUncertainty {
  location: string;
  message: string;
  candidates: string[];
  confidences: number[];
}

/** Complete Song object */
export interface Song {
  id: string;
  /** BPM of the original recording */
  bpm: number;
  /** Time signature, e.g. [4, 4] or [3, 4] */
  timeSignature: [number, number];
  /** Type of sheet generated */
  type: 'chord' | 'tab';
  /** The chords used in this song */
  chordsUsed: string[];
  /** Guitar voicings: chord name -> fret string (e.g. "x-3-2-0-1-0") */
  voicings: Record<string, string>;
  /** The structural sections of the song (Verse, Chorus, etc.) */
  sections: SheetSection[];
  /** Audio source — Spotify URI or URL */
  audioSrc: string;
  /** Guitar tuning (standard = ['E2','A2','D3','G3','B3','E4']) */
  tuning: string[];
  /** Capo position (0 = no capo) */
  capo: number;
  /** Metadata */
  metadata: {
    name: string;
    artist: string;
    originalKey: string;
    scale: string[];
    transcribedAt: string;
    transcriptionEngine: string;
    confidence: number;
  };
  /** Low-confidence detections and ambiguities */
  uncertainties: TranscriptionUncertainty[];
}
