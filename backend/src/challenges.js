// Zentrale Definition der 4 Gruppen-Challenges.
// Der Server bestimmt die Schrittweite – Clients schicken nur die Challenge-ID.

export const CHALLENGES = [
  {
    id: 'rubiks',
    label: "Rubik's Cube",
    emoji: '🧩',
    unit: 'Cubes',
    unitSingular: 'Cube',
    increment: 1,
    goal: 50,
    tickMessage: (name, amount) => `🧩 ${name} hat ${amount === 1 ? 'einen' : amount} Rubik's Cube gelöst!`,
  },
  {
    id: 'pushups',
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
    label: 'Trichter',
    emoji: '🍺',
    unit: 'Trichter',
    unitSingular: 'Trichter',
    increment: 1,
    goal: 10,
    tickMessage: (name, amount) => `🍺 ${name} hat ${amount === 1 ? 'einen' : amount} Trichter vernichtet!`,
  },
];

// Prozent-Schwellen, bei denen das Dashboard groß feiert.
export const MILESTONES = [25, 50, 75, 100];

const byId = new Map(CHALLENGES.map((c) => [c.id, c]));

export function getChallenge(id) {
  return byId.get(id) ?? null;
}

export function publicChallengeConfig(challenge) {
  const { id, label, emoji, unit, increment, goal } = challenge;
  return { id, label, emoji, unit, increment, goal };
}

export function buildEventMessage(event) {
  const challenge = getChallenge(event.challengeId);
  if (!challenge) return `${event.name}: ${event.amount}`;
  if (event.type === 'undo') {
    const amount = Math.abs(event.amount);
    return `↩️ ${event.name} hat ${amount} ${amount === 1 ? challenge.unitSingular : challenge.unit} zurückgenommen`;
  }
  return challenge.tickMessage(event.name, event.amount);
}

export function buildMilestoneMessage(challenge, percent, name) {
  if (percent >= 100) {
    return `🏆 CHALLENGE GESCHAFFT: ${challenge.emoji} ${challenge.label} ist komplett! ${name} hat den letzten Punkt geholt!`;
  }
  return `⚡ ${challenge.emoji} ${challenge.label}: ${percent}% erreicht! Meilenstein geknackt von ${name}!`;
}
