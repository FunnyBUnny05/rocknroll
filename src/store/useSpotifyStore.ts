/**
 * Spotify State Store (Zustand)
 *
 * Manages Spotify authentication state, search results,
 * and current playback information.
 */

import { create } from 'zustand';
import type { SpotifyTrack, SpotifyUser } from '../services/SpotifyService';

export interface SpotifyState {
    // Auth
    isAuthenticated: boolean;
    user: SpotifyUser | null;
    isPremium: boolean;

    // Player
    deviceId: string | null;
    isPlayerReady: boolean;

    // Search
    searchQuery: string;
    searchResults: SpotifyTrack[];
    isSearching: boolean;

    // Current track
    currentTrack: SpotifyTrack | null;
    trackName: string;
    artistName: string;
    albumArt: string;

    // Error
    error: string | null;

    // Actions
    setAuthenticated: (isAuthenticated: boolean) => void;
    setUser: (user: SpotifyUser | null) => void;
    setDeviceId: (deviceId: string | null) => void;
    setPlayerReady: (ready: boolean) => void;
    setSearchQuery: (query: string) => void;
    setSearchResults: (results: SpotifyTrack[]) => void;
    setSearching: (searching: boolean) => void;
    setCurrentTrack: (track: SpotifyTrack | null) => void;
    setTrackDetails: (details: {
        trackName: string;
        artistName: string;
        albumArt: string;
    }) => void;
    setError: (error: string | null) => void;
    reset: () => void;
}

const initialState = {
    isAuthenticated: false,
    user: null,
    isPremium: false,
    deviceId: null,
    isPlayerReady: false,
    searchQuery: '',
    searchResults: [],
    isSearching: false,
    currentTrack: null,
    trackName: '',
    artistName: '',
    albumArt: '',
    error: null,
};

export const useSpotifyStore = create<SpotifyState>((set) => ({
    ...initialState,

    setAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
    setUser: (user) =>
        set({
            user,
            isPremium: user?.product === 'premium',
        }),
    setDeviceId: (deviceId) => set({ deviceId }),
    setPlayerReady: (ready) => set({ isPlayerReady: ready }),
    setSearchQuery: (searchQuery) => set({ searchQuery }),
    setSearchResults: (searchResults) => set({ searchResults }),
    setSearching: (isSearching) => set({ isSearching }),
    setCurrentTrack: (currentTrack) => set({ currentTrack }),
    setTrackDetails: (details) =>
        set({
            trackName: details.trackName,
            artistName: details.artistName,
            albumArt: details.albumArt,
        }),
    setError: (error) => set({ error }),
    reset: () => set(initialState),
}));
