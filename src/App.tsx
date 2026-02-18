import { useEffect, useState, useCallback } from 'react';
import { GhostFretboard } from './components/fretboard/GhostFretboard';
import { PlaybackControls } from './components/player/PlaybackControls';
import { FileUpload } from './components/ui/FileUpload';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { useGhostStore } from './store/useGhostStore';
import { transcribeAudio } from './services/transcriptionPipeline';
import { audioEngine } from './engine/audioEngine';
import type { TranscriptionProgress } from './services/basicPitchTranscriber';

function App() {
  const { song, loadSong } = useGhostStore();
  const [progress, setProgress] = useState<TranscriptionProgress | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('[GhostGuitar] App mounted - initializing');
  }, []);

  // Load demo song on mount
  useEffect(() => {
    console.log('[GhostGuitar] Loading demo song...');
    transcribeAudio('demo').then((demoSong) => {
      console.log('[GhostGuitar] Demo song loaded:', demoSong.title);
      loadSong(demoSong);
    });
  }, [loadSong]);

  const handleFileSelected = useCallback(
    async (file: File) => {
      setIsTranscribing(true);
      setError(null);
      setProgress({ percent: 0, stage: 'loading' });

      console.log('[GhostGuitar] File selected:', file.name, `(${(file.size / 1024 / 1024).toFixed(1)}MB)`);

      try {
        // Dynamic import - only loads TF.js + Basic Pitch when user drops a file
        const { transcribeWithBasicPitch } = await import(
          './services/basicPitchTranscriber'
        );

        const transcribedSong = await transcribeWithBasicPitch(file, setProgress);
        console.log('[GhostGuitar] Transcription complete:', transcribedSong.tracks.professional.events.length, 'events');

        // Load the actual audio into the playback engine
        await audioEngine.load(file);
        console.log('[GhostGuitar] Audio engine loaded, duration:', audioEngine.duration.toFixed(1) + 's');

        // Update duration from actual audio
        transcribedSong.duration = audioEngine.duration;

        loadSong(transcribedSong);
      } catch (err) {
        console.error('[GhostGuitar] Transcription failed:', err);
        setError(
          err instanceof Error ? err.message : 'Transcription failed'
        );
      } finally {
        setIsTranscribing(false);
      }
    },
    [loadSong]
  );

  return (
    <ErrorBoundary label="GhostGuitar App">
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
            <div className="text-xs text-gray-600">v0.2.0</div>
          </div>
        </header>

        {/* Main content */}
        <main className="mx-auto max-w-5xl px-6 py-8">
          <div className="space-y-6">
            {/* File upload */}
            <section>
              <h2 className="mb-3 text-sm font-medium text-gray-500">
                Load a Song
              </h2>
              <ErrorBoundary label="File Upload">
                <FileUpload
                  onFileSelected={handleFileSelected}
                  progress={progress}
                  isTranscribing={isTranscribing}
                />
              </ErrorBoundary>
              {error && (
                <div className="mt-2 rounded-md bg-red-900/30 px-3 py-2 text-sm text-red-400">
                  {error}
                </div>
              )}
            </section>

            {/* Fretboard visualization */}
            {song && (
              <>
                <section>
                  <h2 className="mb-3 text-sm font-medium text-gray-500">
                    Fretboard Visualization
                  </h2>
                  <GhostFretboard />
                </section>

                {/* Playback controls */}
                <section>
                  <ErrorBoundary label="Playback Controls">
                    <PlaybackControls />
                  </ErrorBoundary>
                </section>

                {/* Info panel */}
                <section className="grid grid-cols-4 gap-4">
                  <InfoCard label="Tuning" value={song.tuning.join(' ')} />
                  <InfoCard label="BPM" value={String(song.bpm)} />
                  <InfoCard
                    label="Confidence"
                    value={`${(song.metadata.confidence * 100).toFixed(0)}%`}
                  />
                  <InfoCard label="Engine" value={song.metadata.transcriptionEngine} />
                </section>
              </>
            )}
          </div>
        </main>
      </div>
    </ErrorBoundary>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/40 p-3 text-center">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 truncate text-sm font-medium text-white">{value}</div>
    </div>
  );
}

export default App;
