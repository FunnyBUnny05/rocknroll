import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { SpotifyCallback } from './components/spotify/SpotifyCallback.tsx'

console.log('[GhostGuitar] main.tsx executing - mounting React root');

const rootEl = document.getElementById('root');

if (!rootEl) {
  document.body.innerHTML =
    '<div style="color:#f87171;padding:2rem;font-family:monospace">' +
    '[GhostGuitar] Fatal: #root element not found in DOM</div>';
  throw new Error('#root element not found');
}

// Simple path-based routing for OAuth callback
const basePath = import.meta.env.BASE_URL || '/';
const pathname = window.location.pathname;
const isCallback = pathname === `${basePath}callback` || pathname === `${basePath}callback/`;

try {
  createRoot(rootEl).render(
    <StrictMode>
      {isCallback ? <SpotifyCallback /> : <App />}
    </StrictMode>,
  );
  console.log('[GhostGuitar] React root rendered successfully');
} catch (err) {
  console.error('[GhostGuitar] Fatal render error:', err);
  rootEl.innerHTML =
    '<div style="color:#f87171;padding:2rem;font-family:monospace">' +
    '<h2>GhostGuitar failed to start</h2>' +
    '<pre style="margin-top:1rem;font-size:0.8rem;color:#fca5a5">' +
    (err instanceof Error ? err.message : String(err)) +
    '</pre></div>';
}
