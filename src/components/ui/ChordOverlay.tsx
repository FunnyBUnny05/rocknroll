import type { ChordShape } from '../../types/song';

/**
 * ChordOverlay - Displays a chord diagram in "Beginner" friendly format.
 * Shows chord name, finger positions, and muted strings.
 */
export function ChordOverlay({ chord }: { chord: ChordShape }) {
  const strings = [6, 5, 4, 3, 2, 1];
  const maxFret = Math.max(...chord.placements.map((p) => p.fret), 3);
  const minFret = Math.min(...chord.placements.filter((p) => p.fret > 0).map((p) => p.fret));
  const startFret = minFret <= 3 ? 1 : minFret;
  const fretRange = Array.from(
    { length: Math.min(maxFret - startFret + 1, 5) },
    (_, i) => startFret + i
  );

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-4 backdrop-blur-sm">
      <div className="mb-3 text-center">
        <span className="text-2xl font-bold text-violet-400">
          {chord.symbol}
        </span>
        <span className="ml-2 text-sm text-gray-500">{chord.name}</span>
      </div>

      {/* Chord grid */}
      <div className="flex justify-center">
        <div className="inline-grid gap-0" style={{ gridTemplateColumns: `repeat(${fretRange.length + 1}, 2rem)` }}>
          {/* Header: string indicators */}
          {strings.map((s) => (
            <div
              key={`header-${s}`}
              className="flex h-8 items-center justify-center text-xs text-gray-500"
            >
              {chord.mutedStrings.includes(s) ? 'X' : 'O'}
            </div>
          ))}
          <div /> {/* Empty corner */}

          {/* Fret rows */}
          {fretRange.map((fret) => (
            <div key={`row-${fret}`} className="contents">
              {strings.map((s) => {
                const placement = chord.placements.find(
                  (p) => p.string === s && p.fret === fret
                );
                return (
                  <div
                    key={`${s}-${fret}`}
                    className="flex h-8 items-center justify-center border-b border-r border-gray-700"
                  >
                    {placement && (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-500 text-xs font-bold text-white shadow-lg shadow-violet-500/30">
                        {placement.finger || ''}
                      </div>
                    )}
                  </div>
                );
              })}
              <div className="flex h-8 items-center pl-2 text-xs text-gray-600">
                {fret}
              </div>
            </div>
          ))}
        </div>
      </div>

      {chord.barreFret && (
        <div className="mt-2 text-center text-xs text-gray-500">
          Barre at fret {chord.barreFret}
        </div>
      )}
    </div>
  );
}
