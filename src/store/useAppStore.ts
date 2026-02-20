import { create } from 'zustand';
import type { Song } from '../types/song';

export type ViewMode = 'chord' | 'tab';

interface AppState {
  song: Song | null;
  viewMode: ViewMode;
  isReady: boolean;

  loadSong: (song: Song) => void;
  setViewMode: (viewMode: ViewMode) => void;
}

/**
 * Central state store for the Guitar Sheet Generator.
 */
export const useAppStore = create<AppState>((set) => ({
  song: null,
  viewMode: 'chord',
  isReady: false,

  loadSong: (song: Song) => {
    set({
      song,
      isReady: true,
    });
  },

  setViewMode: (viewMode: ViewMode) => set({ viewMode }),
}));
