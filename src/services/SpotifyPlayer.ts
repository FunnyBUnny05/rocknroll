/**
 * Spotify Web Playback SDK Integration
 *
 * Creates a Spotify Connect device in the browser.
 * Requires Spotify Premium. Syncs playback state with GhostStore.
 */

import { getValidToken } from './SpotifyAuth';
import { transferPlayback } from './SpotifyService';

// --- Spotify SDK Type Definitions ---

interface SpotifyPlayerInstance {
    connect(): Promise<boolean>;
    disconnect(): void;
    addListener(event: string, callback: (data: unknown) => void): void;
    removeListener(event: string): void;
    getCurrentState(): Promise<SpotifyPlaybackState | null>;
    setName(name: string): void;
    getVolume(): Promise<number>;
    setVolume(volume: number): Promise<void>;
    pause(): Promise<void>;
    resume(): Promise<void>;
    togglePlay(): Promise<void>;
    seek(positionMs: number): Promise<void>;
    previousTrack(): Promise<void>;
    nextTrack(): Promise<void>;
    activateElement(): Promise<void>;
}

interface SpotifyPlaybackState {
    paused: boolean;
    position: number;
    duration: number;
    track_window: {
        current_track: SpotifyWebPlaybackTrack;
    };
}

interface SpotifyWebPlaybackTrack {
    uri: string;
    id: string;
    name: string;
    artists: { name: string; uri: string }[];
    album: {
        name: string;
        uri: string;
        images: { url: string; height: number; width: number }[];
    };
    duration_ms: number;
}

interface SpotifyPlayerConstructor {
    new(options: {
        name: string;
        getOAuthToken: (cb: (token: string) => void) => void;
        volume?: number;
    }): SpotifyPlayerInstance;
}

declare global {
    interface Window {
        Spotify: {
            Player: SpotifyPlayerConstructor;
        };
        onSpotifyWebPlaybackSDKReady: () => void;
    }
}

// --- SDK Loader ---

let sdkLoadPromise: Promise<void> | null = null;

function loadSpotifySDK(): Promise<void> {
    if (sdkLoadPromise) return sdkLoadPromise;

    sdkLoadPromise = new Promise((resolve) => {
        if (window.Spotify) {
            resolve();
            return;
        }

        window.onSpotifyWebPlaybackSDKReady = () => resolve();

        const script = document.createElement('script');
        script.src = 'https://sdk.scdn.co/spotify-player.js';
        script.async = true;
        document.head.appendChild(script);
    });

    return sdkLoadPromise;
}

// --- Player Singleton ---

export type PlayerStateCallback = (state: {
    isPlaying: boolean;
    positionMs: number;
    durationMs: number;
    trackName: string;
    artistName: string;
    albumArt: string;
}) => void;

export type DeviceReadyCallback = (deviceId: string) => void;
export type ErrorCallback = (message: string) => void;

let player: SpotifyPlayerInstance | null = null;
let currentDeviceId: string | null = null;
let stateCallback: PlayerStateCallback | null = null;
let readyCallback: DeviceReadyCallback | null = null;
let errorCallback: ErrorCallback | null = null;

// Polling timer for position sync
let pollInterval: ReturnType<typeof setInterval> | null = null;

export function onPlayerStateChange(cb: PlayerStateCallback): void {
    stateCallback = cb;
}

export function onDeviceReady(cb: DeviceReadyCallback): void {
    readyCallback = cb;
}

export function onPlayerError(cb: ErrorCallback): void {
    errorCallback = cb;
}

export function getDeviceId(): string | null {
    return currentDeviceId;
}

export async function initializePlayer(): Promise<void> {
    await loadSpotifySDK();

    if (player) return;

    player = new window.Spotify.Player({
        name: 'GhostGuitar',
        getOAuthToken: async (cb) => {
            const token = await getValidToken();
            if (token) cb(token);
        },
        volume: 0.8,
    });

    // Device ready
    player.addListener('ready', (data: unknown) => {
        const { device_id } = data as { device_id: string };
        currentDeviceId = device_id;
        console.log('🎸 GhostGuitar player ready, device:', device_id);

        // Transfer playback to this device
        transferPlayback(device_id, false).catch(console.error);

        if (readyCallback) readyCallback(device_id);
    });

    // Device went offline
    player.addListener('not_ready', (data: unknown) => {
        const { device_id } = data as { device_id: string };
        console.log('Device has gone offline:', device_id);
        currentDeviceId = null;
    });

    // Playback state changes
    player.addListener('player_state_changed', (state: unknown) => {
        const s = state as SpotifyPlaybackState | null;
        if (!s) return;

        const track = s.track_window.current_track;
        const albumImages = track.album.images;

        if (stateCallback) {
            stateCallback({
                isPlaying: !s.paused,
                positionMs: s.position,
                durationMs: track.duration_ms,
                trackName: track.name,
                artistName: track.artists.map((a) => a.name).join(', '),
                albumArt: albumImages.length > 0 ? albumImages[0].url : '',
            });
        }

        // Start/stop position polling based on play state
        if (!s.paused) {
            startPositionPolling();
        } else {
            stopPositionPolling();
        }
    });

    // Errors
    player.addListener('initialization_error', (e: unknown) => {
        const { message } = e as { message: string };
        console.error('Spotify init error:', message);
        if (errorCallback) errorCallback(message);
    });

    player.addListener('authentication_error', (e: unknown) => {
        const { message } = e as { message: string };
        console.error('Spotify auth error:', message);
        if (errorCallback) errorCallback('Authentication failed — please log in again');
    });

    player.addListener('account_error', (e: unknown) => {
        const { message } = e as { message: string };
        console.error('Spotify account error:', message);
        if (errorCallback) errorCallback('Spotify Premium is required for playback');
    });

    player.addListener('playback_error', (e: unknown) => {
        const { message } = e as { message: string };
        console.error('Spotify playback error:', message);
        if (errorCallback) errorCallback(message);
    });

    const connected = await player.connect();
    if (!connected) {
        console.error('Failed to connect Spotify player');
    }
}

// Poll the player for accurate position (SDK state events alone are not granular enough)
function startPositionPolling(): void {
    if (pollInterval) return;

    pollInterval = setInterval(async () => {
        if (!player) return;
        const state = await player.getCurrentState();
        if (state && !state.paused && stateCallback) {
            const track = state.track_window.current_track;
            stateCallback({
                isPlaying: true,
                positionMs: state.position,
                durationMs: track.duration_ms,
                trackName: track.name,
                artistName: track.artists.map((a) => a.name).join(', '),
                albumArt: track.album.images[0]?.url ?? '',
            });
        }
    }, 200); // 5 updates/sec for smooth ghost hand sync
}

function stopPositionPolling(): void {
    if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
    }
}

// --- Public Controls ---

export async function togglePlay(): Promise<void> {
    if (player) await player.togglePlay();
}

export async function pause(): Promise<void> {
    if (player) await player.pause();
}

export async function resume(): Promise<void> {
    if (player) await player.resume();
}

export async function seek(positionMs: number): Promise<void> {
    if (player) await player.seek(positionMs);
}

export async function setVolume(volume: number): Promise<void> {
    if (player) await player.setVolume(Math.max(0, Math.min(1, volume)));
}

export function disconnectPlayer(): void {
    stopPositionPolling();
    if (player) {
        player.disconnect();
        player = null;
        currentDeviceId = null;
    }
}
