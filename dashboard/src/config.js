// Leer = gleiche Adresse wie das Dashboard (Backend liefert das Dashboard aus bzw. Vite-Proxy im Dev-Modus)
export const SERVER_URL = import.meta.env.VITE_SERVER_URL || window.location.origin;

export const EVENT_TITLE = import.meta.env.VITE_EVENT_TITLE || 'LAN-PARTY CHALLENGE';

// ?autostart überspringt den Start-Screen (z. B. Chrome-Kiosk mit --autoplay-policy=no-user-gesture-required)
export const AUTOSTART = new URLSearchParams(window.location.search).has('autostart');

export const LEADERBOARD_SIZE = 5;

export const CHALLENGE_THEME = {
  rubiks: { color: '#22d3ee', color2: '#3b82f6', glow: 'rgba(34, 211, 238, 0.55)' },
  pushups: { color: '#fb923c', color2: '#ef4444', glow: 'rgba(249, 115, 22, 0.55)' },
  running: { color: '#a3e635', color2: '#10b981', glow: 'rgba(132, 204, 22, 0.55)' },
  funnel: { color: '#facc15', color2: '#f59e0b', glow: 'rgba(250, 204, 21, 0.55)' },
};

const FALLBACK_THEME = { color: '#a855f7', color2: '#ec4899', glow: 'rgba(168, 85, 247, 0.55)' };

export function themeFor(challengeId) {
  return CHALLENGE_THEME[challengeId] ?? FALLBACK_THEME;
}

export function themeStyle(challengeId) {
  const t = themeFor(challengeId);
  return { '--c': t.color, '--c2': t.color2, '--glow': t.glow };
}
