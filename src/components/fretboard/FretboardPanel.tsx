/**
 * FretboardPanel — Main visualization container.
 *
 * Renders the 2D SVG fretboard with TAB VIEW / CHORD VIEW toggle,
 * and the SongSheet below for full-song scrollable display.
 */

import { Fretboard2D } from './Fretboard2D';
import { TabRoll } from '../ui/TabRoll';
import { useAppStore } from '../../store/useAppStore';
import type { ViewMode } from '../../store/useAppStore';

export function FretboardPanel() {
  const viewMode = useAppStore((s) => s.viewMode);
  const setViewMode = useAppStore((s) => s.setViewMode);
  const activeEvent = useAppStore((s) => s.activeEvent);
  const song = useAppStore((s) => s.song);
  const mode = useAppStore((s) => s.mode);

  const events = song?.tracks[mode]?.events ?? [];

  return (
    <div className="w-full space-y-4">
      {/* Header: chord info + mode toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {activeEvent?.chord && (
            <span className="text-2xl font-bold text-green-400">
              {activeEvent.chord.symbol}
            </span>
          )}
          {activeEvent?.chord && (
            <span className="text-sm text-gray-500">
              {activeEvent.chord.name}
            </span>
          )}
        </div>
        <div className="flex gap-1 rounded-lg bg-gray-900/80 p-1">
          <ToggleButton label="CHORD VIEW" mode="chord" current={viewMode} onClick={setViewMode} />
          <ToggleButton label="TAB VIEW" mode="tab" current={viewMode} onClick={setViewMode} />
        </div>
      </div>

      {/* 2D Fretboard */}
      <div className="rounded-xl border border-gray-800 bg-gray-950 p-3">
        <Fretboard2D activeEvent={activeEvent} viewMode={viewMode} />
      </div>

      {/* Tab Roll Scroller */}
      {events.length > 0 && (
        <div className="mt-8">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Tab Roll</h3>
          <TabRoll events={events} />
        </div>
      )}
    </div>
  );
}

function ToggleButton({
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
      className={`rounded-md px-4 py-1.5 text-xs font-bold tracking-wide ${isActive
        ? 'bg-green-600 text-white'
        : 'text-gray-400 hover:text-white'
        }`}
    >
      {label}
    </button>
  );
}
