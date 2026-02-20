/**
 * Audio Analysis Engine
 *
 * Local harmonic analysis that processes Spotify Audio Analysis data
 * (chroma vectors, sections, segments) to detect:
 *   - Key and scale (Krumhansl-Schmuckler algorithm)
 *   - Chord progressions from chroma/pitch vectors
 *   - Tempo and time signature
 *   - Confidence scores for each detection
 *
 * This runs BEFORE sending data to DeepSeek, providing a structured
 * harmonic foundation that the AI refines into a full sheet.
 */

import type {
  SpotifyAudioAnalysis,
  SpotifyAudioFeatures,
  SpotifySection,
  SpotifySegment,
} from './SpotifyService';

// ── Note / pitch constants ─────────────────────────────────────────────

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

const ENHARMONIC_MAP: Record<string, string> = {
  'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb',
};

/** Krumhansl-Kessler major key profile (correlation weights) */
const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];

/** Krumhansl-Kessler minor key profile */
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

// ── Chord templates (12-element binary/weighted chroma patterns) ────────

interface ChordTemplate {
  name: string;        // e.g. "maj", "min", "7"
  suffix: string;      // e.g. "", "m", "7"
  intervals: number[]; // semitone offsets from root
}

const CHORD_TEMPLATES: ChordTemplate[] = [
  { name: 'maj',    suffix: '',      intervals: [0, 4, 7] },
  { name: 'min',    suffix: 'm',     intervals: [0, 3, 7] },
  { name: '7',      suffix: '7',     intervals: [0, 4, 7, 10] },
  { name: 'maj7',   suffix: 'maj7',  intervals: [0, 4, 7, 11] },
  { name: 'min7',   suffix: 'm7',    intervals: [0, 3, 7, 10] },
  { name: 'dim',    suffix: 'dim',   intervals: [0, 3, 6] },
  { name: 'aug',    suffix: 'aug',   intervals: [0, 4, 8] },
  { name: 'sus2',   suffix: 'sus2',  intervals: [0, 2, 7] },
  { name: 'sus4',   suffix: 'sus4',  intervals: [0, 5, 7] },
  { name: 'add9',   suffix: 'add9',  intervals: [0, 4, 7, 14] },
  { name: 'min9',   suffix: 'm9',    intervals: [0, 3, 7, 10, 14] },
  { name: '9',      suffix: '9',     intervals: [0, 4, 7, 10, 14] },
  { name: 'dim7',   suffix: 'dim7',  intervals: [0, 3, 6, 9] },
  { name: 'aug7',   suffix: 'aug7',  intervals: [0, 4, 8, 10] },
  { name: '6',      suffix: '6',     intervals: [0, 4, 7, 9] },
  { name: 'min6',   suffix: 'm6',    intervals: [0, 3, 7, 9] },
];

// ── Public result types ─────────────────────────────────────────────────

export interface DetectedKey {
  note: string;         // e.g. "G"
  quality: 'major' | 'minor';
  confidence: number;   // 0–1
  scale: string[];      // e.g. ["G","A","B","C","D","E","F#"]
}

export interface DetectedChord {
  name: string;         // e.g. "Am7"
  root: string;         // e.g. "A"
  quality: string;      // e.g. "min7"
  confidence: number;   // 0–1
  startMs: number;
  endMs: number;
}

export interface ChordProgression {
  sectionName: string;
  chords: DetectedChord[];
}

export interface Uncertainty {
  location: string;     // e.g. "Segment at 42300ms"
  message: string;      // e.g. "Ambiguous between Am and C"
  candidates: string[];
  confidences: number[];
}

export interface AudioAnalysisResult {
  key: DetectedKey;
  tempo: number;
  timeSignature: [number, number];
  chordProgressions: ChordProgression[];
  allChordsUsed: string[];
  uncertainties: Uncertainty[];
}

// ── Key detection (Krumhansl-Schmuckler) ────────────────────────────────

function pearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;

  let num = 0, denX = 0, denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }

  const den = Math.sqrt(denX * denY);
  return den === 0 ? 0 : num / den;
}

/** Rotate an array by `shift` positions (circular shift) */
function rotate<T>(arr: T[], shift: number): T[] {
  const n = arr.length;
  const s = ((shift % n) + n) % n;
  return [...arr.slice(s), ...arr.slice(0, s)];
}

/**
 * Build an aggregate chroma vector from all segments.
 * Each element is the weighted-average pitch energy for that pitch class.
 */
