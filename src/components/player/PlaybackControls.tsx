import { useCallback, useEffect, useRef } from 'react';
import { useGhostStore } from '../../store/useGhostStore';
import { audioEngine } from '../../engine/audioEngine';

/**
 * PlaybackControls - Transport bar for song playback.
 * Syncs with the Tone.js audio engine for sample-accurate timing.
 */
export function PlaybackControls() {
  const {
    song,
    isPlaying,
    currentTime,
    mode,
    playbackRate,
    play,
    pause,
    stop,
    seek,
    setMode,
    setPlaybackRate,
    tick,
  } = useGhostStore();

  const animationRef = useRef<number>(0);
  const playStartWebAudioTime = useRef<number>(0);
  const playStartOffset = useRef<number>(0);

  // High-precision animation loop driven by Web Audio clock
  const animate = useCallback(() => {
    const elapsed = audioEngine.contextTime - playStartWebAudioTime.current;
    const newTime = playStartOffset.current + elapsed * playbackRate;

    if (song && newTime >= song.duration) {
      audioEngine.stop();
      stop();
      return;
    }

    tick(newTime);
    animationRef.current = requestAnimationFrame(animate);
  }, [playbackRate, song, stop, tick]);

  // Start/stop audio + animation loop when isPlaying changes
  useEffect(() => {
    if (isPlaying && song) {
      playStartWebAudioTime.current = audioEngine.contextTime;
      playStartOffset.current = currentTime;

      if (audioEngine.isLoaded) {
        audioEngine.play(currentTime, playbackRate);
      }

      animationRef.current = requestAnimationFrame(animate);
    } else {
      cancelAnimationFrame(animationRef.current);
      audioEngine.pause();
    }
    return () => cancelAnimationFrame(animationRef.current);
  }, [isPlaying, animate, song, currentTime, playbackRate]);

  // Sync playback rate changes to audio engine
  useEffect(() => {
    audioEngine.setRate(playbackRate);
  }, [playbackRate]);

  const handleSeek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!song) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const pct = (e.clientX - rect.left) / rect.width;
      const time = pct * song.duration;
      seek(time);

      if (isPlaying) {
        audioEngine.play(time, playbackRate);
        playStartWebAudioTime.current = audioEngine.contextTime;
        playStartOffset.current = time;
      }
    },
    [song, seek, isPlaying, playbackRate]
  );

  if (!song) return null;

  const progress = (currentTime / song.duration) * 100;

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/80 p-4 backdrop-blur-sm">
      {/* Song info */}
      <div className="mb-3 text-center">
        <div className="text-lg font-semibold text-white">{song.title}</div>
        <div className="text-sm text-gray-400">{song.artist}</div>
      </div>

      {/* Progress bar */}
      <div
        className="relative mb-4 h-2 cursor-pointer rounded-full bg-gray-800"
        onClick={handleSeek}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-600 to-purple-500 transition-all duration-75"
          style={{ width: `${progress}%` }}
        />
        {/* Playhead dot */}
        <div
          className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-white shadow-md shadow-violet-500/40 transition-all duration-75"
          style={{ left: `calc(${progress}% - 6px)` }}
        />
      </div>

      {/* Time display */}
      <div className="mb-3 flex justify-between text-xs text-gray-500">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(song.duration)}</span>
      </div>

      {/* Transport buttons */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={stop}
          className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-800 hover:text-white"
          aria-label="Stop"
        >
          <StopIcon />
        </button>
        <button
          onClick={isPlaying ? pause : play}
          className="rounded-full bg-violet-600 p-3 text-white shadow-lg shadow-violet-500/30 transition hover:bg-violet-500"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </button>
      </div>

      {/* Mode & tempo controls */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex gap-1 rounded-lg bg-gray-800/50 p-1">
          <button
            onClick={() => setMode('beginner')}
            className={`rounded-md px-3 py-1 text-xs font-medium transition ${
              mode === 'beginner'
                ? 'bg-emerald-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Beginner
          </button>
          <button
            onClick={() => setMode('professional')}
            className={`rounded-md px-3 py-1 text-xs font-medium transition ${
              mode === 'professional'
                ? 'bg-orange-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Pro
          </button>
        </div>

        {/* Tempo slider */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Speed</span>
          <input
            type="range"
            min={0.25}
            max={2}
            step={0.25}
            value={playbackRate}
            onChange={(e) => setPlaybackRate(Number(e.target.value))}
            className="h-1 w-24 accent-violet-500"
          />
          <span className="w-10 text-right text-xs text-gray-400">
            {playbackRate}x
          </span>
        </div>
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function PlayIcon() {
  return (
    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M6 6h12v12H6z" />
    </svg>
  );
}
