import { colorStyle } from '../config.js';

const TROPHY = { 1: '🥇', 2: '🥈', 3: '🥉' };
const TAB_LABELS = { story: 'Minecraft', nether: 'Nether', end: 'Das Ende', adventure: 'Abenteuer', husbandry: 'Landwirtschaft' };

// Seite 3: Mario-Kart-Pokale, Minecraft-Advancements und Just-Dance-Songs
export function CollectionsPage({ games, flashes }) {
  const find = (id) => games.list.find((g) => g.id === id);
  const mariokart = find('mariokart');
  const minecraft = find('minecraft');
  const justdance = find('justdance');
  return (
    <main className="page-in grid min-h-0 flex-1 grid-cols-[1fr_1.05fr_1.25fr] gap-[1.2vw] px-[2.2vw] py-[1.8vh]">
      {mariokart && <MarioKartPanel game={mariokart} flash={flashes.mariokart} />}
      {minecraft && <MinecraftPanel game={minecraft} flash={flashes.minecraft} />}
      {justdance && <JustDancePanel game={justdance} flash={flashes.justdance} />}
    </main>
  );
}

function PanelHeader({ game }) {
  return (
    <header className="mb-[1vh] flex items-center justify-between gap-[0.6vw]">
      <div className="flex min-w-0 items-center gap-[0.6vw]">
        <span className="text-[3.4vh] leading-none">{game.emoji}</span>
        <div className="min-w-0">
          <div className="text-accent truncate font-display text-[2.3vh] font-black tracking-[0.08em] uppercase">{game.label}</div>
          <div className="truncate text-[1.5vh] font-semibold text-muted">{game.task}</div>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className="text-accent font-display text-[3.4vh] leading-none font-black tabular-nums">
          {game.value}
          <span className="text-[2vh] text-white/50">/{game.goal}</span>
        </div>
        {game.completed && <div className="font-display text-[1.3vh] font-black tracking-widest text-yellow-300">✔ GESCHAFFT</div>}
      </div>
    </header>
  );
}

function ProgressBar({ percent }) {
  return (
    <div className="relative mb-[1.2vh] h-[1.6vh] shrink-0">
      <div className="bar-track">
        <div className="bar-fill" style={{ width: `${Math.min(percent, 100)}%` }} />
      </div>
    </div>
  );
}

function FlashLayer({ flash }) {
  return flash ? <div key={flash.key} className="row-pulse pointer-events-none absolute inset-0 rounded-[1.4vh]" /> : null;
}