function aggregateChroma(segments: SpotifySegment[]): number[] {
  const chroma = new Array(12).fill(0);
  let totalDuration = 0;

  for (const seg of segments) {
    if (!seg.pitches || seg.pitches.length !== 12) continue;
    const w = seg.duration;
    totalDuration += w;
    for (let i = 0; i < 12; i++) {
      chroma[i] += seg.pitches[i] * w;
    }
  }

  if (totalDuration > 0) {
    for (let i = 0; i < 12; i++) chroma[i] /= totalDuration;
  }

  return chroma;
}

/**
 * Detect key using the Krumhansl-Schmuckler algorithm.
 * Compares aggregate chroma to major/minor profiles for all 12 roots.
 */
function detectKey(
  segments: SpotifySegment[],
  spotifyKey?: number,
  spotifyMode?: number,
  spotifyKeyConfidence?: number,
): DetectedKey {
  const chroma = aggregateChroma(segments);

  let bestNote = 0;
  let bestQuality: 'major' | 'minor' = 'major';
  let bestCorr = -Infinity;

  for (let root = 0; root < 12; root++) {
    const rotated = rotate(chroma, root);

    const corrMajor = pearsonCorrelation(rotated, MAJOR_PROFILE);
    const corrMinor = pearsonCorrelation(rotated, MINOR_PROFILE);

    if (corrMajor > bestCorr) {
      bestCorr = corrMajor;
      bestNote = root;
      bestQuality = 'major';
    }
    if (corrMinor > bestCorr) {
      bestCorr = corrMinor;
      bestNote = root;
      bestQuality = 'minor';
    }
  }

  // Normalize confidence to 0-1 range (correlation is -1 to 1)
  let confidence = Math.max(0, Math.min(1, (bestCorr + 1) / 2));

  // If Spotify provides a key with high confidence, weight it in
  if (
    spotifyKey !== undefined &&
    spotifyMode !== undefined &&
    spotifyKeyConfidence !== undefined &&
    spotifyKeyConfidence > 0.5
  ) {
    const spotifyQuality: 'major' | 'minor' = spotifyMode === 1 ? 'major' : 'minor';
    // If Spotify agrees, boost confidence; if not, average them
    if (spotifyKey === bestNote && spotifyQuality === bestQuality) {
      confidence = Math.min(1, confidence * 0.6 + spotifyKeyConfidence * 0.4);
    } else if (spotifyKeyConfidence > confidence) {
      // Spotify is more confident, prefer it
      bestNote = spotifyKey;
      bestQuality = spotifyQuality;
      confidence = spotifyKeyConfidence * 0.7 + confidence * 0.3;
    }
  }

  const noteName = formatNoteName(NOTE_NAMES[bestNote]);
  const scale = buildScale(bestNote, bestQuality);

  return {
    note: noteName,
    quality: bestQuality,
    confidence: Math.round(confidence * 1000) / 1000,
    scale,
  };
}

/** Build scale note names for the detected key */
function buildScale(root: number, quality: 'major' | 'minor'): string[] {
  const majorIntervals = [0, 2, 4, 5, 7, 9, 11];
  const minorIntervals = [0, 2, 3, 5, 7, 8, 10]; // Natural minor

  const intervals = quality === 'major' ? majorIntervals : minorIntervals;
  return intervals.map(i => formatNoteName(NOTE_NAMES[(root + i) % 12]));
}

/** Use flats for keys that conventionally use flats */
function formatNoteName(note: string): string {
  const flatKeys = ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb'];
  // For sharp notes, check if we should use the enharmonic flat
  if (ENHARMONIC_MAP[note]) {
    // Simple heuristic: always provide the sharp name, let consumers choose
    // We return the common name (flats for Bb, Eb, Ab, Db, Gb)
    const flat = ENHARMONIC_MAP[note];
    if (flatKeys.includes(flat)) return flat;
  }
  return note;
}

// ── Chord detection from chroma vectors ─────────────────────────────────

/**
 * Build a 12-element chroma template for a chord rooted at `root`.
 */
function buildChordChroma(root: number, intervals: number[]): number[] {
  const chroma = new Array(12).fill(0);
  for (const interval of intervals) {
    chroma[(root + interval) % 12] = 1;
  }
  return chroma;
}

/**
 * Score how well a chroma vector matches a chord template.
 * Uses cosine similarity.
 */
function chromaSimilarity(observed: number[], template: number[]): number {
  let dot = 0, magO = 0, magT = 0;
  for (let i = 0; i < 12; i++) {
    dot += observed[i] * template[i];
    magO += observed[i] * observed[i];
    magT += template[i] * template[i];
  }
  const denom = Math.sqrt(magO) * Math.sqrt(magT);
  return denom === 0 ? 0 : dot / denom;
}

