import { useEffect, useRef, useCallback } from 'react';
import { FretboardPanel } from './components/fretboard/FretboardPanel';
import { SpotifyLoginButton } from './components/spotify/SpotifyLoginButton';
import { SpotifySearch } from './components/spotify/SpotifySearch';
import { SpotifyNowPlaying } from './components/spotify/SpotifyNowPlaying';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { useAppStore } from './store/useAppStore';
import { useSpotifyStore } from './store/useSpotifyStore';
import { isAuthenticated as checkAuth, getAccessToken } from './services/SpotifyAuth';
import { getCurrentUser } from './services/SpotifyService';
import {
  initializePlayer,
  onPlayerStateChange,
  onDeviceReady,
  onPlayerError,
} from './services/SpotifyPlayer';
import { transcribeSpotifyTrack } from './services/spotifyTranscriber';
import { SettingsModal } from './components/ui/SettingsModal';
import { useSettingsStore } from './store/useSettingsStore';

function App() {
  const { song, loadSong, tick } = useAppStore();
  const {
    isAuthenticated: isSpotifyAuth,
    currentTrack,
    error: spotifyError,
    setAuthenticated,
    setUser,
    setDeviceId,
    setPlayerReady,
    updatePlaybackState,
    setError: setSpotifyError,
  } = useSpotifyStore();

  const { setSettingsOpen } = useSettingsStore();

  const isTranscribingRef = useRef(false);
  const lastTranscribedTrackRef = useRef<string | null>(null);

  // Check if already authenticated on mount
  useEffect(() => {
    if (checkAuth() && getAccessToken()) {
      setAuthenticated(true);
      getCurrentUser()
        .then((user) => setUser(user))
        .catch(console.error);
    }
  }, [setAuthenticated, setUser]);

  // Initialize Spotify player when authenticated
  useEffect(() => {
    if (!isSpotifyAuth) return;

    initializePlayer().catch(console.error);

    onDeviceReady((deviceId) => {
      setDeviceId(deviceId);
      setPlayerReady(true);
    });

    onPlayerStateChange((state) => {
      updatePlaybackState(state);
      tick(state.positionMs / 1000);
    });

    onPlayerError((message) => {
      setSpotifyError(message);
    });
  }, [isSpotifyAuth, setDeviceId, setPlayerReady, updatePlaybackState, setSpotifyError, tick]);

  // Transcribe track on selection
  const handleTranscribe = useCallback(async (track: typeof currentTrack) => {
    if (!track || isTranscribingRef.current || lastTranscribedTrackRef.current === track.id) return;
    isTranscribingRef.current = true;
    lastTranscribedTrackRef.current = track.id;

    try {
      const transcribedSong = await transcribeSpotifyTrack(
        track.id,
        track.name,
        track.artists.map((a) => a.name).join(', '),
        track.duration_ms,
        track.uri,
      );
      loadSong(transcribedSong);
    } catch (err) {
      console.error('Transcription failed:', err);
      setSpotifyError('Failed to generate tabs for this track');
    } finally {
      isTranscribingRef.current = false;
    }
  }, [loadSong, setSpotifyError]);

  useEffect(() => {
    handleTranscribe(currentTrack);
  }, [currentTrack, handleTranscribe]);

  return (
    <>
      <SettingsModal />
      <ErrorBoundary label="App">
        <div className="min-h-screen bg-gray-950 text-gray-200">
          {/* Header */}
          <header className="border-b border-gray-800/50 px-6 py-4">
            <div className="mx-auto flex max-w-5xl items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-600 text-sm font-bold text-white">
                  GT
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white">Guitar Tabs</h1>
                  <p className="text-xs text-gray-500">Spotify to Tabs & Chords</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setSettingsOpen(true)}
                  className="text-gray-400 hover:text-white transition-colors p-2 rounded-full hover:bg-gray-800"
                  title="Settings"
                  aria-label="Settings"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
                <SpotifyLoginButton />
              </div>
            </div>
          </header>

          {/* Main content */}
          <main className="mx-auto max-w-5xl px-6 py-8">
            <div className="space-y-6">
              {/* Error banner */}
              {spotifyError && (
                <div className="spotify-error">
                  <span>{spotifyError}</span>
                  <button className="spotify-error-dismiss" onClick={() => setSpotifyError(null)}>
                    X
                  </button>
                </div>
              )}

              {/* Spotify Search */}
              {isSpotifyAuth && (
                <section>
                  <h2 className="mb-3 text-sm font-medium text-gray-500">Search a Song</h2>
                  <ErrorBoundary label="Search">
                    <SpotifySearch />
                  </ErrorBoundary>
                </section>
              )}

              {/* Now Playing */}
              {isSpotifyAuth && currentTrack && (
                <section>
                  <ErrorBoundary label="Now Playing">
                    <SpotifyNowPlaying />
                  </ErrorBoundary>
                </section>
              )}

              {/* Fretboard + Sheet */}
              {song && (
                <>
                  <section>
                    <h2 className="mb-3 text-sm font-medium text-gray-500">Fretboard</h2>
                    <FretboardPanel />
                  </section>

                  {/* Info panel */}
                  <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <InfoCard label="Tuning" value={song.tuning.join(' ')} />
                    <InfoCard label="BPM" value={String(song.bpm)} />
                    <InfoCard label="Confidence" value={`${(song.metadata.confidence * 100).toFixed(0)}%`} />
                    <InfoCard label="Engine" value={song.metadata.transcriptionEngine} />
                  </section>
                </>
              )}

              {/* Login prompt when not authenticated */}
              {!isSpotifyAuth && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <h2 className="text-xl font-bold text-white mb-2">Spotify Guitar Tabs</h2>
                  <p className="text-gray-400 mb-6 max-w-md">
                    Connect your Spotify account to search any song and instantly generate
                    guitar tabs and chord sheets.
                  </p>
                  <SpotifyLoginButton />
                </div>
              )}
            </div>
          </main>
        </div>
      </ErrorBoundary>
    </>
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
