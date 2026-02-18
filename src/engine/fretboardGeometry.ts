/**
 * Fretboard geometry calculations.
 * Maps string/fret positions to 3D coordinates for the visualization.
 */

/** Standard guitar fretboard dimensions (in arbitrary 3D units) */
export const FRETBOARD = {
  FRET_COUNT: 22,
  LENGTH: 10,
  WIDTH: 1.8,
  DEPTH: 0.15,
  NUT_X: 0,
  MARKERS: [3, 5, 7, 9, 12, 15, 17, 19, 21],
  DOUBLE_MARKERS: [12],
} as const;

/**
 * Calculate the X position of a fret using equal temperament spacing.
 */
export function fretX(fretNumber: number): number {
  if (fretNumber === 0) return FRETBOARD.NUT_X;
  const scaleLength = FRETBOARD.LENGTH;
  return scaleLength * (1 - 1 / Math.pow(2, fretNumber / 12));
}

/**
 * Calculate the Y position of a string (1=high E top, 6=low E bottom).
 */
export function stringY(stringNumber: number): number {
  const spacing = FRETBOARD.WIDTH / 7;
  return (FRETBOARD.WIDTH / 2) - (stringNumber * spacing);
}

/**
 * Get the 3D position [x, y, z] for a finger on the fretboard.
 */
export function fingerPosition(
  stringNum: number,
  fretNum: number
): [number, number, number] {
  const x = fretNum === 0 ? -0.15 : (fretX(fretNum) + fretX(fretNum - 1)) / 2;
  const y = stringY(stringNum);
  const z = FRETBOARD.DEPTH + 0.08;
  return [x, y, z];
}

/**
 * Get X positions for all fret wires.
 */
export function fretPositions(): number[] {
  return Array.from({ length: FRETBOARD.FRET_COUNT }, (_, i) => fretX(i + 1));
}
