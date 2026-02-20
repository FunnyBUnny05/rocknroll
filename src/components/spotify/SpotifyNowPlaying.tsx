/**
 * SpotifyNowPlaying - Shows currently selected track info
 */

import { useSpotifyStore } from '../../store/useSpotifyStore';

export function SpotifyNowPlaying() {
    const {
        currentTrack,
        trackName,
        artistName,
        albumArt,
    } = useSpotifyStore();

    if (!currentTrack) return null;

    return (
        <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-800 flex items-center gap-4">
            {albumArt ? (
                <img src={albumArt} alt={trackName} className="w-14 h-14 rounded-md shadow-md object-cover" />
            ) : (
                <div className="w-14 h-14 rounded-md bg-gray-800 flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path></svg>
                </div>
            )}
            <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-bold text-white truncate">{trackName}</span>
                <span className="text-xs text-gray-400 truncate">{artistName}</span>
            </div>
        </div>
    );
}
