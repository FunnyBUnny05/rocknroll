/**
 * Fretboard2D — Static, top-down SVG fretboard visualization.
 *
 * Uses logarithmic (equal temperament) fret spacing.
 * Two modes: Chord (full chord shape) and Tab (individual notes).
 * No animations — notes light up instantly on the current beat.
 */

import { useMemo } from 'react';
import type { SongEvent, FingerPlacement } from '../../types/song';

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

function fretFraction(fretNum: number): number {
  if (fretNum === 0) return 0;
  return 1 - 1 / Math.pow(2, fretNum / 12);
}

function fretX(fretNum: number): number {
  return NECK_X + fretFraction(fretNum) * NECK_W;
}

function stringY(stringNum: number): number {
  const spacing = NECK_H / (STRING_COUNT - 1);
  return NECK_Y + (stringNum - 1) * spacing;
}

function fingerX(fretNum: number): number {
  if (fretNum === 0) return NECK_X - 14;
  return (fretX(fretNum - 1) + fretX(fretNum)) / 2;
}

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
        <linearGradient id="neck-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2a1a0e" />
          <stop offset="100%" stopColor="#1a0f08" />
        </linearGradient>
      </defs>

      {/* Neck body */}
      <rect x={NECK_X} y={NECK_Y - 4} width={NECK_W} height={NECK_H + 8} rx={4} fill="url(#neck-grad)" />

      {/* Fret markers */}
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

      {/* Nut */}
      <rect x={NECK_X - 2} y={NECK_Y - 4} width={4} height={NECK_H + 8} rx={1} fill="#e8e0d0" />

      {/* Fret wires */}
      {fretLines.map(({ x, fret }) => (
        <line key={`fret-${fret}`} x1={x} y1={NECK_Y - 2} x2={x} y2={NECK_Y + NECK_H + 2} stroke="#555" strokeWidth={1.5} opacity={0.6} />
      ))}

      {/* Fret numbers */}
      {fretLines.map(({ fret }) => (
        <text key={`fretnum-${fret}`} x={fingerX(fret)} y={SVG_HEIGHT - 4} textAnchor="middle" fontSize={9} fill="#666" fontFamily="monospace">{fret}</text>
      ))}

      {/* Strings */}
      {Array.from({ length: STRING_COUNT }, (_, i) => i + 1).map((s) => (
        <line key={`string-${s}`} x1={NECK_X} y1={stringY(s)} x2={NECK_X + NECK_W} y2={stringY(s)} stroke="#aaa" strokeWidth={0.8 + (s - 1) * 0.3} opacity={0.7} />
      ))}

      {/* String labels */}
      {Array.from({ length: STRING_COUNT }, (_, i) => i + 1).map((s) => (
        <text key={`label-${s}`} x={NECK_X - 12} y={stringY(s) + 4} textAnchor="middle" fontSize={11} fill={mutedStrings.has(s) ? '#ef4444' : '#888'} fontFamily="monospace" fontWeight={500}>
          {mutedStrings.has(s) ? 'X' : STRING_LABELS[s - 1]}
        </text>
      ))}

      {/* Active placements — instant highlight, no animation */}
      {placements.map((p, i) => {
        const cx = fingerX(p.fret);
        const cy = stringY(p.string);
        const isOpen = p.fret === 0;

        if (isOpen) {
          return <circle key={`finger-${i}`} cx={NECK_X - 14} cy={cy} r={7} fill="none" stroke="#1DB954" strokeWidth={2} />;
        }

        return (
          <g key={`finger-${i}`}>
            <circle cx={cx} cy={cy} r={10} fill="#1DB954" opacity={0.3} />
            <circle cx={cx} cy={cy} r={8} fill="#1DB954" stroke="#fff" strokeWidth={1.5} />
            <text x={cx} y={cy + 4} textAnchor="middle" fontSize={11} fill="white" fontWeight={700} fontFamily="monospace">{p.fret}</text>
          </g>
        );
      })}

      {/* Chord name badge */}
      {viewMode === 'chord' && activeEvent?.chord && (
        <g>
          <rect x={SVG_WIDTH - PADDING_RIGHT - 70} y={2} width={66} height={20} rx={4} fill="#1DB954" />
          <text x={SVG_WIDTH - PADDING_RIGHT - 37} y={16} textAnchor="middle" fontSize={12} fill="white" fontWeight={700} fontFamily="monospace">
            {activeEvent.chord.symbol}
          </text>
        </g>
      )}
    </svg>
  );
}
