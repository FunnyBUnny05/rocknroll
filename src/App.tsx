import { useEffect, useRef, useCallback, useState } from 'react';
import { SpotifyLoginButton } from './components/spotify/SpotifyLoginButton';
import { SpotifySearch } from './components/spotify/SpotifySearch';
import { SpotifyNowPlaying } from './components/spotify/SpotifyNowPlaying';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { useAppStore } from './store/useAppStore';
import { useSpotifyStore } from './store/useSpotifyStore';
import { isAuthenticated as checkAuth, getAccessToken } from './services/SpotifyAuth';
import { getCurrentUser } from './services/SpotifyService';
import { transcribeSpotifyTrack } from './services/spotifyTranscriber';
import { SettingsModal } from './components/ui/SettingsModal';
import { useSettingsStore } from './store/useSettingsStore';
import { SheetView } from './components/ui/SheetView';
import { SheetControls } from './components/ui/SheetControls';

function App() {
  const { song, loadSong, viewMode } = useAppStore();
  const {
    isAuthenticated: isSpotifyAuth,
    currentTrack,
    error: spotifyError,
    setAuthenticated,
    setUser,
    setError: setSpotifyError,
  } = useSpotifyStore();

  const { setSettingsOpen } = useSettingsStore();

  const isTranscribingRef = useRef(false);
  const [loadingState, setLoadingState] = useState<'idle' | 'generating'>('idle');
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

  // Transcribe track on selection or when viewMode changes
  const handleTranscribe = useCallback(async (track: typeof currentTrack, mode: typeof viewMode) => {
    // We only skip if the exact track AND mode are already transcribed
    const isSameTrackAndMode = lastTranscribedTrackRef.current === `${track?.id}-${mode}`;
    if (!track || isTranscribingRef.current || isSameTrackAndMode) return;
    isTranscribingRef.current = true;
    setLoadingState('generating');
    lastTranscribedTrackRef.current = `${track.id}-${mode}`;

    try {
      const transcribedSong = await transcribeSpotifyTrack(
        track.id,
        track.name,
        track.artists.map((a) => a.name).join(', '),
        track.uri,
        mode
      );
      loadSong(transcribedSong);
    } catch (err) {
      console.error('Transcription failed:', err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      setSpotifyError(`Failed to generate sheet: ${message}`);
    } finally {
      isTranscribingRef.current = false;
      setLoadingState('idle');
    }
  }, [loadSong, setSpotifyError]);

  useEffect(() => {
    handleTranscribe(currentTrack, viewMode);
  }, [currentTrack, viewMode, handleTranscribe]);

  return (
    <>
      <SettingsModal />
      <ErrorBoundary label="App">
        <div className="flex min-h-screen bg-gray-900 text-gray-200">

          {/* LEFT SIDEBAR (Controls & Search) */}
          <aside className="w-[340px] flex-shrink-0 border-r border-gray-800 bg-gray-950 flex flex-col h-screen overflow-y-auto">
            {/* Header */}
            <div className="p-6 border-b border-gray-800/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white shadow-lg shadow-indigo-500/20">
                  GS
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white tracking-tight">Guitar Sheet</h1>
                  <p className="text-xs text-gray-500 font-medium tracking-wide uppercase">AI Generator</p>
                </div>
              </div>
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
            </div>

            {/* Sidebar Content */}
            <div className="flex-1 p-6 space-y-6">
              {!isSpotifyAuth ? (
                <div className="text-center bg-gray-900/50 p-6 rounded-xl border border-gray-800">
                  <h2 className="text-sm font-bold text-white mb-2">Connect Spotify</h2>
                  <p className="text-xs text-gray-400 mb-4">
                    Search millions of songs and instantly transform them into printable chord and tab sheets.
                  </p>
                  <SpotifyLoginButton />
                </div>
              ) : (
                <>
                  <section>
                    <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">Search Song</h2>
                    <ErrorBoundary label="Search">
                      <SpotifySearch />
                    </ErrorBoundary>
                  </section>

                  {currentTrack && (
                    <section>
                      <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">Selected</h2>
                      <ErrorBoundary label="Selected Track Info">
                        <SpotifyNowPlaying />
                      </ErrorBoundary>
                    </section>
                  )}
                </>
              )}

              {spotifyError && (
                <div className="bg-red-900/20 border border-red-800/50 rounded-lg p-3 relative text-sm text-red-400">
                  <span>{spotifyError}</span>
                  <button className="absolute top-1 right-2 text-red-500 hover:text-red-300" onClick={() => setSpotifyError(null)}>
                    ×
                  </button>
                </div>
              )}
            </div>
          </aside>

          {/* RIGHT MAIN AREA (Sheet Viewer) */}
          <main className="flex-1 flex flex-col h-screen overflow-hidden bg-[#eef0f4] relative">

            {/* Context/Toolbar Header */}
            <div className="h-16 bg-white border-b border-gray-200 flex items-center px-8 shadow-sm justify-between z-10 shrink-0">
              {song && <SheetControls />}
              {!song && <div className="text-gray-400 text-sm font-medium">No sheet generated yet.</div>}
            </div>

            {/* Canvas Area (Scrollable) */}
            <div className="flex-1 overflow-y-auto w-full p-8 md:p-12 pb-32 flex justify-center content-start">

              {loadingState === 'generating' && (
                <div className="m-auto flex flex-col items-center justify-center p-12 bg-white rounded-2xl shadow-xl border border-gray-100 max-w-sm w-full animate-in fade-in duration-500 zoom-in-95">
                  <div className="mb-6 relative">
                    <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-20 rounded-full animate-pulse"></div>
                    <div className="relative h-12 w-12 rounded-full border-4 border-solid border-indigo-100 border-t-indigo-600 animate-spin"></div>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">Writing Sheet Music</h3>
                  <p className="text-sm text-gray-500 text-center">
                    DeepSeek AI is analyzing the audio structure and arranging the chords...
                  </p>
                </div>
              )}

              {loadingState === 'idle' && !song && (
                <div className="m-auto text-center max-w-md">
                  <div className="w-20 h-20 bg-white shadow-md rounded-2xl mx-auto mb-6 flex items-center justify-center -rotate-3 border border-gray-200">
                    <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path></svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">Ready to Transcribe</h2>
                  <p className="text-gray-500">Pick a song from the sidebar to automatically generate a beautiful, printable sheet.</p>
                </div>
              )}

              {loadingState === 'idle' && song && (
                <SheetView />
              )}
            </div>

          </main>

        </div>
      </ErrorBoundary>
    </>
  );
}

export default App;
