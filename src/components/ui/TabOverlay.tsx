import type { TabNote } from '../../types/song';

const STRING_LABELS = ['e', 'B', 'G', 'D', 'A', 'E'];

/**
 * TabOverlay - Displays tablature notation for "Professional" mode.
 * Shows standard 6-line tab format with fret numbers.
 */
export function TabOverlay({ notes }: { notes: TabNote[] }) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-4 font-mono backdrop-blur-sm">
      <div className="mb-2 text-xs font-medium text-gray-500">TAB</div>
      <div className="space-y-0.5">
        {[1, 2, 3, 4, 5, 6].map((stringNum) => {
          const stringNotes = notes.filter((n) => n.string === stringNum);
          const fretDisplay = stringNotes.length > 0
            ? stringNotes.map((n) => n.fret).join('--')
            : '---';

          return (
            <div
              key={stringNum}
              className="flex items-center gap-2"
            >
              <span className="w-4 text-right text-xs text-violet-400">
                {STRING_LABELS[stringNum - 1]}
              </span>
              <span className="text-gray-400">|</span>
              <span className="text-sm text-white">{fretDisplay}</span>
              <span className="text-gray-400">
                {'---'.repeat(3)}
              </span>
              <span className="text-gray-400">|</span>
              {stringNotes.map((n, i) =>
                n.technique && n.technique !== 'normal' ? (
                  <span
                    key={i}
                    className="ml-1 rounded bg-violet-900/50 px-1.5 py-0.5 text-xs text-violet-300"
                  >
                    {n.technique}
                  </span>
                ) : null
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
