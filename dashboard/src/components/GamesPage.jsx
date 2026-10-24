import { colorStyle } from '../config.js';

const fmt = (n) => Number(n).toLocaleString('de-DE');
const HISTORY_DOTS = 12;

// Seite 2: alle Games mit Ziel, Fortschritt und Verlauf
export function GamesPage({ games, flashes }) {
  const list = games.list.filter((g) => g.page === 2);
  return (
    <main className="page-in grid min-h-0 flex-1 grid-cols-4 grid-rows-3 gap-[1.2vw] px-[2.2vw] py-[1.8vh]">
      {list.map((game) => (
        <GameCard key={game.id} game={game} flash={flashes[game.id]} />
      ))}
    </main>
  );
}

function GameCard({ game, flash }) {
  return (
    <section
      style={colorStyle(game.color)}
      className={`challenge-row panel panel-accent flex min-h-0 flex-col gap-[0.8vh] overflow-hidden px-[1.2vw] py-[1.3vh] ${
        game.completed ? 'is-complete' : ''
      }`}
    >
      {flash && <div key={flash.key} className="row-pulse pointer-events-none absolute inset-0 rounded-[1.4vh]" />}

      <header className="flex items-center justify-between gap-[0.6vw]">
        <div className="flex min-w-0 items-center gap-[0.5vw]">
          <span className="text-[3vh] leading-none">{game.emoji}</span>
          <span className="truncate font-display text-[2.1vh] font-black tracking-[0.06em] uppercase">{game.label}</span>
        </div>
        {game.completed && (
          <span className="complete-badge shrink-0 rounded-[0.6vh] bg-yellow-400 px-[0.5vw] py-[0.2vh] font-display text-[1.2vh] font-black tracking-widest text-black">
            ✔ GESCHAFFT
          </span>
        )}
      </header>
      <div className="text-[1.6vh] font-semibold text-muted">{game.task}</div>

      <div
        className={`text-accent font-display leading-none font-black whitespace-nowrap tabular-nums ${
          game.display.length > 17 ? 'text-[2.3vh]' : game.display.length > 13 ? 'text-[2.8vh]' : 'text-[3.6vh]'
        }`}
      >
        {game.display}
      </div>

      <div className="relative h-[1.6vh] shrink-0">
        <div className="bar-track">
          <div className="bar-fill" style={{ width: `${Math.min(game.percent, 100)}%` }} />
        </div>
      </div>

      <div className="mt-auto flex min-h-0 flex-col gap-[0.6vh]">
        <GameHistory game={game} />
        <GameLeaders game={game} />
      </div>
    </section>
  );
}

function GameHistory({ game }) {
  if (game.type === 'wins' || game.type === 'streak') {
    const results = game.history.slice(0, HISTORY_DOTS).reverse();
    return (
      <div className="flex items-center gap-[0.35vw]">
        {results.length === 0 ? (
          <span className="text-[1.5vh] text-white/35">Noch keine Runde gespielt</span>
        ) : (
          results.map((h) => (
            <span
              key={h.id}
              title={h.name}
              className={`grid h-[2.4vh] w-[2.4vh] place-items-center rounded-[0.5vh] font-display text-[1.3vh] font-black ${
                h.value === 1 ? 'bg-emerald-400 text-black' : 'bg-rose-500/80 text-white'
              }`}
            >
              {h.value === 1 ? 'W' : 'L'}
            </span>
          ))
        )}
        <span className="ml-auto text-[1.4vh] font-semibold text-muted">
          {game.type === 'streak' ? `Beste Serie ${game.bestStreak} · ` : ''}
          {game.type === 'wins' ? `${game.losses} L` : `${game.wins} W / ${game.losses} L`}
        </span>
      </div>
    );
  }
  if (game.type === 'task') return null;
  const recent = game.history.slice(0, 2);
  if (!recent.length) return <span className="text-[1.5vh] text-white/35">Noch kein Versuch</span>;
  return (
    <div className="flex flex-col gap-[0.2vh]">
      {recent.map((h) => (
        <div key={h.id} className="flex justify-between text-[1.5vh] font-semibold text-white/70">
          <span className="truncate">{h.name}</span>
          <span className="font-display tabular-nums">
            {game.type === 'rank' ? `Platz ${h.value}` : game.unit === 'Runde' ? `Runde ${h.value}` : fmt(h.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

function GameLeaders({ game }) {
  if (!game.leaders.length) return null;
  const leader = game.leaders[0];
  let text;
  switch (game.type) {
    case 'wins':
    case 'streak':
      text = `${leader.value} ${leader.value === 1 ? 'Sieg' : 'Siege'}`;
      break;
    case 'rank':
      text = `Platz ${leader.value}`;
      break;
    case 'task':
      text = game.leaders.length > 1 ? `+ ${game.leaders.length - 1} weitere` : 'erledigt';
      break;
    default:
      text = game.unit === 'Runde' ? `Runde ${leader.value}` : fmt(leader.value);
  }
  return (
    <div className="flex items-center justify-between rounded-[0.7vh] bg-white/5 px-[0.6vw] py-[0.4vh] text-[1.6vh] font-bold">
      <span className="truncate">👑 {leader.name}</span>
      <span className="text-accent shrink-0 font-display">{text}</span>
    </div>
  );
}
