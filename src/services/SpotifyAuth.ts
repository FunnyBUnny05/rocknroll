/**
 * Spotify PKCE Authentication Flow
 *
 * Implements the Authorization Code with PKCE flow for SPAs.
 * No client secret needed — uses code verifier/challenge instead.
 */

// Client ID is public (PKCE flow — no secret). Env var takes priority for local dev.
const SPOTIFY_CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID || '0c9e644ff9434ac1b93374f6cf2173d5';
const SPOTIFY_AUTH_ENDPOINT = 'https://accounts.spotify.com/authorize';
const SPOTIFY_TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token';

// Detect redirect URI based on environment
const REDIRECT_URI = `${window.location.origin}${import.meta.env.BASE_URL}callback`;

const SCOPES = [
    'streaming',
    'user-read-email',
    'user-read-private',
    'user-modify-playback-state',
    'user-read-playback-state',
].join(' ');

// --- PKCE Crypto Utilities ---

function generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    const values = crypto.getRandomValues(new Uint8Array(length));
    return Array.from(values, (v) => chars[v % chars.length]).join('');
}

async function sha256(plain: string): Promise<ArrayBuffer> {
    const encoder = new TextEncoder();
    return crypto.subtle.digest('SHA-256', encoder.encode(plain));
}

function base64UrlEncode(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    const binary = Array.from(bytes, (b) => String.fromCharCode(b)).join('');
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function generateCodeChallenge(verifier: string): Promise<string> {
    const hash = await sha256(verifier);
    return base64UrlEncode(hash);
}

// --- Auth Flow ---

export async function redirectToSpotifyLogin(): Promise<void> {
    if (!SPOTIFY_CLIENT_ID) {
        console.error('Missing VITE_SPOTIFY_CLIENT_ID environment variable');
        return;
    }

    const codeVerifier = generateRandomString(64);
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    // Store verifier for the callback exchange
    sessionStorage.setItem('spotify_code_verifier', codeVerifier);

    const params = new URLSearchParams({
        response_type: 'code',
        client_id: SPOTIFY_CLIENT_ID,
        scope: SCOPES,
        redirect_uri: REDIRECT_URI,
        code_challenge_method: 'S256',
        code_challenge: codeChallenge,
    });

    window.location.href = `${SPOTIFY_AUTH_ENDPOINT}?${params.toString()}`;
}

export async function handleCallback(): Promise<boolean> {
    // Check both query string and hash fragment for auth data
    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));

    const code = params.get('code');
    const error = params.get('error') || hashParams.get('error');

    // Handle implicit-flow token in hash (fallback)
    const hashToken = hashParams.get('access_token');
    if (hashToken) {
        const expiresIn = parseInt(hashParams.get('expires_in') || '3600');
        storeTokens({
            access_token: hashToken,
            refresh_token: '',
            expires_in: expiresIn,
            token_type: 'Bearer',
        });
        window.history.replaceState({}, '', window.location.pathname);
        return true;
    }

    if (error) {
        console.error('Spotify auth error:', error);
        return false;
    }

    if (!code) return false;

    const codeVerifier = sessionStorage.getItem('spotify_code_verifier');
    if (!codeVerifier) {
        console.error('Missing code verifier — was sessionStorage cleared?');
        return false;
    }

    try {
        const response = await fetch(SPOTIFY_TOKEN_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: SPOTIFY_CLIENT_ID,
                grant_type: 'authorization_code',
                code,
                redirect_uri: REDIRECT_URI,
                code_verifier: codeVerifier,
            }),
        });

        if (!response.ok) {
            const errorBody = await response.text().catch(() => '');
            console.error('Token exchange failed:', response.status, errorBody);
            return false;
        }

        const data = await response.json();
        storeTokens(data);
        sessionStorage.removeItem('spotify_code_verifier');

        // Clean URL (remove ?code=... from address bar)
        window.history.replaceState({}, '', window.location.pathname);
        return true;
    } catch (err) {
        console.error('Token exchange error:', err);
        return false;
    }
}

// --- Token Management ---

interface TokenData {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
}

function storeTokens(data: TokenData): void {
    const expiresAt = Date.now() + data.expires_in * 1000;
    sessionStorage.setItem('spotify_access_token', data.access_token);
    sessionStorage.setItem('spotify_refresh_token', data.refresh_token);
    sessionStorage.setItem('spotify_token_expires_at', expiresAt.toString());
}

export function getAccessToken(): string | null {
    return sessionStorage.getItem('spotify_access_token');
}

export function isTokenExpired(): boolean {
    const expiresAt = sessionStorage.getItem('spotify_token_expires_at');
    if (!expiresAt) return true;
    // Refresh 60s before actual expiry
    return Date.now() > parseInt(expiresAt) - 60000;
}

export async function refreshAccessToken(): Promise<string | null> {
    const refreshToken = sessionStorage.getItem('spotify_refresh_token');
    if (!refreshToken) return null;

    try {
        const response = await fetch(SPOTIFY_TOKEN_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: SPOTIFY_CLIENT_ID,
                grant_type: 'refresh_token',
                refresh_token: refreshToken,
            }),
        });

        if (!response.ok) {
            console.error('Token refresh failed:', response.status);
            logout();
            return null;
        }

        const data = await response.json();
        storeTokens(data);
        return data.access_token;
    } catch (err) {
        console.error('Token refresh error:', err);
        return null;
    }
}

/** Get a valid access token, refreshing if needed */
export async function getValidToken(): Promise<string | null> {
    if (!isTokenExpired()) {
        return getAccessToken();
    }
    return refreshAccessToken();
}

export function isAuthenticated(): boolean {
    // Consider authenticated if we have any token (access or refresh).
    // Expired access tokens will be refreshed transparently by getValidToken().
    const hasAccess = !!getAccessToken();
    const hasRefresh = !!sessionStorage.getItem('spotify_refresh_token');
    return hasAccess || hasRefresh;
}

export function logout(): void {
    sessionStorage.removeItem('spotify_access_token');
    sessionStorage.removeItem('spotify_refresh_token');
    sessionStorage.removeItem('spotify_token_expires_at');
    sessionStorage.removeItem('spotify_code_verifier');
}
