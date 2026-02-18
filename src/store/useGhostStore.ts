import { create } from 'zustand';
import type { Song, SongEvent, HandPose } from '../types/song';

export type DifficultyMode = 'beginner' | 'professional';
export type ViewMode = 'chord' | 'tab';

interface PlaybackState {
  /** Currently loaded song */
  song: Song | null;
  /** Is audio playing */
  isPlaying: boolean;
  /** Current playback time in seconds */
  currentTime: number;
  /** Playback speed multiplier */
  playbackRate: number;
  /** Current difficulty mode */
  mode: DifficultyMode;
  /** Current view mode (chord shapes vs tablature) */
  viewMode: ViewMode;
  /** Currently active event based on playback position */
  activeEvent: SongEvent | null;
  /** Current hand pose for the Ghost Hand */
  activeHandPose: HandPose | null;
  /** Whether the audio engine is ready */
  isReady: boolean;

  // Actions
  loadSong: (song: Song) => void;
  play: () => void;
  pause: () => void;
  stop: () => void;
  seek: (time: number) => void;
  setMode: (mode: DifficultyMode) => void;
  setViewMode: (viewMode: ViewMode) => void;
  setPlaybackRate: (rate: number) => void;
  tick: (currentTime: number) => void;
}

/**
 * Central state store for GhostGuitar playback synchronization.
 * Uses Zustand for high-performance updates that keep the Ghost Hand
 * perfectly synced with audio playback.
 */
export const useGhostStore = create<PlaybackState>((set, get) => ({
  song: null,
  isPlaying: false,
  currentTime: 0,
  playbackRate: 1,
  mode: 'beginner',
  viewMode: 'chord',
  activeEvent: null,
  activeHandPose: null,
  isReady: false,

  loadSong: (song: Song) => {
    set({
      song,
      currentTime: 0,
      isPlaying: false,
      activeEvent: null,
      activeHandPose: null,
      isReady: true,
    });
  },

  play: () => set({ isPlaying: true }),

  pause: () => set({ isPlaying: false }),

  stop: () =>
    set({
      isPlaying: false,
      currentTime: 0,
      activeEvent: null,
      activeHandPose: null,
    }),

  seek: (time: number) => {
    const state = get();
    set({ currentTime: time });
    state.tick(time);
  },

  setMode: (mode: DifficultyMode) => {
    set({ mode });
    const state = get();
    state.tick(state.currentTime);
  },

  setViewMode: (viewMode: ViewMode) => set({ viewMode }),

  setPlaybackRate: (rate: number) => set({ playbackRate: rate }),

  /**
   * Called on every animation frame during playback.
   * Finds the active event and hand pose for the current timestamp.
   */
  tick: (currentTime: number) => {
    const { song, mode } = get();
    if (!song) return;

    const track = song.tracks[mode];
    const events = track.events;

    let activeEvent: SongEvent | null = null;
    for (let i = events.length - 1; i >= 0; i--) {
      const evt = events[i];
      if (currentTime >= evt.time && currentTime < evt.time + evt.duration) {
        activeEvent = evt;
        break;
      }
    }

    set({
      currentTime,
      activeEvent,
      activeHandPose: activeEvent?.handPose ?? null,
    });
  },
}));
