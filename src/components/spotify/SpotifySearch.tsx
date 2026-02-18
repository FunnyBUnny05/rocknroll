/**
 * SpotifySearch - Search bar with results list
 *
 * Debounced search (300ms), shows album art, track name, artist, duration.
 * Click to select and start playback.
 */

import { useEffect, useRef, useState } from 'react';
import { searchTracks, formatDuration, playTrack } from '../../services/SpotifyService';
import { useSpotifyStore } from '../../store/useSpotifyStore';
import type { SpotifyTrack } from '../../services/SpotifyService';
import './Spotify.css';

export function SpotifySearch() {
    const {
        searchQuery,
        searchResults,
        isSearching,
        deviceId,
        setSearchQuery,
        setSearchResults,
        setSearching,
        setCurrentTrack,
        setError,
    } = useSpotifyStore();

    const [isFocused, setIsFocused] = useState(false);
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Debounced search
    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }

        if (debounceTimer.current) clearTimeout(debounceTimer.current);

        debounceTimer.current = setTimeout(async () => {
            setSearching(true);
            try {
                const results = await searchTracks(searchQuery, 8);
                setSearchResults(results);
            } catch (err) {
                console.error('Search failed:', err);
                setError('Search failed — try again');
            } finally {
                setSearching(false);
            }
        }, 300);

        return () => {
            if (debounceTimer.current) clearTimeout(debounceTimer.current);
        };
    }, [searchQuery, setSearchResults, setSearching, setError]);

    const handleSelect = async (track: SpotifyTrack) => {
        setCurrentTrack(track);
        setSearchQuery('');
        setSearchResults([]);
        setIsFocused(false);

        if (deviceId) {
            try {
                await playTrack(track.uri, deviceId);
            } catch (err) {
                console.error('Playback failed:', err);
                setError('Playback failed — is Spotify Premium active?');
            }
        }
    };

    const showResults = isFocused && searchResults.length > 0;

    return (
        <div className="spotify-search-container">
            <div className="spotify-search-input-wrapper">
                <svg className="spotify-search-icon" viewBox="0 0 24 24" width="18" height="18">
                    <path
                        fill="currentColor"
                        d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
                    />
                </svg>
                <input
                    type="text"
                    className="spotify-search-input"
                    placeholder="Search for a song on Spotify..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => {
                        // Delay to allow click on results
                        setTimeout(() => setIsFocused(false), 200);
                    }}
                />
                {isSearching && <div className="spotify-search-spinner" />}
            </div>

            {showResults && (
                <ul className="spotify-search-results">
                    {searchResults.map((track) => (
                        <li
                            key={track.id}
                            className="spotify-search-result-item"
                            onClick={() => handleSelect(track)}
                        >
                            <img
                                src={track.album.images[2]?.url ?? track.album.images[0]?.url ?? ''}
                                alt={track.album.name}
                                className="spotify-result-art"
                            />
                            <div className="spotify-result-info">
                                <span className="spotify-result-name">{track.name}</span>
                                <span className="spotify-result-artist">
                                    {track.artists.map((a) => a.name).join(', ')}
                                </span>
                            </div>
                            <span className="spotify-result-duration">
                                {formatDuration(track.duration_ms)}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
