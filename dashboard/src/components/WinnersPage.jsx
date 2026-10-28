import { colorStyle } from '../config.js';

const MEDALS = ['🥇', '🥈', '🥉'];

// Deterministischer Titel pro Spieler: Hash aus Name entscheidet die Wortwahl,
// Platz 1 bekommt zusätzlich einen Champion-Titel.
const PREFIX = ['Der Unerschrockene', 'Die Rückenbrecherin', 'Der Bierkönig', 'Die Rubik-Schlangenbeschwörerin', 'Der Pixelwisser', 'Die Wettkampfmaschine', 'Der Tastatur-Terminator', 'Die steinerne Elle', 'Der Ei-Wüterich', 'Die Sprintlegende'];
const SUFFIX = ['von der Couch', 'aus dem Nether', 'der Unbesiegbare', 'die Unbesiegbare', 'des LANs', 'mit dem goldenen Gamepad', 'aus dem Paradies', 'mit Turbo-Reflexen'];
const CHAMPION = ['Champion', 'Grand Master', 'Overlord', 'Prime Winner', 'Alleskönner'];

function hash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function titleFor(name, firsts) {
  const h = hash(name);
  let t = `${PREFIX[h % PREFIX.length]} ${SUFFIX[(h >> 3) % SUFFIX.length]}`;
  if (firsts > 0) t = `${CHAMPION[h % CHAMPION.length]} · ${t}`;
  return t;
}

// Seite 4: Sieger — alle Platzierungen aller Spieler über Challenges + Games
export function WinnersPage({ state }) {
  const boards = state?.leaderboards ?? {};
  const games = state?.games?.list ?? [];

  // points: je 1. Platz 3, Platz 2: 2, Platz 3: 1
  const players = new Map();
  const add = (name, rank, points, board) => {
    const p = players.get(name) ?? { name, firsts: 0, points: 0, podiums: 0, boards: [] };
    if (rank === 1) p.firsts += 1;
    if (rank <= 3) p.podiums += 1;
    p.points += points;
    if (board) p.boards.push({ label: board, rank });
    players.set(name, p);
  };
  for (const [id, entries] of Object.entries(boards)) {
    entries.forEach((e, i) => add(e.name, i + 1, Math.max(0, 3 - i), id));
  }
  for (const g of games) {
    (g.leaders ?? []).forEach((l, i) => add(l.name, i + 1, Math.max(0, 3 - i), g.label));
  }

  const ranked = [...players.values()]
    .map((p) => ({ ...p, title: titleFor(p.name, p.firsts) }))
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));

  return (
    <main className="page-in grid min-h-0 flex-1 grid-cols-[repeat(auto-fit,minmax(16vw,1fr))] gap-[1vw] px-[2.2vw] py-[1.8vh]">
      {ranked.map((p, i) => (
        <section
          key={p.name}
          style={colorStyle(['#facc15', '#e5e7eb', '#fb923c', '#22d3ee', '#a855f7', '#4ade80'][i % 6])}
          className={`panel flex min-h-0 flex-col px-[1vw] py-[1.4vh] ${i === 0 ? 'is-complete' : ''}`}
        >
          <div className="flex items-baseline justify-between gap-[0.4vw]">
            <span className="font-display text-[2.6vh] leading-none">{MEDALS[i] ?? `${i + 1}.`}</span>
            <span className="text-accent font-display text-[2.6vh] font-black tabular-nums">{p.points} <span className="text-[1.5vh] text-white/50">Pts</span></span>
          </div>
          <div className="mt-[0.6vh] truncate font-display text-[2.3vh] font-black uppercase">{p.name}</div>
          <div className="text-accent truncate text-[1.5vh] font-bold">{p.title}</div>
          <div className="mt-[0.5vh] text-[1.3vh] font-semibold text-muted">
            {p.firsts}× 1. Platz · {p.podiums}× Podest
          </div>
          <ol className="mt-[0.6vh] flex-1 overflow-y-auto text-[1.35vh] font-semibold text-white/75">
            {p.boards.sort((a, b) => a.rank - b.rank).map((b, j) => (
              <li key={j} className="flex justify-between gap-[0.4vw]">
                <span className="truncate">{b.label}</span>
                <span className="shrink-0">{MEDALS[b.rank - 1] ?? `${b.rank}.`}</span>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </main>
  );
}