interface ChordCandidate {
  name: string;
  root: string;
  quality: string;
  similarity: number;
}

/**
 * Detect the best-matching chord for a given chroma vector.
 * Returns the top candidate + any close alternatives for uncertainty reporting.
 */
function detectChordFromChroma(chroma: number[]): { best: ChordCandidate; runners: ChordCandidate[] } {
  const candidates: ChordCandidate[] = [];

  for (let root = 0; root < 12; root++) {
    for (const template of CHORD_TEMPLATES) {
      const templateChroma = buildChordChroma(root, template.intervals);
      const sim = chromaSimilarity(chroma, templateChroma);
      candidates.push({
        name: formatNoteName(NOTE_NAMES[root]) + template.suffix,
        root: formatNoteName(NOTE_NAMES[root]),
        quality: template.name,
        similarity: sim,
      });
    }
  }

  candidates.sort((a, b) => b.similarity - a.similarity);

  const best = candidates[0];
  // Runners-up: within 5% of the best score
  const threshold = best.similarity * 0.95;
  const runners = candidates.slice(1).filter(c => c.similarity >= threshold);

  return { best, runners };
}

// ── Segment grouping (merge short segments into chord-length blocks) ────

interface SegmentGroup {
  startMs: number;
  endMs: number;
  chroma: number[];
}

/**
 * Group adjacent segments into blocks roughly matching beat duration,
 * producing an averaged chroma vector per group.
 */
function groupSegments(
  segments: SpotifySegment[],
  minGroupDurationMs: number = 300,
): SegmentGroup[] {
  const groups: SegmentGroup[] = [];
  let currentChroma = new Array(12).fill(0);
  let currentDuration = 0;
  let groupStart = 0;

  for (const seg of segments) {
    const startMs = Math.round(seg.start * 1000);
    const durationMs = Math.round(seg.duration * 1000);

    if (currentDuration === 0) {
      groupStart = startMs;
    }

    // Accumulate weighted chroma
    for (let i = 0; i < 12; i++) {
      currentChroma[i] += (seg.pitches[i] || 0) * seg.duration;
    }
    currentDuration += durationMs;

    if (currentDuration >= minGroupDurationMs) {
      // Normalize
      const totalSec = currentDuration / 1000;
      if (totalSec > 0) {
        for (let i = 0; i < 12; i++) currentChroma[i] /= totalSec;
      }

      groups.push({
        startMs: groupStart,
        endMs: startMs + durationMs,
        chroma: [...currentChroma],
      });

      currentChroma = new Array(12).fill(0);
      currentDuration = 0;
    }
  }

  // Flush remaining
  if (currentDuration > 0) {
    const totalSec = currentDuration / 1000;
    if (totalSec > 0) {
      for (let i = 0; i < 12; i++) currentChroma[i] /= totalSec;
    }
    const lastSeg = segments[segments.length - 1];
    groups.push({
      startMs: groupStart,
      endMs: Math.round((lastSeg.start + lastSeg.duration) * 1000),
      chroma: [...currentChroma],
    });
  }

  return groups;
}

// ── Section mapping ─────────────────────────────────────────────────────

/** Map a generic section index to a conventional name */
function inferSectionName(section: SpotifySection, index: number, total: number): string {
  // Spotify doesn't label sections; use heuristics based on position/loudness
  if (index === 0) return 'Intro';
  if (index === total - 1) return 'Outro';

  // Simple naming based on position in song structure
  const position = index / total;
  if (position < 0.2) return `Verse ${index}`;
  if (position < 0.4) return index % 2 === 0 ? 'Chorus' : `Verse ${Math.ceil(index / 2)}`;
  if (position < 0.6) return index % 2 === 0 ? 'Chorus' : 'Bridge';
  if (position < 0.8) return index % 2 === 0 ? 'Chorus' : `Verse ${Math.ceil(index / 2)}`;
  return 'Chorus';
}

// ── Tempo & time signature extraction ───────────────────────────────────

function extractTempo(
  analysis: SpotifyAudioAnalysis,
  features?: SpotifyAudioFeatures,
): number {
  // Prefer audio features tempo (more reliable)
  if (features?.tempo && features.tempo > 0) {
    return Math.round(features.tempo);
  }

  // Fall back to longest section's tempo
  if (analysis.sections && analysis.sections.length > 0) {
    let longest = analysis.sections[0];
    for (const s of analysis.sections) {
      if (s.duration > longest.duration) longest = s;
    }
    return Math.round(longest.tempo) || 120;
  }

  return 120;
}

