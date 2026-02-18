import { useCallback, useEffect, useRef } from 'react';
import { useGhostStore } from '../../store/useGhostStore';

/**
 * PlaybackControls - Transport bar for song playback.
 * Handles play/pause, seek, tempo, and mode switching.
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
  const startTimeRef = useRef<number>(0);
  const offsetRef = useRef<number>(0);

  // Animation loop for playback sync
  const animate = useCallback(
    (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = (timestamp - startTimeRef.current) / 1000;
      const newTime = offsetRef.current + elapsed * playbackRate;

      if (song && newTime >= song.duration) {
        stop();
        return;
      }

      tick(newTime);
      animationRef.current = requestAnimationFrame(animate);
    },
    [playbackRate, song, stop, tick]
  );

  useEffect(() => {
    if (isPlaying) {
      startTimeRef.current = 0;
      offsetRef.current = currentTime;
      animationRef.current = requestAnimationFrame(animate);
    } else {
      cancelAnimationFrame(animationRef.current);
    }
    return () => cancelAnimationFrame(animationRef.current);
  }, [isPlaying, animate, currentTime]);

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
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const pct = (e.clientX - rect.left) / rect.width;
          seek(pct * song.duration);
        }}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-600 to-purple-500 transition-all duration-75"
          style={{ width: `${progress}%` }}
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
