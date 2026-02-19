/**
 * SongSheet - Scrollable song tabs/chords display below the fretboard.
 *
 * Shows the full song's chord/tab events in a readable sheet format.
 * The currently active event (based on Spotify playback position)
 * is highlighted in real-time and auto-scrolled into view.
 */

import { useEffect, useRef } from 'react';
import type { SongEvent } from '../../types/song';

interface SongSheetProps {
  events: SongEvent[];
  activeEvent: SongEvent | null;
  currentTime: number;
}

const STRING_LABELS = ['e', 'B', 'G', 'D', 'A', 'E'];

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function ChordCell({ event, isActive }: { event: SongEvent; isActive: boolean }) {
  if (event.type === 'chord' && event.chord) {
    return (
      <div
        className={`flex flex-col items-center gap-1 rounded-lg border px-4 py-2 transition-all ${
          isActive
            ? 'border-violet-500 bg-violet-500/15 shadow-lg shadow-violet-500/20'
            : 'border-gray-800 bg-gray-900/40'
        }`}
      >
        <span
          className={`text-lg font-bold ${isActive ? 'text-violet-300' : 'text-gray-400'}`}
        >
          {event.chord.symbol}
        </span>
        <span className="text-[10px] text-gray-600">{formatTime(event.time)}</span>
      </div>
    );
  }

  // Tab event - show mini tab notation
  if (event.type === 'tab' && event.notes) {
    return (
      <div
        className={`rounded-lg border px-3 py-1.5 font-mono text-[10px] transition-all ${
          isActive
            ? 'border-violet-500 bg-violet-500/15 shadow-lg shadow-violet-500/20'
            : 'border-gray-800 bg-gray-900/40'
        }`}
      >
        {[1, 2, 3, 4, 5, 6].map((s) => {
          const note = event.notes!.find((n) => n.string === s);
          return (
            <div key={s} className="flex gap-1">
              <span className={`w-3 ${isActive ? 'text-violet-400' : 'text-gray-600'}`}>
                {STRING_LABELS[s - 1]}
              </span>
              <span className={isActive ? 'text-white' : 'text-gray-500'}>
                {note ? note.fret : '-'}
              </span>
            </div>
          );
        })}
        <span className="mt-0.5 block text-gray-600">{formatTime(event.time)}</span>
      </div>
    );
  }

  return null;
}

export function SongSheet({ events, activeEvent, currentTime }: SongSheetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to keep the active event visible
  useEffect(() => {
    if (activeRef.current && containerRef.current) {
      activeRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [activeEvent, currentTime]);

  if (events.length === 0) return null;

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4 backdrop-blur-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-400">Song Sheet</h3>
        <span className="text-xs text-gray-600">
          {events.length} changes
        </span>
      </div>
      <div
        ref={containerRef}
        className="flex gap-2 overflow-x-auto pb-2"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#333 transparent' }}
      >
        {events.map((event, i) => {
          const isActive =
            activeEvent !== null &&
            event.time === activeEvent.time &&
            event.type === activeEvent.type;
          return (
            <div
              key={`${event.type}-${event.time}-${i}`}
              ref={isActive ? activeRef : undefined}
              className="flex-shrink-0"
            >
              <ChordCell event={event} isActive={isActive} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
