import { describe, it, expect } from 'vitest';
import {
  midiToGuitar,
  generateHandPose,
  pitchesToEvents,
} from './transcriptionPipeline';
import type { PitchDetectionResult } from './transcriptionPipeline';

describe('transcriptionPipeline', () => {
  describe('midiToGuitar', () => {
    it('maps open low E (MIDI 40) to string 1, fret 0', () => {
      const result = midiToGuitar(40);
      expect(result).toEqual({ string: 1, fret: 0 });
    });

    it('maps open high E (MIDI 64) to the lowest fret option', () => {
      const result = midiToGuitar(64);
      expect(result).not.toBeNull();
      // Could be string 1 fret 24 or string 2 fret 19 etc — picks lowest fret
      expect(result!.fret).toBeLessThanOrEqual(5);
    });

    it('maps middle C (MIDI 60) to a valid guitar position', () => {
      const result = midiToGuitar(60);
      expect(result).not.toBeNull();
      expect(result!.string).toBeGreaterThanOrEqual(1);
      expect(result!.string).toBeLessThanOrEqual(6);
      expect(result!.fret).toBeGreaterThanOrEqual(0);
      expect(result!.fret).toBeLessThanOrEqual(22);
    });

    it('returns null for notes below the guitar range', () => {
      expect(midiToGuitar(20)).toBeNull();
    });

    it('returns null for notes above the guitar range', () => {
      expect(midiToGuitar(100)).toBeNull();
    });

    it('prefers lower fret positions for ergonomics', () => {
      // A note playable on multiple strings should pick the lowest fret
      const result = midiToGuitar(50); // D3 = string 3 open
      expect(result).toEqual({ string: 3, fret: 0 });
    });

    it('maps A2 (MIDI 45) to string 2, fret 0', () => {
      expect(midiToGuitar(45)).toEqual({ string: 2, fret: 0 });
    });

    it('maps G3 (MIDI 55) to string 4, fret 0', () => {
      expect(midiToGuitar(55)).toEqual({ string: 4, fret: 0 });
    });

    it('maps B3 (MIDI 59) to string 5, fret 0', () => {
      expect(midiToGuitar(59)).toEqual({ string: 5, fret: 0 });
    });
  });

  describe('generateHandPose', () => {
    it('generates a pose with correct time and duration', () => {
      const pose = generateHandPose(
        [{ string: 1, fret: 3, finger: 1 }],
        1.5,
        2.0
      );
      expect(pose.time).toBe(1.5);
      expect(pose.duration).toBe(2.0);
    });

    it('calculates handPosition as average fret', () => {
      const pose = generateHandPose(
        [
          { string: 1, fret: 2, finger: 1 },
          { string: 2, fret: 4, finger: 2 },
        ],
        0,
        1
      );
      expect(pose.handPosition).toBe(3);
    });

    it('clamps wristAngle between -15 and 15', () => {
      const lowPose = generateHandPose(
        [{ string: 1, fret: 0, finger: 0 }],
        0,
        1
      );
      expect(lowPose.wristAngle).toBeGreaterThanOrEqual(-15);

      const highPose = generateHandPose(
        [{ string: 1, fret: 20, finger: 1 }],
        0,
        1
      );
      expect(highPose.wristAngle).toBeLessThanOrEqual(15);
    });

    it('preserves the finger placements', () => {
      const placements = [
        { string: 2 as const, fret: 1, finger: 1 as const },
        { string: 3 as const, fret: 2, finger: 2 as const },
      ];
      const pose = generateHandPose(placements, 0, 1);
      expect(pose.placements).toBe(placements);
    });
  });

  describe('pitchesToEvents', () => {
    it('converts pitch notes to SongEvents', () => {
      const pitchResult: PitchDetectionResult = {
        notes: [
          { startTime: 0, endTime: 1, pitch: 40, confidence: 0.9, amplitude: 0.8 },
          { startTime: 1, endTime: 2, pitch: 45, confidence: 0.85, amplitude: 0.7 },
        ],
      };

      const events = pitchesToEvents(pitchResult);
      expect(events).toHaveLength(2);
      expect(events[0].type).toBe('tab');
      expect(events[0].time).toBe(0);
      expect(events[0].duration).toBe(1);
      expect(events[1].time).toBe(1);
    });

    it('skips notes outside guitar range', () => {
      const pitchResult: PitchDetectionResult = {
        notes: [
          { startTime: 0, endTime: 1, pitch: 10, confidence: 0.9, amplitude: 0.8 },
        ],
      };

      const events = pitchesToEvents(pitchResult);
      expect(events).toHaveLength(0);
    });

    it('creates handPose for each event', () => {
      const pitchResult: PitchDetectionResult = {
        notes: [
          { startTime: 0, endTime: 0.5, pitch: 52, confidence: 0.9, amplitude: 0.8 },
        ],
      };

      const events = pitchesToEvents(pitchResult);
      expect(events[0].handPose).toBeDefined();
      expect(events[0].handPose.time).toBe(0);
      expect(events[0].handPose.duration).toBe(0.5);
    });

    it('returns empty array for empty input', () => {
      expect(pitchesToEvents({ notes: [] })).toEqual([]);
    });
  });
});
