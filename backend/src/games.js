// Games-Challenges (zweite und dritte Dashboard-Seite).
// Jeder Spieltyp bestimmt, welche Eingabe die App zeigt und wie der Fortschritt berechnet wird:
//   wins       – GEWONNEN/VERLOREN, Ziel = Anzahl Siege
//   streak     – GEWONNEN/VERLOREN, Ziel = Siege am Stück (einmal geschafft bleibt geschafft)
//   best       – Zahl eingeben, der höchste Wert zählt
//   rank       – Platzierung eingeben, der beste (kleinste) Platz zählt
//   sum        – Zahl eingeben, alles wird aufaddiert
//   task       – einmal ERLEDIGT melden
//   trophies   – Pokal pro Cup (1 Gold, 2 Silber, 3 Bronze, 0 keiner), Ziel = Gold-Pokale
//   checklist  – Einträge abhaken (1) bzw. zurücknehmen (0)
//   minecraft  – Advancements werden automatisch vom Minecraft-Server übernommen
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DATA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'data');
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8'));

const JUST_DANCE_SONGS = readJson('justdance-2016.json').songs;

export const TROPHY_LABELS = { 0: 'kein Pokal', 1: 'Gold', 2: 'Silber', 3: 'Bronze' };

const MARIO_KART_CUPS = [
  { id: 'mushroom', label: 'Pilz-Cup', emoji: '🍄', tracks: ['Luigi Circuit', 'Moo Moo Meadows', 'Mushroom Gorge', "Toad's Factory"] },
  { id: 'flower', label: 'Blumen-Cup', emoji: '🌸', tracks: ['Mario Circuit', 'Coconut Mall', 'DK Summit', "Wario's Gold Mine"] },
  { id: 'star', label: 'Stern-Cup', emoji: '⭐', tracks: ['Daisy Circuit', 'Koopa Cape', 'Maple Treeway', 'Grumble Volcano'] },
  { id: 'special', label: 'Spezial-Cup', emoji: '👑', tracks: ['Dry Dry Ruins', 'Moonview Highway', "Bowser's Castle", 'Rainbow Road'] },
  { id: 'shell', label: 'Panzer-Cup', emoji: '🐢', tracks: ['GCN Peach Beach', 'DS Yoshi Falls', 'SNES Ghost Valley 2', 'N64 Mario Raceway'] },
  { id: 'banana', label: 'Bananen-Cup', emoji: '🍌', tracks: ['N64 Sherbet Land', 'GBA Shy Guy Beach', 'DS Delfino Square', 'GCN Waluigi Stadium'] },
  { id: 'leaf', label: 'Blatt-Cup', emoji: '🍃', tracks: ['DS Desert Hills', 'GBA Bowser Castle 3', "N64 DK's Jungle Parkway", 'GCN Mario Circuit'] },
  { id: 'lightning', label: 'Blitz-Cup', emoji: '⚡', tracks: ['SNES Mario Circuit 3', 'DS Peach Gardens', 'GCN DK Mountain', "N64 Bowser's Castle"] },
];

