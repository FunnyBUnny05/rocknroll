/**
 * SpotifyNowPlaying - Shows currently playing track info with playback controls
 */

import { useSpotifyStore } from '../../store/useSpotifyStore';
import { formatDuration } from '../../services/SpotifyService';
import * as SpotifyPlayer from '../../services/SpotifyPlayer';
import './Spotify.css';

export function SpotifyNowPlaying() {
    const {
        currentTrack,
        isSpotifyPlaying,
        positionMs,
        durationMs,
        trackName,
        artistName,
        albumArt,
    } = useSpotifyStore();

    if (!currentTrack) return null;

    const progressPercent = durationMs > 0 ? (positionMs / durationMs) * 100 : 0;

    const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const fraction = (e.clientX - rect.left) / rect.width;
        const seekMs = fraction * durationMs;
        SpotifyPlayer.seek(seekMs);
    };

    return (
        <div className="spotify-now-playing">
            {albumArt && (
                <img src={albumArt} alt={trackName} className="spotify-np-art" />
            )}
            <div className="spotify-np-info">
                <span className="spotify-np-track">{trackName}</span>
                <span className="spotify-np-artist">{artistName}</span>
            </div>

            <div className="spotify-np-controls">
                <button
                    className="spotify-np-play-btn"
                    onClick={() =>
                        isSpotifyPlaying ? SpotifyPlayer.pause() : SpotifyPlayer.resume()
                    }
                >
                    {isSpotifyPlaying ? (
                        <svg viewBox="0 0 24 24" width="24" height="24">
                            <path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                        </svg>
                    ) : (
                        <svg viewBox="0 0 24 24" width="24" height="24">
                            <path fill="currentColor" d="M8 5v14l11-7z" />
                        </svg>
                    )}
                </button>
            </div>

            <div className="spotify-np-progress-wrapper">
                <span className="spotify-np-time">{formatDuration(positionMs)}</span>
                <div className="spotify-np-progress-bar" onClick={handleSeek}>
                    <div
                        className="spotify-np-progress-fill"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
                <span className="spotify-np-time">{formatDuration(durationMs)}</span>
            </div>
        </div>
    );
}
