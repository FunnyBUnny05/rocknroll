/**
 * SongSheet — Full-song scrollable sheet display.
 *
 * Two view modes:
 *   TAB VIEW:   Standard 6-line staff with fret numbers, grouped into bars
 *   CHORD VIEW: Songbook-style layout with chord symbols in a bar grid
 *
 * Auto-scrolls so the current bar is always visible near the top.
 */

import { useEffect, useRef, useMemo } from 'react';
import type { SongEvent } from '../../types/song';

interface SongSheetProps {
  events: SongEvent[];
  activeEvent: SongEvent | null;
  viewMode: 'chord' | 'tab';
  lyricsAligned?: { time: number; text: string }[];
}

const STRING_LABELS = ['e', 'B', 'G', 'D', 'A', 'E'];
const BARS_PER_ROW = 4;

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Group events into bars (clusters of ~4 beats / adjacent events) */
function groupIntoBars(events: SongEvent[], beatsPerBar = 4): SongEvent[][] {
  if (events.length === 0) return [];
  const bars: SongEvent[][] = [];
  let currentBar: SongEvent[] = [];
  let barStart = events[0].time;
  const avgDuration = events.reduce((s, e) => s + e.duration, 0) / events.length;
  const barDuration = avgDuration * beatsPerBar;

  for (const event of events) {
    if (event.time - barStart >= barDuration && currentBar.length > 0) {
      bars.push(currentBar);
      currentBar = [];
      barStart = event.time;
    }
    currentBar.push(event);
  }
  if (currentBar.length > 0) bars.push(currentBar);
  return bars;
}

// --- Chord View ---

function ChordBar({ events, isActive, barIndex }: { events: SongEvent[]; isActive: boolean; barIndex: number }) {
  const chordSymbols = events
    .filter(e => e.chord)
    .map(e => e.chord!.symbol);
  const unique = [...new Set(chordSymbols)];
  const display = unique.length > 0 ? unique.join(' - ') : '...';

  return (
    <div
      className={`flex-1 min-w-0 border-r border-gray-800 last:border-r-0 px-3 py-2 font-mono text-center ${isActive ? 'bg-green-900/30 text-green-300' : 'text-gray-400'
        }`}
    >
      <div className={`text-lg font-bold ${isActive ? 'text-green-300' : 'text-gray-300'}`}>
        {display}
      </div>
      <div className="text-[10px] text-gray-600 mt-0.5">
        {barIndex + 1}
      </div>
    </div>
  );
}

function ChordView({ bars, activeBarIndex }: { bars: SongEvent[][]; activeBarIndex: number }) {
  const rows: SongEvent[][][] = [];
  for (let i = 0; i < bars.length; i += BARS_PER_ROW) {
    rows.push(bars.slice(i, i + BARS_PER_ROW));
  }

  return (
    <div className="space-y-1">
      {rows.map((row, rowIdx) => (
        <div key={rowIdx} className="flex border border-gray-800 rounded-md overflow-hidden">
          {row.map((bar, colIdx) => {
            const barIdx = rowIdx * BARS_PER_ROW + colIdx;
            return (
              <ChordBar
                key={barIdx}
                events={bar}
                isActive={barIdx === activeBarIndex}
                barIndex={barIdx}
              />
            );
          })}
          {/* Fill empty slots in last row */}
          {row.length < BARS_PER_ROW &&
            Array.from({ length: BARS_PER_ROW - row.length }).map((_, i) => (
              <div key={`empty-${i}`} className="flex-1 border-r border-gray-800 last:border-r-0 px-3 py-2" />
            ))}
        </div>
      ))}
    </div>
  );
}

// --- Tab View ---

function TabBar({ events, isActive, barIndex }: { events: SongEvent[]; isActive: boolean; barIndex: number }) {
  // Build a 6-string tab representation for this bar
  const strings: string[][] = Array.from({ length: 6 }, () => []);

  for (const event of events) {
    const notes = event.notes ?? event.chord?.placements.map(p => ({ string: p.string, fret: p.fret })) ?? [];
    const fretsByString = new Map<number, number>();
    for (const n of notes) {
      fretsByString.set(n.string, n.fret);
    }
    for (let s = 1; s <= 6; s++) {
      if (fretsByString.has(s)) {
        const fret = fretsByString.get(s)!;
        strings[s - 1].push(fret < 10 ? `${fret}` : `${fret}`);
      } else {
        strings[s - 1].push('-');
      }
    }
  }

  // Pad to at least 4 columns
  const minCols = 4;
  for (const row of strings) {
    while (row.length < minCols) row.push('-');
  }

  return (
    <div
      className={`rounded-md border px-3 py-2 font-mono text-xs ${isActive
          ? 'border-green-600 bg-green-900/20'
          : 'border-gray-800 bg-gray-950/50'
        }`}
    >
      <div className="flex items-start gap-0.5 text-[10px] text-gray-500 mb-0.5">
        <span className="w-3" />
        <span>Bar {barIndex + 1}</span>
      </div>
      {strings.map((row, s) => (
        <div key={s} className="flex items-center gap-0">
          <span className={`w-3 text-right mr-1 ${isActive ? 'text-green-500' : 'text-gray-600'}`}>
            {STRING_LABELS[s]}
          </span>
          <span className="text-gray-700">|</span>
          {row.map((fret, col) => (
            <span
              key={col}
              className={`w-4 text-center ${fret !== '-'
                  ? isActive ? 'text-green-300 font-bold' : 'text-gray-300'
                  : 'text-gray-700'
                }`}
            >
              {fret}
            </span>
          ))}
          <span className="text-gray-700">|</span>
        </div>
      ))}
    </div>
  );
}

