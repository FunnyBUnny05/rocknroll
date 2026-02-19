/**
 * GhostFretboard - Main visualization container.
 *
 * Renders the 2D SVG fretboard with mode toggle (Chord / Tab),
 * and the Song Sheet below for a full timeline view.
 * Replaces the old 3D Canvas-based scene.
 */

import { Fretboard2D } from './Fretboard2D';
import { SongSheet } from '../ui/SongSheet';
import { useGhostStore } from '../../store/useGhostStore';
import type { ViewMode } from '../../store/useGhostStore';

export function GhostFretboard() {
  const viewMode = useGhostStore((s) => s.viewMode);
  const setViewMode = useGhostStore((s) => s.setViewMode);
  const activeEvent = useGhostStore((s) => s.activeEvent);
  const song = useGhostStore((s) => s.song);
  const mode = useGhostStore((s) => s.mode);
  const currentTime = useGhostStore((s) => s.currentTime);

  const events = song?.tracks[mode]?.events ?? [];

  return (
    <div className="w-full space-y-4">
      {/* Header: chord info + mode toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {activeEvent?.chord && (
            <span className="text-2xl font-bold text-violet-400">
              {activeEvent.chord.symbol}
            </span>
          )}
          {activeEvent?.chord && (
            <span className="text-sm text-gray-500">
              {activeEvent.chord.name}
            </span>
          )}
        </div>
        <div className="flex gap-1 rounded-lg bg-gray-900/80 p-1 backdrop-blur-sm">
          <ModeButton
            label="Chord"
            mode="chord"
            current={viewMode}
            onClick={setViewMode}
          />
          <ModeButton
            label="Tab"
            mode="tab"
            current={viewMode}
            onClick={setViewMode}
          />
        </div>
      </div>

      {/* 2D Fretboard */}
      <div className="rounded-xl border border-gray-800 bg-gradient-to-b from-gray-900 to-black p-3">
        <Fretboard2D activeEvent={activeEvent} viewMode={viewMode} />
      </div>

      {/* Song Sheet timeline */}
      {events.length > 0 && (
        <SongSheet
          events={events}
          activeEvent={activeEvent}
          currentTime={currentTime}
        />
      )}
    </div>
  );
}

function ModeButton({
  label,
  mode,
  current,
  onClick,
}: {
  label: string;
  mode: ViewMode;
  current: ViewMode;
  onClick: (mode: ViewMode) => void;
}) {
  const isActive = mode === current;
  return (
    <button
      onClick={() => onClick(mode)}
      className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all ${
        isActive
          ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/25'
          : 'text-gray-400 hover:text-white'
      }`}
    >
      {label}
    </button>
  );
}