export const GAMES = [
  { id: 'minecraft', type: 'minecraft', page: 3, label: 'Minecraft', emoji: '⛏️', color: '#4ade80', task: 'Alle Advancements', unit: 'Advancements' },
  { id: 'fortnite', type: 'streak', page: 2, label: 'Fortnite', emoji: '🪂', color: '#a78bfa', goal: 3, task: '3 Siege am Stück (B3B)' },
  { id: 'valorant', type: 'wins', page: 2, label: 'Valorant', emoji: '🔺', color: '#fb7185', goal: 5, task: '5 Siege' },
  { id: 'csgo', type: 'wins', page: 2, label: 'CS:GO', emoji: '💣', color: '#f59e0b', goal: 5, task: '5 Siege' },
  { id: 'fallguys', type: 'wins', page: 2, label: 'Fall Guys', emoji: '👑', color: '#f472b6', goal: 3, task: '3 Siege' },
  { id: 'lethal', type: 'best', page: 2, label: 'Lethal Company', emoji: '🔦', color: '#a3e635', goal: 5, unit: 'Runde', inputLabel: 'Erreichte Runde', min: 1, max: 100, task: 'Bis Runde 5 kommen' },
  { id: 'dino', type: 'best', page: 2, label: 'Dino Run', emoji: '🦖', color: '#d4d4d8', goal: 5000, unit: 'Punkte', inputLabel: 'Punkte', min: 0, max: 999999, task: '5.000 Punkte' },
  { id: 'holeio', type: 'best', page: 2, label: 'Hole.io', emoji: '🕳️', color: '#60a5fa', goal: 100, unit: '%', inputLabel: 'Prozent', min: 0, max: 100, task: '100 % schaffen' },
  { id: 'slither', type: 'rank', page: 2, label: 'Slither.io', emoji: '🐍', color: '#4ade80', goal: 1, unit: 'Platz', inputLabel: 'Erreichter Platz', min: 1, max: 1000, task: 'Platz 1 werden' },
  { id: 'timeguessr', type: 'sum', page: 2, label: 'TimeGuessr', emoji: '🕰️', color: '#fbbf24', goal: 2000000, unit: 'Punkte', inputLabel: 'Punkte dieses Spiels', min: 0, max: 50000, task: '2 Mio. Punkte gesamt' },
  { id: 'subway', type: 'best', page: 2, label: 'Subway Surfers', emoji: '🛹', color: '#22d3ee', goal: 10000000, unit: 'Punkte', inputLabel: 'Score', min: 0, max: 999999999, task: '10 Mio. Punkte' },
  { id: 'freestyle', type: 'task', page: 2, label: 'Freestyle', emoji: '🎤', color: '#e879f9', goal: 1, task: 'Einen Freestyle machen' },
  { id: 'wwm', type: 'task', page: 2, label: 'Wer wird Millionär', emoji: '💰', color: '#38bdf8', goal: 1, task: 'Einmal durchspielen' },
  { id: 'mariokart', type: 'trophies', page: 3, label: 'Mario Kart Wii', emoji: '🏎️', color: '#ef4444', goal: MARIO_KART_CUPS.length, unit: 'Gold-Pokale', task: 'Alle 8 Cups in 150cc auf Gold', items: MARIO_KART_CUPS },
  { id: 'justdance', type: 'checklist', page: 3, label: 'Just Dance 2016', emoji: '💃', color: '#f0abfc', goal: JUST_DANCE_SONGS.length, unit: 'Songs', task: 'Jeden Song einmal tanzen', items: JUST_DANCE_SONGS },
];

const byId = new Map(GAMES.map((g) => [g.id, g]));

export function getGame(id) {
  return byId.get(id) ?? null;
}

const fmt = (n) => Number(n).toLocaleString('de-DE');

function itemOf(game, itemId) {
  return game.items?.find((i) => i.id === itemId) ?? null;
}

// Prüft eine Eingabe aus der App; wirft einen verständlichen Fehler
export function validateEntry(game, { value, item }) {
  const v = Number(value);
  if (!Number.isInteger(v) && game.type !== 'best') throw new Error('Bitte eine ganze Zahl eingeben');
  switch (game.type) {
    case 'wins':
    case 'streak':
      if (v !== 0 && v !== 1) throw new Error('Nur Sieg (1) oder Niederlage (0)');
      return { value: v, item: null };
    case 'best':
    case 'rank':
    case 'sum':
      if (v < game.min || v > game.max) throw new Error(`Wert muss zwischen ${fmt(game.min)} und ${fmt(game.max)} liegen`);
      return { value: v, item: null };
    case 'task':
      return { value: 1, item: null };
    case 'trophies':
      if (!itemOf(game, item)) throw new Error('Unbekannter Cup');
      if (v < 0 || v > 3) throw new Error('Pokal: 1 Gold, 2 Silber, 3 Bronze, 0 keiner');
      return { value: v, item };
    case 'checklist':
      if (!itemOf(game, item)) throw new Error('Unbekannter Eintrag');
      if (v !== 0 && v !== 1) throw new Error('Nur abhaken (1) oder zurücknehmen (0)');
      return { value: v, item };
    default:
      throw new Error('Für dieses Spiel gibt es keine manuelle Eingabe');
  }
}

function topBy(map, compare, limit = 3) {
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort(compare)
    .slice(0, limit);
}

const desc = (a, b) => b.value - a.value;
const asc = (a, b) => a.value - b.value;

// Letzter Stand pro Eintrag (Cup/Song) – der jüngste Eintrag gewinnt
function latestPerItem(entries) {
  const latest = new Map();
  for (const e of entries) latest.set(e.item, e);
  return latest;
}

