import { useEffect, useState } from 'react';
import { GhostFretboard } from './components/fretboard/GhostFretboard';
import { PlaybackControls } from './components/player/PlaybackControls';
import { SpotifyLoginButton } from './components/spotify/SpotifyLoginButton';
import { SpotifySearch } from './components/spotify/SpotifySearch';
import { SpotifyNowPlaying } from './components/spotify/SpotifyNowPlaying';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { useGhostStore } from './store/useGhostStore';
import { useSpotifyStore } from './store/useSpotifyStore';
import { transcribeAudio } from './services/transcriptionPipeline';
import { isAuthenticated as checkAuth, getAccessToken } from './services/SpotifyAuth';
import { getCurrentUser } from './services/SpotifyService';
import {
  initializePlayer,
  onPlayerStateChange,
  onDeviceReady,
  onPlayerError,
} from './services/SpotifyPlayer';
import {
  generateChordProgression,
  guessProgression,
} from './services/chordDetection';
import type { Song } from './types/song';

function App() {
  const { song, loadSong, tick } = useGhostStore();
  const {
    isAuthenticated: isSpotifyAuth,
    currentTrack,
    isSpotifyPlaying,
    error: spotifyError,
    setAuthenticated,
    setUser,
    setDeviceId,
    setPlayerReady,
    updatePlaybackState,
    setError: setSpotifyError,
  } = useSpotifyStore();

  const [demoLoaded, setDemoLoaded] = useState(false);

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
      // Sync Spotify position with GhostStore for fretboard animation
      tick(state.positionMs / 1000);
    });

    onPlayerError((message) => {
      setSpotifyError(message);
    });
  }, [isSpotifyAuth, setDeviceId, setPlayerReady, updatePlaybackState, setSpotifyError, tick]);

  // When a Spotify track starts playing, generate chord events for the ghost hand
  useEffect(() => {
    if (!currentTrack || !isSpotifyPlaying) return;

    const progression = guessProgression(
      currentTrack.name,
      currentTrack.artists.map((a) => a.name).join(', ')
    );
    const events = generateChordProgression(
      currentTrack.duration_ms,
      4,
      120,
      progression
    );

    const spotifySong: Song = {
      id: `spotify-${currentTrack.id}`,
      title: currentTrack.name,
      artist: currentTrack.artists.map((a) => a.name).join(', '),
      duration: currentTrack.duration_ms / 1000,
      bpm: 120,
      timeSignature: [4, 4],
      audioSrc: currentTrack.uri,
      tuning: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'],
      capo: 0,
      tracks: {
        beginner: { events, tempoMultiplier: 0.75 },
        professional: { events, tempoMultiplier: 1.0 },
      },
      metadata: {
        confidence: 0.7,
        transcriptionEngine: 'spotify-chords',
        transcribedAt: new Date().toISOString(),
      },
    };

    loadSong(spotifySong);
  }, [currentTrack, isSpotifyPlaying, loadSong]);

  // Load demo song on mount (only if not using Spotify)
  useEffect(() => {
    if (isSpotifyAuth || demoLoaded) return;
    let cancelled = false;

    transcribeAudio('demo').then((demoSong) => {
      if (!cancelled) {
        console.log('[GhostGuitar] Demo song loaded:', demoSong.title);
        loadSong(demoSong);
        setDemoLoaded(true);
      }
    });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSpotifyAuth]);

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
            <div className="flex items-center gap-4">
              <SpotifyLoginButton />
              <div className="text-xs text-gray-600">v0.3.0</div>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="mx-auto max-w-5xl px-6 py-8">
          <div className="space-y-6">
            {/* Spotify Error */}
            {spotifyError && (
              <div className="spotify-error">
                <span>⚠ {spotifyError}</span>
                <button
                  className="spotify-error-dismiss"
                  onClick={() => setSpotifyError(null)}
                >
                  ✕
                </button>
              </div>
            )}

            {/* Spotify Search (when authenticated) */}
            {isSpotifyAuth && (
              <section>
                <h2 className="mb-3 text-sm font-medium text-gray-500">
                  Search Spotify
                </h2>
                <ErrorBoundary label="Spotify Search">
                  <SpotifySearch />
                </ErrorBoundary>
              </section>
            )}

            {/* Now Playing (when a track is selected) */}
            {isSpotifyAuth && currentTrack && (
              <section>
                <ErrorBoundary label="Now Playing">
                  <SpotifyNowPlaying />
                </ErrorBoundary>
              </section>
            )}

            {/* Fretboard visualization */}
            {song && (
              <>
                <section>
                  <h2 className="mb-3 text-sm font-medium text-gray-500">
                    Fretboard Visualization
                  </h2>
                  <GhostFretboard />
                </section>

                {/* Playback controls (only for demo/local audio, not Spotify) */}
                {!currentTrack && (
                  <section>
                    <ErrorBoundary label="Playback Controls">
                      <PlaybackControls />
                    </ErrorBoundary>
                  </section>
                )}

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

            {/* Login prompt when not authenticated */}
            {!isSpotifyAuth && !song && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="text-gray-400 mb-6">
                  Connect your Spotify account to search and play any song
                </p>
                <SpotifyLoginButton />
              </div>
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
