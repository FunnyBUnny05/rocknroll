import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from './useAppStore';
import type { Song } from '../types/song';

const mockSong: Song = {
  id: 'test-id',
  title: 'Test Song',
  artist: 'Test Artist',
  bpm: 120,
  timeSignature: [4, 4],
  duration: 10,
  audioSrc: 'test.mp3',
  tuning: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'],
  capo: 0,
  tracks: {
    beginner: {
      events: [
        {
          time: 0,
          duration: 3,
          type: 'chord',
          chord: {
            name: 'Am',
            symbol: 'Am',
            placements: [{ string: 2, fret: 1, finger: 1 }],
            mutedStrings: [],
          },
        },
        {
          time: 3,
          duration: 3,
          type: 'chord',
          chord: {
            name: 'C',
            symbol: 'C',
            placements: [{ string: 5, fret: 3, finger: 3 }],
            mutedStrings: [],
          },
        },
      ],
      tempoMultiplier: 0.75,
    },
    professional: {
      events: [
        {
          time: 0,
          duration: 2,
          type: 'tab',
          notes: [{ string: 1, fret: 5, duration: 1 }],
        },
      ],
      tempoMultiplier: 1,
    },
  },
  metadata: {
    transcribedAt: '2026-01-01',
    transcriptionEngine: 'test',
    confidence: 0.9,
  },
};

describe('useAppStore', () => {
  beforeEach(() => {
    useAppStore.setState({
      song: null,
      isPlaying: false,
      currentTime: 0,
      mode: 'beginner',
      viewMode: 'chord',
      activeEvent: null,
      isReady: false,
    });
  });

  describe('loadSong', () => {
    it('loads a song and marks as ready', () => {
      useAppStore.getState().loadSong(mockSong);
      const state = useAppStore.getState();

      expect(state.song).toBe(mockSong);
      expect(state.isReady).toBe(true);
      expect(state.currentTime).toBe(0);
      expect(state.isPlaying).toBe(false);
    });
  });

  describe('play/pause/stop', () => {
    it('play sets isPlaying to true', () => {
      useAppStore.getState().play();
      expect(useAppStore.getState().isPlaying).toBe(true);
    });

    it('pause sets isPlaying to false', () => {
      useAppStore.getState().play();
      useAppStore.getState().pause();
      expect(useAppStore.getState().isPlaying).toBe(false);
    });

    it('stop resets time and clears active event', () => {
      useAppStore.getState().loadSong(mockSong);
      useAppStore.getState().tick(2);
      useAppStore.getState().stop();

      const state = useAppStore.getState();
      expect(state.isPlaying).toBe(false);
      expect(state.currentTime).toBe(0);
      expect(state.activeEvent).toBeNull();
    });
  });

  describe('tick', () => {
    it('finds the correct event for a given time', () => {
      useAppStore.getState().loadSong(mockSong);
      useAppStore.getState().tick(1.5);

      const state = useAppStore.getState();
      expect(state.activeEvent).not.toBeNull();
      expect(state.activeEvent!.chord!.symbol).toBe('Am');
      expect(state.currentTime).toBe(1.5);
    });

    it('finds the second event at time 4', () => {
      useAppStore.getState().loadSong(mockSong);
      useAppStore.getState().tick(4);

      const state = useAppStore.getState();
      expect(state.activeEvent!.chord!.symbol).toBe('C');
    });

    it('returns null event when time is past all events', () => {
      useAppStore.getState().loadSong(mockSong);
      useAppStore.getState().tick(9);

      expect(useAppStore.getState().activeEvent).toBeNull();
    });
  });

  describe('setMode', () => {
    it('switches to professional mode', () => {
      useAppStore.getState().loadSong(mockSong);
      useAppStore.getState().tick(1);
      useAppStore.getState().setMode('professional');

      const state = useAppStore.getState();
      expect(state.mode).toBe('professional');
      expect(state.activeEvent).not.toBeNull();
      expect(state.activeEvent!.type).toBe('tab');
    });
  });

  describe('setViewMode', () => {
    it('toggles between chord and tab view', () => {
      useAppStore.getState().setViewMode('tab');
      expect(useAppStore.getState().viewMode).toBe('tab');

      useAppStore.getState().setViewMode('chord');
      expect(useAppStore.getState().viewMode).toBe('chord');
    });
  });

  describe('seek', () => {
    it('sets currentTime and triggers tick', () => {
      useAppStore.getState().loadSong(mockSong);
      useAppStore.getState().seek(4.5);

      const state = useAppStore.getState();
      expect(state.currentTime).toBe(4.5);
      expect(state.activeEvent).not.toBeNull();
    });
  });
});