function MarioKartPanel({ game, flash }) {
  return (
    <section style={colorStyle(game.color)} className={`challenge-row panel flex min-h-0 flex-col px-[1.1vw] py-[1.4vh] ${game.completed ? 'is-complete' : ''}`}>
      <FlashLayer flash={flash} />
      <PanelHeader game={game} />
      <ProgressBar percent={game.percent} />
      <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-4 gap-[0.7vw]">
        {game.items.map((cup) => (
          <div
            key={cup.id}
            className={`flex min-h-0 flex-col justify-center rounded-[1vh] border px-[0.7vw] py-[0.6vh] ${
              cup.trophy === 1 ? 'border-yellow-400/70 bg-yellow-400/10 shadow-[0_0_2vh_rgba(250,204,21,0.25)]' : 'border-white/10 bg-black/25'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[2.6vh]">{cup.emoji}</span>
              <span className={`text-[3vh] ${cup.trophy ? '' : 'opacity-25 grayscale'}`}>{TROPHY[cup.trophy] ?? '🏆'}</span>
            </div>
            <div className="truncate font-display text-[1.6vh] font-bold">{cup.label}</div>
            <div className="truncate text-[1.3vh] font-semibold text-muted">
              {cup.trophy ? `${cup.trophy === 1 ? 'Gold' : cup.trophy === 2 ? 'Silber' : 'Bronze'} · ${cup.by}` : 'noch offen'}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// Klickbare Advancement-Liste: Tap auf ein Advancement zeigt, was zu tun ist (Beschreibung), plus englischer Titel.
function MinecraftPanel({ game, flash }) {
  const titles = new Map(game.items.map((i) => [i.id, i.title]));
  // jedes Advancement nur einmal (wer es zuletzt bekommen hat)
  const seen = new Set();
  const recent = game.history
    .filter((h) => titles.has(h.item) && !seen.has(h.item) && seen.add(h.item))
    .slice(0, 6);
  const sync = game.sync;
  return (
    <section style={colorStyle(game.color)} className={`challenge-row panel flex min-h-0 flex-col px-[1.1vw] py-[1.4vh] ${game.completed ? 'is-complete' : ''}`}>
      <FlashLayer flash={flash} />
      <PanelHeader game={game} />
      <ProgressBar percent={game.percent} />

      <div className="flex flex-col gap-[0.7vh]">
        {game.tabs.map((tab) => (
          <div key={tab.tab} className="flex items-center gap-[0.6vw]">
            <span className="w-[7.5vw] truncate text-[1.6vh] font-bold text-white/80">{TAB_LABELS[tab.tab]}</span>
            <div className="h-[1vh] flex-1 overflow-hidden rounded-full bg-white/5">
              <div className="lb-bar h-full rounded-full" style={{ width: `${tab.total ? (tab.done / tab.total) * 100 : 0}%` }} />
            </div>
            <span className="w-[3.5vw] text-right font-display text-[1.5vh] font-bold tabular-nums">
              {tab.done}/{tab.total}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-[1.4vh] mb-[0.5vh] text-[1.4vh] font-bold tracking-[0.25em] text-muted uppercase">Zuletzt erreicht</div>
      <ul className="flex min-h-0 flex-1 flex-col gap-[0.4vh] overflow-hidden">
        {recent.length === 0 ? (
          <li className="text-[1.6vh] text-white/40">Noch nichts – ab in die Welt! ⛏️</li>
        ) : (
          recent.map((h) => (
            <li key={h.id} className="flex items-center justify-between gap-[0.5vw] rounded-[0.6vh] bg-white/5 px-[0.6vw] py-[0.35vh]">
              <span className="truncate text-[1.6vh] font-bold">
                {titles.get(h.item)}
                {h.createdAt && (
                  <span className="ml-[0.4vw] text-[1.2vh] font-semibold text-muted tabular-nums">
                    {new Date(h.createdAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </span>
              <span className="text-accent shrink-0 text-[1.4vh] font-bold">{h.name}</span>
            </li>
          ))
        )}
      </ul>

      <div className="mt-[0.8vh] flex items-center justify-between text-[1.3vh] font-semibold text-muted">
        <span className="truncate">
          {game.leaders.length ? `👑 ${game.leaders.map((l) => `${l.name} ${l.value}`).slice(0, 3).join(' · ')}` : ''}
        </span>
        <span className={`shrink-0 ${sync?.ok ? 'text-emerald-400' : 'text-rose-400'}`}>
          {sync?.ok ? `● Sync ${sync.version ?? ''}` : '● kein Sync'}
        </span>
      </div>
    </section>
  );
}

function JustDancePanel({ game, flash }) {
  return (
    <section style={colorStyle(game.color)} className={`challenge-row panel flex min-h-0 flex-col px-[1.1vw] py-[1.4vh] ${game.completed ? 'is-complete' : ''}`}>
      <FlashLayer flash={flash} />
      <PanelHeader game={game} />
      <ProgressBar percent={game.percent} />
      <div className="grid min-h-0 flex-1 auto-rows-fr grid-cols-3 gap-[0.35vw]">
        {game.items.map((song) => (
          <div
            key={song.id}
            className={`flex min-h-0 flex-col justify-center overflow-hidden rounded-[0.6vh] px-[0.4vw] ${
              song.done ? 'bg-[var(--c)] text-black shadow-[0_0_1vh_var(--glow)]' : 'bg-white/5 text-white/45'
            }`}
          >
            <span className="truncate text-[1.25vh] leading-tight font-bold">{song.title}</span>
            {song.done && <span className="truncate text-[1.05vh] leading-tight font-semibold opacity-75">💃 {song.by}</span>}
          </div>
        ))}
      </div>
    </section>
  );
}
