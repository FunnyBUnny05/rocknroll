/**
 * Basic Pitch Integration
 *
 * Uses Spotify's Basic Pitch (TensorFlow.js-based) for in-browser
 * audio-to-MIDI transcription. Converts detected notes into GhostGuitar
 * SongEvents with hand-pose data.
 */

import {
  BasicPitch,
  outputToNotesPoly,
  noteFramesToTime,
  addPitchBendsToNoteEvents,
} from '@spotify/basic-pitch';
import type { NoteEventTime } from '@spotify/basic-pitch';
import type { Song, SongEvent, FingerPlacement, TabNote } from '../types/song';
import { midiToGuitar, generateHandPose } from './transcriptionPipeline';

export interface TranscriptionProgress {
  percent: number;
  stage: 'loading' | 'separating' | 'detecting' | 'mapping' | 'done';
}

/**
 * Decode an audio File to an AudioBuffer at 22050 Hz (Basic Pitch requirement).
 */
async function decodeAudioFile(file: File): Promise<AudioBuffer> {
  const arrayBuffer = await file.arrayBuffer();
  const audioCtx = new AudioContext({ sampleRate: 22050 });
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  await audioCtx.close();
  return audioBuffer;
}

/**
 * Assign fingers to a set of simultaneous note placements.
 */
function assignFingers(
  placements: Array<{ string: 1 | 2 | 3 | 4 | 5 | 6; fret: number }>
): FingerPlacement[] {
  const sorted = [...placements].sort((a, b) => a.string - b.string);
  return sorted.map((p, i) => ({
    string: p.string,
    fret: p.fret,
    finger: (p.fret === 0 ? 0 : Math.min(i + 1, 4)) as FingerPlacement['finger'],
  }));
}

/**
 * Group notes that overlap in time into chord events.
 */
function groupIntoChords(
  notes: NoteEventTime[],
  threshold = 0.05
): NoteEventTime[][] {
  if (notes.length === 0) return [];

  const sorted = [...notes].sort(
    (a, b) => a.startTimeSeconds - b.startTimeSeconds
  );
  const groups: NoteEventTime[][] = [[sorted[0]]];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const lastGroup = groups[groups.length - 1];
    const lastStart = lastGroup[0].startTimeSeconds;

    if (current.startTimeSeconds - lastStart < threshold) {
      lastGroup.push(current);
    } else {
      groups.push([current]);
    }
  }

  return groups;
}

/**
 * Convert Basic Pitch NoteEventTime[] to GhostGuitar SongEvents.
 */
function notesToSongEvents(notes: NoteEventTime[]): SongEvent[] {
  const groups = groupIntoChords(notes);
  const events: SongEvent[] = [];

  for (const group of groups) {
    const mappings = group
      .map((n) => ({
        note: n,
        guitar: midiToGuitar(n.pitchMidi),
      }))
      .filter((m) => m.guitar !== null);

    if (mappings.length === 0) continue;

    const time = group[0].startTimeSeconds;
    const maxEnd = Math.max(
      ...group.map((n) => n.startTimeSeconds + n.durationSeconds)
    );
    const duration = maxEnd - time;

    const rawPlacements = mappings.map((m) => ({
      string: m.guitar!.string,
      fret: m.guitar!.fret,
    }));

    const placements = assignFingers(rawPlacements);
    const handPose = generateHandPose(placements, time, duration);

    if (group.length >= 2) {
      events.push({
        time,
        duration,
        type: 'chord',
        chord: {
          name: `Detected (${group.length} notes)`,
          symbol: '?',
          placements,
          mutedStrings: [],
        },
        handPose,
      });
    } else {
      const tabNotes: TabNote[] = mappings.map((m) => ({
        string: m.guitar!.string,
        fret: m.guitar!.fret,
        duration: m.note.durationSeconds,
      }));

      events.push({
        time,
        duration,
        type: 'tab',
        notes: tabNotes,
        handPose,
      });
    }
  }

  return events;
}

