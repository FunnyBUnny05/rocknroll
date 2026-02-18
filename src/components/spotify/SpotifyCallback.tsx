/**
 * SpotifyCallback - Handles the OAuth redirect callback
 *
 * This component is rendered at /callback and exchanges
 * the auth code for tokens, then redirects to the main app.
 */

import { useEffect, useState } from 'react';
import { handleCallback } from '../../services/SpotifyAuth';

export function SpotifyCallback() {
    const [status, setStatus] = useState<'processing' | 'success' | 'error'>(
        'processing'
    );

    useEffect(() => {
        async function processCallback() {
            const success = await handleCallback();
            setStatus(success ? 'success' : 'error');

            if (success) {
                // Redirect to main app after short delay
                setTimeout(() => {
                    window.location.href = import.meta.env.BASE_URL || '/';
                }, 500);
            }
        }

        processCallback();
    }, []);

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh',
                color: 'white',
                fontFamily: 'system-ui, sans-serif',
            }}
        >
            {status === 'processing' && (
                <>
                    <div className="spotify-search-spinner" style={{ width: 32, height: 32, marginBottom: 16 }} />
                    <p>Connecting to Spotify...</p>
                </>
            )}
            {status === 'success' && (
                <>
                    <p style={{ fontSize: 24, color: '#1DB954' }}>✓ Connected!</p>
                    <p style={{ opacity: 0.5 }}>Redirecting...</p>
                </>
            )}
            {status === 'error' && (
                <>
                    <p style={{ fontSize: 24, color: '#ef4444' }}>Connection failed</p>
                    <a
                        href={import.meta.env.BASE_URL || '/'}
                        style={{ color: '#1DB954', marginTop: 8 }}
                    >
                        Back to GhostGuitar
                    </a>
                </>
            )}
        </div>
    );
}
