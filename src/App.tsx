import { useEffect } from 'react';
import { GhostFretboard } from './components/fretboard/GhostFretboard';
import { PlaybackControls } from './components/player/PlaybackControls';
import { useGhostStore } from './store/useGhostStore';
import { transcribeAudio } from './services/transcriptionPipeline';

function App() {
  const { song, loadSong } = useGhostStore();

  // Load demo song on mount
  useEffect(() => {
    transcribeAudio('demo').then(loadSong);
  }, [loadSong]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-violet-950">
      {/* Header */}
      <header className="border-b border-gray-800/50 px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-purple-700 text-lg font-bold text-white shadow-lg shadow-violet-500/20">
              G
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">GhostGuitar</h1>
              <p className="text-xs text-gray-500">
                AI-Powered Guitar Learning
              </p>
            </div>
          </div>
          <div className="text-xs text-gray-600">v0.1.0</div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-5xl px-6 py-8">
        {!song ? (
          <div className="flex h-64 items-center justify-center">
            <div className="text-center">
              <div className="mb-2 text-lg text-gray-400">Loading...</div>
              <div className="text-sm text-gray-600">
                Initializing transcription engine
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Fretboard visualization */}
            <section>
              <h2 className="mb-3 text-sm font-medium text-gray-500">
                Fretboard Visualization
              </h2>
              <GhostFretboard />
            </section>

            {/* Playback controls */}
            <section>
              <PlaybackControls />
            </section>

            {/* Info panel */}
            <section className="grid grid-cols-3 gap-4">
              <InfoCard
                label="Tuning"
                value={song.tuning.join(' ')}
              />
              <InfoCard
                label="BPM"
                value={String(song.bpm)}
              />
              <InfoCard
                label="Confidence"
                value={`${(song.metadata.confidence * 100).toFixed(0)}%`}
              />
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/40 p-3 text-center">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 text-sm font-medium text-white">{value}</div>
    </div>
  );
}

export default App;
