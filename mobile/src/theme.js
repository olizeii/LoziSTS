export const COLORS = {
  bg: '#05060a',
  panel: '#11142a',
  panelBorder: 'rgba(148, 163, 255, 0.16)',
  text: '#e8ebff',
  muted: '#8b93b8',
  accent: '#a855f7',
  accent2: '#22d3ee',
  success: '#34d399',
  danger: '#f43f5e',
  warning: '#fbbf24',
};

export const FONTS = {
  display: 'Orbitron_900Black',
  displayBold: 'Orbitron_700Bold',
};

// Gleiche Farben wie auf dem TV-Dashboard
const CHALLENGE_COLORS = {
  rubiks: { color: '#22d3ee', color2: '#3b82f6' },
  pushups: { color: '#fb923c', color2: '#ef4444' },
  running: { color: '#a3e635', color2: '#10b981' },
  funnel: { color: '#facc15', color2: '#f59e0b' },
};

export function challengeColors(id) {
  return CHALLENGE_COLORS[id] ?? { color: '#a855f7', color2: '#ec4899' };
}