function extractTimeSignature(
  analysis: SpotifyAudioAnalysis,
  features?: SpotifyAudioFeatures,
): [number, number] {
  if (features?.time_signature && features.time_signature > 0) {
    return [features.time_signature, 4];
  }
  if (analysis.sections && analysis.sections.length > 0) {
    const sig = analysis.sections[0].time_signature;
    return [sig || 4, 4];
  }
  return [4, 4];
}

// ── Deduplication: collapse repeated adjacent chords ────────────────────

function deduplicateChords(chords: DetectedChord[]): DetectedChord[] {
  if (chords.length === 0) return [];

  const result: DetectedChord[] = [chords[0]];
  for (let i = 1; i < chords.length; i++) {
    const prev = result[result.length - 1];
    if (chords[i].name === prev.name) {
      // Extend duration of previous chord
      prev.endMs = chords[i].endMs;
      // Average confidence
      prev.confidence = (prev.confidence + chords[i].confidence) / 2;
    } else {
      result.push({ ...chords[i] });
    }
  }
  return result;
}

// ── Main analysis function ──────────────────────────────────────────────

/**
 * Analyze Spotify audio data and produce a structured harmonic analysis.
 *
 * Workflow:
 *  1. Detect key/scale/tempo
 *  2. Group segments into chord-length blocks
 *  3. Detect chords from chroma vectors
 *  4. Map chords to Spotify sections
 *  5. Track uncertainties
 */
export function analyzeAudio(
  analysis: SpotifyAudioAnalysis,
  features?: SpotifyAudioFeatures,
): AudioAnalysisResult {
  const uncertainties: Uncertainty[] = [];

  // 1. Key detection
  const spotifySection0 = analysis.sections?.[0];
  const key = detectKey(
    analysis.segments,
    features?.key ?? spotifySection0?.key,
    features?.mode ?? spotifySection0?.mode,
    spotifySection0?.key_confidence,
  );

  if (key.confidence < 0.6) {
    uncertainties.push({
      location: 'Global key detection',
      message: `Key detected as ${key.note} ${key.quality} with low confidence (${key.confidence})`,
      candidates: [key.note],
      confidences: [key.confidence],
    });
  }

  // 2. Tempo & time signature
  const tempo = extractTempo(analysis, features);
  const timeSignature = extractTimeSignature(analysis, features);

  // 3. Group segments and detect chords
  // Use beat-aware grouping: minimum group duration ~= one beat
  const beatDurationMs = Math.round(60000 / tempo);
  const minGroupMs = Math.max(200, Math.min(beatDurationMs, 1000));
  const groups = groupSegments(analysis.segments, minGroupMs);

  const rawChords: DetectedChord[] = groups.map(group => {
    const { best, runners } = detectChordFromChroma(group.chroma);

    // Track uncertainty for ambiguous detections
    if (runners.length > 0 && best.similarity < 0.85) {
      uncertainties.push({
        location: `Segment at ${group.startMs}ms`,
        message: `Ambiguous chord detection (similarity: ${best.similarity.toFixed(3)})`,
        candidates: [best.name, ...runners.slice(0, 2).map(r => r.name)],
        confidences: [best.similarity, ...runners.slice(0, 2).map(r => r.similarity)],
      });
    }

    return {
      name: best.name,
      root: best.root,
      quality: best.quality,
      confidence: Math.round(best.similarity * 1000) / 1000,
      startMs: group.startMs,
      endMs: group.endMs,
    };
  });

  // 4. Deduplicate adjacent identical chords
  const chords = deduplicateChords(rawChords);

  // 5. Map to sections
  const chordProgressions: ChordProgression[] = [];

  if (analysis.sections && analysis.sections.length > 0) {
    for (let i = 0; i < analysis.sections.length; i++) {
      const section = analysis.sections[i];
      const sectionStartMs = Math.round(section.start * 1000);
      const sectionEndMs = Math.round((section.start + section.duration) * 1000);

      const sectionChords = chords.filter(
        c => c.startMs >= sectionStartMs - 50 && c.startMs < sectionEndMs + 50,
      );

      chordProgressions.push({
        sectionName: inferSectionName(section, i, analysis.sections.length),
        chords: sectionChords,
      });
    }
  } else {
    // No sections: treat entire song as one section
    chordProgressions.push({
      sectionName: 'Full Song',
      chords,
    });
  }

  // 6. Collect all unique chord names
  const allChordsUsed = [...new Set(chords.map(c => c.name))];

  return {
    key,
    tempo,
    timeSignature,
    chordProgressions,
    allChordsUsed,
    uncertainties,
  };
}
