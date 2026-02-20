/**
 * Song Schema — Spotify Guitar Tabs Tool
 *
 * Data model for a static, printable guitar sheet.
 */

export interface SheetSection {
  name: string;
  content: string; // Lyrics with bracketed chords [G], or ASCII tabs
}

/** Complete Song object */
export interface Song {
  id: string;
  /** BPM of the original recording */
  bpm: number;
  /** Type of sheet generated */
  type: 'chord' | 'tab';
  /** The chords used in this song */
  chordsUsed: string[];
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
    transcribedAt: string;
    transcriptionEngine: string;
    confidence: number;
  };
}
