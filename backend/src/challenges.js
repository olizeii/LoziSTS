// Zentrale Definition der Gruppen-Challenges.
// kind 'tick': feste Schrittweite, Clients schicken nur die Challenge-ID.
// kind 'darts': Punkte kommen aus dem Dart-Tracker (Team-Countdown von 10.001).
import { buildDartMessage } from './darts.js';

export const CHALLENGES = [
  {
    id: 'rubiks',
    kind: 'tick',
    label: "Rubik's Cube",
    emoji: '🧩',
    unit: 'Cubes',
    unitSingular: 'Cube',
    increment: 1,
    goal: 250,
    tickMessage: (name, amount) => `🧩 ${name} hat ${amount === 1 ? 'einen' : amount} Rubik's Cube gelöst!`,
  },
  {
    id: 'pushups',
    kind: 'tick',
    label: 'Liegestütze',
    emoji: '💪',
    unit: 'Liegestütze',
    unitSingular: 'Liegestütz',
    increment: 5,
    goal: 1000,
    tickMessage: (name, amount) => `🔥 ${name} hat +${amount} Liegestütze beigesteuert!`,
  },
  {
    id: 'running',
    kind: 'tick',
    label: 'Laufen',
    emoji: '🏃',
    unit: 'km',
    unitSingular: 'km',
    increment: 1,
    goal: 50,
    tickMessage: (name, amount) => `🏃 ${name} ist +${amount} km gelaufen!`,
  },
  {
    id: 'funnel',
    kind: 'tick',
    label: 'Trichter',
    emoji: '🍺',
    unit: 'Trichter',
    unitSingular: 'Trichter',
    increment: 1,
    goal: 10,
    tickMessage: (name, amount) => `🍺 ${name} hat ${amount === 1 ? 'einen' : amount} Trichter vernichtet!`,
  },
  {
    id: 'beer',
    kind: 'tick',
    label: 'Bier',
    emoji: '🍻',
    unit: 'Bier',
    unitSingular: 'Bier',
    increment: 1,
    goal: 120,
    tickMessage: (name, amount) => `🍻 ${name} hat ${amount === 1 ? 'ein' : amount} Bier geleert! Prost!`,
  },
  {
    id: 'darts',
    kind: 'darts',
    label: 'Darts',
    emoji: '🎯',
    unit: 'Punkte',
    unitSingular: 'Punkt',
    increment: null,
    goal: 10001,
  },
];

// Prozent-Schwellen, bei denen das Dashboard groß feiert.
export const MILESTONES = [25, 50, 75, 100];

export const DARTS_CHALLENGE_ID = 'darts';

const byId = new Map(CHALLENGES.map((c) => [c.id, c]));

export function getChallenge(id) {
  return byId.get(id) ?? null;
}

export function publicChallengeConfig(challenge) {
  const { id, kind, label, emoji, unit, increment, goal } = challenge;
  return { id, kind, label, emoji, unit, increment, goal };
}

export function buildEventMessage(event) {
  const challenge = getChallenge(event.challengeId);
  if (!challenge) return `${event.name}: ${event.amount}`;
  if (event.type === 'undo') {
    const amount = Math.abs(event.amount);
    if (challenge.kind === 'darts') return `↩️ ${event.name}: Dart-Aufnahme (${amount} Punkte) zurückgenommen`;
    return `↩️ ${event.name} hat ${amount} ${amount === 1 ? challenge.unitSingular : challenge.unit} zurückgenommen`;
  }
  if (challenge.kind === 'darts') {
    return event.dart ? buildDartMessage(event.name, event.dart) : `🎯 ${event.name} wirft ${event.amount} Punkte`;
  }
  return challenge.tickMessage(event.name, event.amount);
}

export function buildMilestoneMessage(challenge, percent, name) {
  if (percent >= 100) {
    return `🏆 CHALLENGE GESCHAFFT: ${challenge.emoji} ${challenge.label} ist komplett! ${name} hat den letzten Punkt geholt!`;
  }
  return `⚡ ${challenge.emoji} ${challenge.label}: ${percent}% erreicht! Meilenstein geknackt von ${name}!`;
}
