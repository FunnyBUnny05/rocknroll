import { describe, it, expect } from 'vitest';
import {
  fretX,
  stringY,
  fingerPosition,
  fretPositions,
  FRETBOARD,
} from './fretboardGeometry';

describe('fretboardGeometry', () => {
  describe('fretX', () => {
    it('returns 0 for the nut (fret 0)', () => {
      expect(fretX(0)).toBe(0);
    });

    it('returns positive values for frets 1+', () => {
      for (let i = 1; i <= 22; i++) {
        expect(fretX(i)).toBeGreaterThan(0);
      }
    });

    it('returns monotonically increasing values', () => {
      let prev = fretX(0);
      for (let i = 1; i <= 22; i++) {
        const current = fretX(i);
        expect(current).toBeGreaterThan(prev);
        prev = current;
      }
    });

    it('fret 12 is approximately half the scale length (octave)', () => {
      const f12 = fretX(12);
      expect(f12).toBeCloseTo(FRETBOARD.LENGTH / 2, 1);
    });

    it('spacing decreases as fret number increases (equal temperament)', () => {
      const gap1 = fretX(2) - fretX(1);
      const gap10 = fretX(11) - fretX(10);
      expect(gap1).toBeGreaterThan(gap10);
    });
  });

  describe('stringY', () => {
    it('string 1 (high E) is above string 6 (low E)', () => {
      expect(stringY(1)).toBeGreaterThan(stringY(6));
    });

    it('strings are evenly spaced', () => {
      const gaps: number[] = [];
      for (let s = 1; s < 6; s++) {
        gaps.push(stringY(s) - stringY(s + 1));
      }
      const avg = gaps.reduce((a, b) => a + b) / gaps.length;
      for (const gap of gaps) {
        expect(gap).toBeCloseTo(avg, 5);
      }
    });
  });

  describe('fingerPosition', () => {
    it('returns a 3-tuple [x, y, z]', () => {
      const pos = fingerPosition(1, 1);
      expect(pos).toHaveLength(3);
    });

    it('z is above the fretboard surface', () => {
      const pos = fingerPosition(3, 5);
      expect(pos[2]).toBeGreaterThan(FRETBOARD.DEPTH);
    });

    it('open string position (fret 0) is before the nut', () => {
      const pos = fingerPosition(1, 0);
      expect(pos[0]).toBeLessThan(0);
    });

    it('fretted position is between the two fret wires', () => {
      const pos = fingerPosition(3, 5);
      const fret4x = fretX(4);
      const fret5x = fretX(5);
      expect(pos[0]).toBeGreaterThan(fret4x);
      expect(pos[0]).toBeLessThan(fret5x);
    });
  });

  describe('fretPositions', () => {
    it('returns the correct number of fret positions', () => {
      const positions = fretPositions();
      expect(positions).toHaveLength(FRETBOARD.FRET_COUNT);
    });

    it('all positions are positive', () => {
      for (const pos of fretPositions()) {
        expect(pos).toBeGreaterThan(0);
      }
    });
  });
});
