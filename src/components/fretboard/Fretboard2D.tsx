/**
 * Fretboard2D - Flat, top-down SVG fretboard visualization.
 *
 * Uses logarithmic (equal temperament) fret spacing for accurate geometry.
 * Supports two display modes:
 *   - Tab mode: highlights only active notes on specific strings
 *   - Chord mode: displays the full chord shape
 *
 * Finger placements are shown as glowing numbered circles.
 */

import { useMemo } from 'react';
import type { SongEvent, FingerPlacement } from '../../types/song';

// --- Layout constants ---

const SVG_WIDTH = 900;
const SVG_HEIGHT = 180;
const PADDING_LEFT = 40;
const PADDING_RIGHT = 20;
const PADDING_TOP = 24;
const PADDING_BOTTOM = 24;
const FRET_COUNT = 15;
const STRING_COUNT = 6;

const NECK_X = PADDING_LEFT;
const NECK_Y = PADDING_TOP;
const NECK_W = SVG_WIDTH - PADDING_LEFT - PADDING_RIGHT;
const NECK_H = SVG_HEIGHT - PADDING_TOP - PADDING_BOTTOM;

const STRING_LABELS = ['E', 'B', 'G', 'D', 'A', 'E'];
const MARKER_FRETS = [3, 5, 7, 9, 12, 15];
const DOUBLE_MARKER_FRETS = [12];

const FINGER_COLORS: Record<number, string> = {
  0: '#a855f7', // thumb
  1: '#8b5cf6', // index
  2: '#7c3aed', // middle
  3: '#6d28d9', // ring
  4: '#5b21b6', // pinky
};

// --- Geometry helpers ---

/** Logarithmic fret position (0..1 fraction of scale length) */
function fretFraction(fretNum: number): number {
  if (fretNum === 0) return 0;
  return 1 - 1 / Math.pow(2, fretNum / 12);
}

/** Pixel X for a given fret number */
function fretX(fretNum: number): number {
  return NECK_X + fretFraction(fretNum) * NECK_W;
}

/** Pixel Y for a given string number (1 = high E at top, 6 = low E at bottom) */
function stringY(stringNum: number): number {
  const spacing = NECK_H / (STRING_COUNT - 1);
  return NECK_Y + (stringNum - 1) * spacing;
}

/** Center X between two frets (where a finger would press) */
function fingerX(fretNum: number): number {
  if (fretNum === 0) return NECK_X - 14;
  return (fretX(fretNum - 1) + fretX(fretNum)) / 2;
}

// --- Component ---

interface Fretboard2DProps {
  activeEvent: SongEvent | null;
  viewMode: 'chord' | 'tab';
}