// Fortschritt eines Spiels aus seinen (nicht zurückgenommenen) Einträgen, älteste zuerst
export function computeGame(game, entries, minecraft = null) {
  const base = {
    id: game.id,
    type: game.type,
    page: game.page,
    label: game.label,
    emoji: game.emoji,
    color: game.color,
    task: game.task,
    unit: game.unit ?? null,
    inputLabel: game.inputLabel ?? null,
    min: game.min ?? null,
    max: game.max ?? null,
    goal: game.goal ?? 0,
  };
  const history = entries
    .slice(-12)
    .reverse()
    .map((e) => ({ id: e.id, name: e.name, value: e.value, item: e.item, createdAt: e.createdAt }));

  let value = 0;
  let percent = 0;
  let completed = false;
  let display = '';
  let leaders = [];
  const extra = {};

  switch (game.type) {
    case 'wins': {
      const wins = entries.filter((e) => e.value === 1);
      value = wins.length;
      const perPlayer = new Map();
      for (const e of wins) perPlayer.set(e.name, (perPlayer.get(e.name) ?? 0) + 1);
      leaders = topBy(perPlayer, desc);
      extra.losses = entries.length - wins.length;
      completed = value >= game.goal;
      percent = Math.min(100, (value / game.goal) * 100);
      display = `${value} / ${game.goal} Siege`;
      break;
    }
    case 'streak': {
      let current = 0;
      let best = 0;
      for (const e of entries) {
        current = e.value === 1 ? current + 1 : 0;
        best = Math.max(best, current);
      }
      value = current;
      extra.bestStreak = best;
      extra.wins = entries.filter((e) => e.value === 1).length;
      extra.losses = entries.length - extra.wins;
      completed = best >= game.goal;
      percent = completed ? 100 : (current / game.goal) * 100;
      display = completed ? `B3B geschafft!` : `Serie ${current} / ${game.goal}`;
      const perPlayer = new Map();
      for (const e of entries.filter((x) => x.value === 1)) perPlayer.set(e.name, (perPlayer.get(e.name) ?? 0) + 1);
      leaders = topBy(perPlayer, desc);
      break;
    }
    case 'best': {
      const perPlayer = new Map();
      for (const e of entries) perPlayer.set(e.name, Math.max(perPlayer.get(e.name) ?? -Infinity, e.value));
      value = entries.length ? Math.max(...entries.map((e) => e.value)) : 0;
      leaders = topBy(perPlayer, desc);
      completed = value >= game.goal;
      percent = Math.min(100, (value / game.goal) * 100);
      display = game.unit === 'Runde' ? `Runde ${value} / ${game.goal}` : `${fmt(value)} / ${fmt(game.goal)}${game.unit === '%' ? ' %' : ''}`;
      break;
    }
    case 'rank': {
      const perPlayer = new Map();
      for (const e of entries) perPlayer.set(e.name, Math.min(perPlayer.get(e.name) ?? Infinity, e.value));
      value = entries.length ? Math.min(...entries.map((e) => e.value)) : 0;
      leaders = topBy(perPlayer, asc);
      completed = value > 0 && value <= game.goal;
      percent = value > 0 ? Math.min(100, (game.goal / value) * 100) : 0;
      display = value ? `Bester Platz: ${value}` : 'Noch kein Platz';
      break;
    }
    case 'sum': {
      const perPlayer = new Map();
      for (const e of entries) perPlayer.set(e.name, (perPlayer.get(e.name) ?? 0) + e.value);
      value = entries.reduce((s, e) => s + e.value, 0);
      leaders = topBy(perPlayer, desc);
      completed = value >= game.goal;
      percent = Math.min(100, (value / game.goal) * 100);
      display = `${fmt(value)} / ${fmt(game.goal)}`;
      break;
    }
    case 'task': {
      const doers = [...new Set(entries.map((e) => e.name))];
      value = doers.length ? 1 : 0;
      completed = value === 1;
      percent = completed ? 100 : 0;
      leaders = doers.map((name) => ({ name, value: 1 }));
      display = completed ? `Geschafft von ${doers[0]}` : 'Noch offen';
      break;
    }
    case 'trophies': {
      const latest = latestPerItem(entries);
      extra.items = game.items.map((cup) => {
        const e = latest.get(cup.id);
        return { ...cup, trophy: e?.value ?? 0, by: e && e.value > 0 ? e.name : null, at: e?.createdAt ?? null };
      });
      value = extra.items.filter((i) => i.trophy === 1).length;
      const perPlayer = new Map();
      for (const i of extra.items) if (i.trophy === 1) perPlayer.set(i.by, (perPlayer.get(i.by) ?? 0) + 1);
      leaders = topBy(perPlayer, desc);
      completed = value >= game.goal;
      percent = (value / game.goal) * 100;
      display = `${value} / ${game.goal} Gold`;
      break;
    }
    case 'checklist': {
      const latest = latestPerItem(entries);
      extra.items = game.items.map((item) => {
        const e = latest.get(item.id);
        const done = e?.value === 1;
        return { ...item, done, by: done ? e.name : null, at: done ? e.createdAt : null };
      });
      value = extra.items.filter((i) => i.done).length;
      const perPlayer = new Map();
      for (const i of extra.items) if (i.done) perPlayer.set(i.by, (perPlayer.get(i.by) ?? 0) + 1);
      leaders = topBy(perPlayer, desc);
      completed = value >= game.goal;
      percent = (value / game.goal) * 100;
      display = `${value} / ${game.goal} Songs`;
      break;
    }
    case 'minecraft': {
      const catalog = minecraft?.catalog ?? [];
      const firstBy = new Map();
      const perPlayer = new Map();
      for (const e of entries) {
        if (!firstBy.has(e.item)) firstBy.set(e.item, e);
        perPlayer.set(e.name, (perPlayer.get(e.name) ?? 0) + 1);
      }
      extra.items = catalog.map((a) => {
        const e = firstBy.get(a.id);
        return { id: a.id, tab: a.tab, title: a.title, titleEn: a.titleEn, description: a.description, frame: a.frame, done: Boolean(e), by: e?.name ?? null, at: e?.createdAt ?? null };
      });
      extra.tabs = ['story', 'nether', 'end', 'adventure', 'husbandry'].map((tab) => {
        const items = extra.items.filter((i) => i.tab === tab);
        return { tab, done: items.filter((i) => i.done).length, total: items.length };
      });
      extra.sync = minecraft?.status ?? null;
      base.goal = catalog.length;
      value = extra.items.filter((i) => i.done).length;
      leaders = topBy(perPlayer, desc, 5);
      completed = base.goal > 0 && value >= base.goal;
      percent = base.goal ? (value / base.goal) * 100 : 0;
      display = `${value} / ${base.goal}`;
      break;
    }
    default:
      break;
  }

  return {
    ...base,
    value,
    display,
    percent: Math.round(percent * 10) / 10,
    completed,
    leaders,
    history,
    plays: entries.length,
    ...extra,
  };
}

