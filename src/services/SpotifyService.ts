/**
 * Spotify Web API Service
 *
 * Lightweight wrapper around Spotify REST API using plain fetch.
 * No external dependencies — handles auth header + 401 refresh automatically.
 */

import { getValidToken } from './SpotifyAuth';

const API_BASE = 'https://api.spotify.com/v1';

// --- Types ---

export interface SpotifyImage {
    url: string;
    height: number;
    width: number;
}

export interface SpotifyArtist {
    id: string;
    name: string;
}

export interface SpotifyAlbum {
    id: string;
    name: string;
    images: SpotifyImage[];
}

export interface SpotifyTrack {
    id: string;
    name: string;
    artists: SpotifyArtist[];
    album: SpotifyAlbum;
    duration_ms: number;
    uri: string;
    preview_url: string | null;
}

export interface SpotifySearchResult {
    tracks: {
        items: SpotifyTrack[];
        total: number;
    };
}

export interface SpotifyUser {
    id: string;
    display_name: string;
    email: string;
    images: SpotifyImage[];
    product: string; // 'premium' | 'free' | 'open'
}

// --- API Helpers ---

async function spotifyFetch<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const token = await getValidToken();
    if (!token) {
        throw new Error('Not authenticated with Spotify');
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });

    if (response.status === 204) {
        return undefined as T;
    }

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
        throw new Error(`Spotify API error ${response.status}: ${error?.error?.message || response.statusText}`);
    }

    return response.json();
}

// --- Public API ---

/** Search for tracks on Spotify */
export async function searchTracks(
    query: string,
    limit = 10
): Promise<SpotifyTrack[]> {
    if (!query.trim()) return [];

    const params = new URLSearchParams({
        q: query,
        type: 'track',
        limit: limit.toString(),
    });

    const result = await spotifyFetch<SpotifySearchResult>(
        `/search?${params.toString()}`
    );

    return result.tracks.items;
}

/** Get the current user's profile */
export async function getCurrentUser(): Promise<SpotifyUser> {
    return spotifyFetch<SpotifyUser>('/me');
}

/** Transfer playback to a specific device */
export async function transferPlayback(
    deviceId: string,
    play = false
): Promise<void> {
    await spotifyFetch('/me/player', {
        method: 'PUT',
        body: JSON.stringify({
            device_ids: [deviceId],
            play,
        }),
    });
}

/** Start playing a track on a specific device */
export async function playTrack(
    trackUri: string,
    deviceId: string
): Promise<void> {
    await spotifyFetch(`/me/player/play?device_id=${deviceId}`, {
        method: 'PUT',
        body: JSON.stringify({
            uris: [trackUri],
        }),
    });
}

/** Pause playback */
export async function pausePlayback(): Promise<void> {
    await spotifyFetch('/me/player/pause', { method: 'PUT' });
}

/** Resume playback */
export async function resumePlayback(): Promise<void> {
    await spotifyFetch('/me/player/play', { method: 'PUT' });
}

/** Seek to a position in the current track */
export async function seekToPosition(positionMs: number): Promise<void> {
    await spotifyFetch(`/me/player/seek?position_ms=${Math.round(positionMs)}`, {
        method: 'PUT',
    });
}

/** Get audio analysis for a track (segments, beats, bars, sections) */
export async function getAudioAnalysis(trackId: string): Promise<SpotifyAudioAnalysis> {
    return spotifyFetch<SpotifyAudioAnalysis>(`/audio-analysis/${trackId}`);
}

/** Get audio features for a track (key, mode, tempo, etc.) */
export async function getAudioFeatures(trackId: string): Promise<SpotifyAudioFeatures> {
    return spotifyFetch<SpotifyAudioFeatures>(`/audio-features/${trackId}`);
}

/** Format milliseconds to mm:ss */
export function formatDuration(ms: number): string {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// --- Audio Analysis Types ---

export interface SpotifyAudioAnalysis {
    bars: SpotifyTimeInterval[];
    beats: SpotifyTimeInterval[];
    sections: SpotifySection[];
    segments: SpotifySegment[];
    tatums: SpotifyTimeInterval[];
}

export interface SpotifyTimeInterval {
    start: number;
    duration: number;
    confidence: number;
}

export interface SpotifySection {
    start: number;
    duration: number;
    confidence: number;
    loudness: number;
    tempo: number;
    tempo_confidence: number;
    key: number;
    key_confidence: number;
    mode: number;
    mode_confidence: number;
    time_signature: number;
    time_signature_confidence: number;
}

export interface SpotifySegment {
    start: number;
    duration: number;
    confidence: number;
    loudness_start: number;
    loudness_max: number;
    loudness_max_time: number;
    loudness_end: number;
    /** 12-element chroma array [C, C#, D, ..., B], each 0.0-1.0 */
    pitches: number[];
    /** 12-element timbre array */
    timbre: number[];
}

export interface SpotifyAudioFeatures {
    id: string;
    key: number;
    mode: number;
    tempo: number;
    time_signature: number;
    danceability: number;
    energy: number;
    valence: number;
    acousticness: number;
    instrumentalness: number;
}
