import { create } from 'zustand';
import type { Song, SongEvent } from '../types/song';

export type DifficultyMode = 'beginner' | 'professional';
export type ViewMode = 'chord' | 'tab';

interface AppState {
  song: Song | null;
  isPlaying: boolean;
  currentTime: number;
  mode: DifficultyMode;
  viewMode: ViewMode;
  activeEvent: SongEvent | null;
  isReady: boolean;

  loadSong: (song: Song) => void;
  play: () => void;
  pause: () => void;
  stop: () => void;
  seek: (time: number) => void;
  setMode: (mode: DifficultyMode) => void;
  setViewMode: (viewMode: ViewMode) => void;
  tick: (currentTime: number) => void;
}

/**
 * Central state store for playback synchronization.
 * Keeps the fretboard and sheet display synced with Spotify playback.
 */
export const useAppStore = create<AppState>((set, get) => ({
  song: null,
  isPlaying: false,
  currentTime: 0,
  mode: 'beginner',
  viewMode: 'chord',
  activeEvent: null,
  isReady: false,

  loadSong: (song: Song) => {
    set({
      song,
      currentTime: 0,
      isPlaying: false,
      activeEvent: null,
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

  /**
   * Called on every playback position update.
   * Finds the active event for the current timestamp.
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

    set({ currentTime, activeEvent });
  },
}));
