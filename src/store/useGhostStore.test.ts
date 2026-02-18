import { describe, it, expect, beforeEach } from 'vitest';
import { useGhostStore } from './useGhostStore';
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
          handPose: {
            time: 0,
            duration: 3,
            placements: [{ string: 2, fret: 1, finger: 1 }],
            wristAngle: 0,
            handPosition: 1,
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
          handPose: {
            time: 3,
            duration: 3,
            placements: [{ string: 5, fret: 3, finger: 3 }],
            wristAngle: 0,
            handPosition: 3,
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
          handPose: {
            time: 0,
            duration: 2,
            placements: [{ string: 1, fret: 5, finger: 1 }],
            wristAngle: 0,
            handPosition: 5,
          },
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

describe('useGhostStore', () => {
  beforeEach(() => {
    // Reset store state
    useGhostStore.setState({
      song: null,
      isPlaying: false,
      currentTime: 0,
      playbackRate: 1,
      mode: 'beginner',
      viewMode: 'chord',
      activeEvent: null,
      activeHandPose: null,
      isReady: false,
    });
  });

  describe('loadSong', () => {
    it('loads a song and marks as ready', () => {
      useGhostStore.getState().loadSong(mockSong);
      const state = useGhostStore.getState();

      expect(state.song).toBe(mockSong);
      expect(state.isReady).toBe(true);
      expect(state.currentTime).toBe(0);
      expect(state.isPlaying).toBe(false);
    });
  });

  describe('play/pause/stop', () => {
    it('play sets isPlaying to true', () => {
      useGhostStore.getState().play();
      expect(useGhostStore.getState().isPlaying).toBe(true);
    });

    it('pause sets isPlaying to false', () => {
      useGhostStore.getState().play();
      useGhostStore.getState().pause();
      expect(useGhostStore.getState().isPlaying).toBe(false);
    });

    it('stop resets time and clears active event', () => {
      useGhostStore.getState().loadSong(mockSong);
      useGhostStore.getState().tick(2);
      useGhostStore.getState().stop();

      const state = useGhostStore.getState();
      expect(state.isPlaying).toBe(false);
      expect(state.currentTime).toBe(0);
      expect(state.activeEvent).toBeNull();
      expect(state.activeHandPose).toBeNull();
    });
  });

  describe('tick', () => {
    it('finds the correct event for a given time', () => {
      useGhostStore.getState().loadSong(mockSong);
      useGhostStore.getState().tick(1.5);

      const state = useGhostStore.getState();
      expect(state.activeEvent).not.toBeNull();
      expect(state.activeEvent!.chord!.symbol).toBe('Am');
      expect(state.currentTime).toBe(1.5);
    });

    it('finds the second event at time 4', () => {
      useGhostStore.getState().loadSong(mockSong);
      useGhostStore.getState().tick(4);

      const state = useGhostStore.getState();
      expect(state.activeEvent!.chord!.symbol).toBe('C');
    });

    it('returns null event when time is past all events', () => {
      useGhostStore.getState().loadSong(mockSong);
      useGhostStore.getState().tick(9);

      expect(useGhostStore.getState().activeEvent).toBeNull();
    });

    it('sets activeHandPose from the active event', () => {
      useGhostStore.getState().loadSong(mockSong);
      useGhostStore.getState().tick(1);

      const state = useGhostStore.getState();
      expect(state.activeHandPose).not.toBeNull();
      expect(state.activeHandPose!.handPosition).toBe(1);
    });
  });

  describe('setMode', () => {
    it('switches to professional mode', () => {
      useGhostStore.getState().loadSong(mockSong);
      useGhostStore.getState().tick(1);
      useGhostStore.getState().setMode('professional');

      const state = useGhostStore.getState();
      expect(state.mode).toBe('professional');
      // Professional mode has a different event at time 1
      expect(state.activeEvent).not.toBeNull();
      expect(state.activeEvent!.type).toBe('tab');
    });
  });

  describe('setViewMode', () => {
    it('toggles between chord and tab view', () => {
      useGhostStore.getState().setViewMode('tab');
      expect(useGhostStore.getState().viewMode).toBe('tab');

      useGhostStore.getState().setViewMode('chord');
      expect(useGhostStore.getState().viewMode).toBe('chord');
    });
  });

  describe('seek', () => {
    it('sets currentTime and triggers tick', () => {
      useGhostStore.getState().loadSong(mockSong);
      useGhostStore.getState().seek(4.5);

      const state = useGhostStore.getState();
      expect(state.currentTime).toBe(4.5);
      expect(state.activeEvent).not.toBeNull();
    });
  });

  describe('setPlaybackRate', () => {
    it('updates the playback rate', () => {
      useGhostStore.getState().setPlaybackRate(0.5);
      expect(useGhostStore.getState().playbackRate).toBe(0.5);

      useGhostStore.getState().setPlaybackRate(2);
      expect(useGhostStore.getState().playbackRate).toBe(2);
    });
  });
});