function TabView({ bars, activeBarIndex }: { bars: SongEvent[][]; activeBarIndex: number }) {
  const rows: SongEvent[][][] = [];
  for (let i = 0; i < bars.length; i += BARS_PER_ROW) {
    rows.push(bars.slice(i, i + BARS_PER_ROW));
  }

  return (
    <div className="space-y-2">
      {rows.map((row, rowIdx) => (
        <div key={rowIdx} className="grid gap-2" style={{ gridTemplateColumns: `repeat(${BARS_PER_ROW}, 1fr)` }}>
          {row.map((bar, colIdx) => {
            const barIdx = rowIdx * BARS_PER_ROW + colIdx;
            return (
              <TabBar key={barIdx} events={bar} isActive={barIdx === activeBarIndex} barIndex={barIdx} />
            );
          })}
        </div>
      ))}
    </div>
  );
}

// --- Main SongSheet ---

export function SongSheet({ events, activeEvent, viewMode, lyricsAligned }: SongSheetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRowRef = useRef<HTMLDivElement>(null);

  const bars = useMemo(() => groupIntoBars(events), [events]);

  // Find active bar index
  const activeBarIndex = useMemo(() => {
    if (!activeEvent) return -1;
    for (let i = 0; i < bars.length; i++) {
      for (const evt of bars[i]) {
        if (evt.time === activeEvent.time && evt.type === activeEvent.type) {
          return i;
        }
      }
    }
    return -1;
  }, [bars, activeEvent]);

  // Auto-scroll active row to top of view
  useEffect(() => {
    if (activeBarIndex < 0 || !containerRef.current) return;
    const rowIndex = Math.floor(activeBarIndex / BARS_PER_ROW);
    const rows = containerRef.current.children;
    const targetRow = rows[rowIndex] as HTMLElement | undefined;
    if (targetRow) {
      targetRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeBarIndex]);

  // Active Lyric calculation based on activeEvent time
  const activeLyricIndex = useMemo(() => {
    if (!lyricsAligned || !activeEvent) return -1;
    let closestIndex = -1;
    let closestDiff = Infinity;
    for (let i = 0; i < lyricsAligned.length; i++) {
      const diff = activeEvent.time - lyricsAligned[i].time;
      if (diff >= 0 && diff < closestDiff) {
        closestDiff = diff;
        closestIndex = i;
      }
    }
    return closestIndex;
  }, [lyricsAligned, activeEvent]);

  if (events.length === 0) return null;

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      {/* Event/Chord Sheet */}
      <div className="flex-1 rounded-xl border border-gray-800 bg-gray-900/60 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-400">
            {viewMode === 'chord' ? 'Chord Sheet' : 'Tablature'}
          </h3>
          <div className="flex items-center gap-3 text-xs text-gray-600">
            <span>{bars.length} bars</span>
            <span>{formatTime(events[events.length - 1]?.time ?? 0)}</span>
          </div>
        </div>
        <div
          ref={containerRef}
          className="max-h-80 overflow-y-auto pr-2"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#333 transparent' }}
        >
          <div ref={activeRowRef}>
            {viewMode === 'chord' ? (
              <ChordView bars={bars} activeBarIndex={activeBarIndex} />
            ) : (
              <TabView bars={bars} activeBarIndex={activeBarIndex} />
            )}
          </div>
        </div>
      </div>

      {/* Lyrics sheet if present */}
      {lyricsAligned && lyricsAligned.length > 0 && (
        <div className="lg:w-1/3 rounded-xl border border-gray-800 bg-gray-900/60 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-400">Lyrics</h3>
          </div>
          <div className="max-h-80 overflow-y-auto space-y-2 pr-2" style={{ scrollbarWidth: 'thin', scrollbarColor: '#333 transparent' }}>
            {lyricsAligned.map((lyric, idx) => {
              const isActive = idx === activeLyricIndex;
              return (
                <div
                  key={idx}
                  className={`text-sm py-1 px-2 rounded-md ${isActive ? 'bg-green-900/50 text-green-300 font-bold' : 'text-gray-400'}`}
                >
                  {lyric.text}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