// Ticker-Text für eine neue Eingabe; after = Spielstand nach der Eingabe
export function buildGameMessage(game, entry, after) {
  const { name, value, item } = entry;
  const head = `${game.emoji} ${game.label}:`;
  switch (game.type) {
    case 'wins':
      return value === 1
        ? `${head} SIEG für ${name}! (${after.value}/${game.goal}) 🏆`
        : `${head} Niederlage für ${name} 💀`;
    case 'streak':
      return value === 1
        ? `${head} SIEG für ${name}! Serie ${after.value}/${game.goal} 🔥`
        : `${head} Niederlage für ${name} – Serie gerissen 💀`;
    case 'best':
      return value >= after.value && value > 0
        ? `${head} ${name} schafft ${game.unit === 'Runde' ? `Runde ${value}` : fmt(value) + (game.unit === '%' ? ' %' : ' Punkte')} – neuer Rekord! 🚀`
        : `${head} ${name} schafft ${game.unit === 'Runde' ? `Runde ${value}` : fmt(value) + (game.unit === '%' ? ' %' : ' Punkte')}`;
    case 'rank':
      return value === 1 ? `${head} ${name} wird ERSTER! 👑` : `${head} ${name} landet auf Platz ${value}`;
    case 'sum':
      return `${head} ${name} holt ${fmt(value)} Punkte (gesamt ${fmt(after.value)}) 🕰️`;
    case 'task':
      return `${head} ${name} hat's geschafft! 🎉`;
    case 'trophies': {
      const cup = itemOf(game, item);
      if (value === 0) return `${head} ${cup.label} wieder offen`;
      return value === 1
        ? `${head} ${name} holt GOLD im ${cup.label}! 🥇 (${after.value}/${game.goal})`
        : `${head} ${name} holt ${TROPHY_LABELS[value]} im ${cup.label} ${value === 2 ? '🥈' : '🥉'}`;
    }
    case 'checklist': {
      const song = itemOf(game, item);
      return value === 1
        ? `${head} ${name} hat „${song.title}" getanzt! (${after.value}/${game.goal})`
        : `${head} „${song.title}" wieder offen`;
    }
    default:
      return `${head} ${name}`;
  }
}

export function buildMinecraftMessage(name, title, after) {
  return `⛏️ Minecraft: ${name} hat „${title}" erreicht! (${after.value}/${after.goal})`;
}

export function buildGameCompleteMessage(game, name) {
  return `🏆 GAME GESCHAFFT: ${game.emoji} ${game.label} – ${game.task}! Den letzten Schritt machte ${name}!`;
}