export function Fretboard2D({ activeEvent, viewMode }: Fretboard2DProps) {
  const fretLines = useMemo(() => {
    const lines: { x: number; fret: number }[] = [];
    for (let f = 1; f <= FRET_COUNT; f++) {
      lines.push({ x: fretX(f), fret: f });
    }
    return lines;
  }, []);

  const placements: FingerPlacement[] = useMemo(() => {
    if (!activeEvent) return [];
    if (viewMode === 'chord' && activeEvent.chord) {
      return activeEvent.chord.placements;
    }
    if (viewMode === 'tab' && activeEvent.notes) {
      return activeEvent.notes.map((n, i) => ({
        string: n.string,
        fret: n.fret,
        finger: (i % 4 + 1) as 0 | 1 | 2 | 3 | 4,
      }));
    }
    // Fallback: show chord placements if available
    if (activeEvent.chord) return activeEvent.chord.placements;
    return [];
  }, [activeEvent, viewMode]);

  const mutedStrings = useMemo(() => {
    if (viewMode === 'chord' && activeEvent?.chord) {
      return new Set(activeEvent.chord.mutedStrings);
    }
    return new Set<number>();
  }, [activeEvent, viewMode]);

  return (
    <svg
      viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
      className="w-full"
      style={{ maxHeight: 200 }}
      role="img"
      aria-label="Guitar fretboard"
    >
      <defs>
        {/* Glow filter for active finger dots */}
        <filter id="finger-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* Subtle neck gradient */}
        <linearGradient id="neck-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2a1a0e" />
          <stop offset="100%" stopColor="#1a0f08" />
        </linearGradient>
      </defs>

      {/* Neck body */}
      <rect
        x={NECK_X}
        y={NECK_Y - 4}
        width={NECK_W}
        height={NECK_H + 8}
        rx={4}
        fill="url(#neck-grad)"
      />

      {/* Fret markers (dots) */}
      {MARKER_FRETS.filter((f) => f <= FRET_COUNT).map((f) => {
        const cx = fingerX(f);
        const isDouble = DOUBLE_MARKER_FRETS.includes(f);
        const midY = NECK_Y + NECK_H / 2;
        return isDouble ? (
          <g key={`marker-${f}`}>
            <circle cx={cx} cy={midY - NECK_H * 0.22} r={4} fill="#444" opacity={0.5} />
            <circle cx={cx} cy={midY + NECK_H * 0.22} r={4} fill="#444" opacity={0.5} />
          </g>
        ) : (
          <circle key={`marker-${f}`} cx={cx} cy={midY} r={4} fill="#444" opacity={0.5} />
        );
      })}

      {/* Nut (thick bar at fret 0) */}
      <rect
        x={NECK_X - 2}
        y={NECK_Y - 4}
        width={4}
        height={NECK_H + 8}
        rx={1}
        fill="#e8e0d0"
      />

      {/* Fret wires */}
      {fretLines.map(({ x, fret }) => (
        <line
          key={`fret-${fret}`}
          x1={x}
          y1={NECK_Y - 2}
          x2={x}
          y2={NECK_Y + NECK_H + 2}
          stroke="#555"
          strokeWidth={1.5}
          opacity={0.6}
        />
      ))}

      {/* Fret numbers */}
      {fretLines.map(({ fret }) => {
        const cx = fingerX(fret);
        return (
          <text
            key={`fretnum-${fret}`}
            x={cx}
            y={SVG_HEIGHT - 4}
            textAnchor="middle"
            fontSize={9}
            fill="#666"
            fontFamily="system-ui, sans-serif"
          >
            {fret}
          </text>
        );
      })}

      {/* Strings */}
      {Array.from({ length: STRING_COUNT }, (_, i) => i + 1).map((s) => {
        const y = stringY(s);
        const thickness = 0.8 + (s - 1) * 0.3;
        return (
          <line
            key={`string-${s}`}
            x1={NECK_X}
            y1={y}
            x2={NECK_X + NECK_W}
            y2={y}
            stroke="#aaa"
            strokeWidth={thickness}
            opacity={0.7}
          />
        );
      })}

      {/* String labels (left side) */}
      {Array.from({ length: STRING_COUNT }, (_, i) => i + 1).map((s) => (
        <text
          key={`label-${s}`}
          x={NECK_X - 12}
          y={stringY(s) + 4}
          textAnchor="middle"
          fontSize={11}
          fill={mutedStrings.has(s) ? '#ef4444' : '#888'}
          fontFamily="system-ui, sans-serif"
          fontWeight={500}
        >
          {mutedStrings.has(s) ? 'X' : STRING_LABELS[s - 1]}
        </text>
      ))}

      {/* Finger placements - glowing numbered circles */}
      {placements.map((p, i) => {
        const cx = fingerX(p.fret);
        const cy = stringY(p.string);
        const color = FINGER_COLORS[p.finger] ?? '#8b5cf6';
        const isOpen = p.fret === 0;

        if (isOpen) {
          // Open string: hollow circle at nut
          return (
            <circle
              key={`finger-${i}`}
              cx={NECK_X - 14}
              cy={cy}
              r={7}
              fill="none"
              stroke="#1DB954"
              strokeWidth={2}
              opacity={0.9}
            />
          );
        }

        return (
          <g key={`finger-${i}`} filter="url(#finger-glow)">
            {/* Glow background */}
            <circle cx={cx} cy={cy} r={12} fill={color} opacity={0.25} />
            {/* Solid finger dot */}
            <circle cx={cx} cy={cy} r={9} fill={color} stroke="#fff" strokeWidth={1.5} />
            {/* Finger number */}
            <text
              x={cx}
              y={cy + 4}
              textAnchor="middle"
              fontSize={11}
              fill="white"
              fontWeight={700}
              fontFamily="system-ui, sans-serif"
            >
              {p.finger}
            </text>
          </g>
        );
      })}

      {/* Chord name badge (top-right of neck) */}
      {viewMode === 'chord' && activeEvent?.chord && (
        <g>
          <rect
            x={SVG_WIDTH - PADDING_RIGHT - 60}
            y={2}
            width={56}
            height={20}
            rx={4}
            fill="#7c3aed"
            opacity={0.9}
          />
          <text
            x={SVG_WIDTH - PADDING_RIGHT - 32}
            y={16}
            textAnchor="middle"
            fontSize={12}
            fill="white"
            fontWeight={700}
            fontFamily="system-ui, sans-serif"
          >
            {activeEvent.chord.symbol}
          </text>
        </g>
      )}
    </svg>
  );
}