/**
 * Simplify events for beginner mode.
 */
function simplifyForBeginner(events: SongEvent[]): SongEvent[] {
  const simplified: SongEvent[] = [];
  const minDuration = 0.5;

  for (const event of events) {
    if (event.duration < minDuration) continue;
    simplified.push({
      ...event,
      type: 'chord',
      duration: Math.max(event.duration, 1.0),
    });
  }

  return simplified;
}

/**
 * Estimate BPM from note onset times.
 */
function estimateBPM(events: SongEvent[]): number {
  if (events.length < 2) return 120;

  const intervals: number[] = [];
  for (let i = 1; i < Math.min(events.length, 50); i++) {
    intervals.push(events[i].time - events[i - 1].time);
  }

  const avgInterval =
    intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const bpm = Math.round(60 / avgInterval);
  return Math.max(40, Math.min(200, bpm));
}

/**
 * Full transcription using Basic Pitch.
 * Takes an audio File, runs in-browser pitch detection, returns a Song.
 */
export async function transcribeWithBasicPitch(
  file: File,
  onProgress?: (progress: TranscriptionProgress) => void
): Promise<Song> {
  onProgress?.({ percent: 5, stage: 'loading' });

  // Decode audio to mono Float32Array at 22050 Hz
  const audioBuffer = await decodeAudioFile(file);
  const monoData = audioBuffer.getChannelData(0);

  onProgress?.({ percent: 20, stage: 'detecting' });

  // Initialize Basic Pitch with the bundled model
  const modelUrl = new URL(
    '@spotify/basic-pitch/model/model.json',
    import.meta.url
  ).toString();
  const basicPitch = new BasicPitch(modelUrl);

  // Collect raw model output frames
  const allFrames: number[][] = [];
  const allOnsets: number[][] = [];
  const allContours: number[][] = [];

  await basicPitch.evaluateModel(
    monoData,
    (frames, onsets, contours) => {
      allFrames.push(...frames);
      allOnsets.push(...onsets);
      allContours.push(...contours);
    },
    (percent) => {
      onProgress?.({
        percent: 20 + percent * 50,
        stage: 'detecting',
      });
    }
  );

  onProgress?.({ percent: 75, stage: 'mapping' });

  // Convert raw frames to structured note events
  const rawNoteEvents = outputToNotesPoly(
    allFrames,
    allOnsets,
    0.5,    // onset threshold
    0.3,    // frame threshold
    128,    // min note length (frames)
    true,   // infer onsets
    null,   // max frequency
    null,   // min frequency
    true    // melodia trick
  );

  // Add pitch bend data from contours
  addPitchBendsToNoteEvents(allContours, rawNoteEvents);

  // Convert frame-based events to time-based events
  const noteEvents = noteFramesToTime(rawNoteEvents);

  // Map to GhostGuitar song events
  const proEvents = notesToSongEvents(noteEvents);
  const beginnerEvents = simplifyForBeginner(proEvents);
  const bpm = estimateBPM(proEvents);

  onProgress?.({ percent: 95, stage: 'mapping' });

  const song: Song = {
    id: crypto.randomUUID(),
    title: file.name.replace(/\.[^.]+$/, ''),
    artist: 'Unknown',
    bpm,
    timeSignature: [4, 4],
    duration: audioBuffer.duration,
    audioSrc: URL.createObjectURL(file),
    tuning: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'],
    capo: 0,
    tracks: {
      beginner: {
        events: beginnerEvents,
        tempoMultiplier: 0.75,
      },
      professional: {
        events: proEvents,
        tempoMultiplier: 1,
      },
    },
    metadata: {
      transcribedAt: new Date().toISOString(),
      transcriptionEngine: 'basic-pitch-v1-browser',
      confidence:
        noteEvents.length > 0
          ? noteEvents.reduce((s, n) => s + n.amplitude, 0) /
            noteEvents.length
          : 0,
    },
  };

  onProgress?.({ percent: 100, stage: 'done' });
  return song;
}
