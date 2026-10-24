import { EVENT_TITLE, PAGES, ROTATE_SECONDS } from '../config.js';
import { AppQrCode } from './AppQrCode.jsx';
import { useAnimatedNumber } from '../hooks/useAnimatedNumber.js';
import { useClock } from '../hooks/useClock.js';

export function Header({ state, connected, muted, onToggleMute, rotation }) {
  const clock = useClock();
  const overall = state
    ? state.challenges.reduce((sum, c) => sum + Math.min(c.percent, 100), 0) / state.challenges.length
    : 0;
  const animatedOverall = useAnimatedNumber(overall);
  const games = state?.games;

  return (
    <header className="flex items-center justify-between gap-[2vw] px-[2.2vw] pt-[2vh]">
      <div className="flex items-center gap-[1.2vw]">
        <div className="grid h-[6.5vh] w-[6.5vh] place-items-center rounded-[1.2vh] border border-white/10 bg-white/5 text-[3.6vh] shadow-[0_0_3vh_rgba(168,85,247,0.35)]">
          🎮
        </div>
        <div>
          <h1 className="title-gradient font-display text-[3.7vh] leading-none font-black tracking-[0.1em] whitespace-nowrap uppercase">
            {EVENT_TITLE}
          </h1>
          <PageTabs rotation={rotation} />
        </div>
      </div>

      <div className="flex items-center gap-[1vw]">
        <Stat label="Gesamt" value={`${animatedOverall.toFixed(1)}%`} highlight />
        <Stat label="Spieler" value={state?.players ?? 0} />
        <Stat label="Games" value={games ? `${games.completed}/${games.total}` : '–'} />
        <AppQrCode />

        <div
          className={`flex h-[7vh] items-center gap-[0.6vw] rounded-[1.2vh] border px-[1vw] font-display text-[1.8vh] font-bold tracking-widest ${
            connected
              ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300'
              : 'border-rose-500/50 bg-rose-500/15 text-rose-300'
          }`}
        >
          <span
            className={`live-dot inline-block h-[1.4vh] w-[1.4vh] rounded-full ${
              connected ? 'bg-emerald-400 shadow-[0_0_1.2vh_#34d399]' : 'bg-rose-500 shadow-[0_0_1.2vh_#f43f5e]'
            }`}
          />
          {connected ? 'LIVE' : 'OFFLINE'}
        </div>

        <button
          type="button"
          onClick={onToggleMute}
          title="Ton an/aus (M)"
          className="grid h-[7vh] w-[7vh] place-items-center rounded-[1.2vh] border border-white/10 bg-white/5 text-[3vh] transition hover:bg-white/10"
        >
          {muted ? '🔇' : '🔊'}
        </button>

        <div className="font-display text-[4.6vh] leading-none font-bold tabular-nums tracking-wider text-white/90">
          {clock}
        </div>
      </div>
    </header>
  );
}

// Seitenanzeige: aktive Seite mit Countdown-Balken bis zum nächsten Wechsel
function PageTabs({ rotation }) {
  if (!rotation) return null;
  return (
    <div className="mt-[0.8vh] flex items-center gap-[0.5vw]">
      {PAGES.map((p, i) => {
        const active = i === rotation.page;
        return (
          <span
            key={p.id}
            className={`relative overflow-hidden rounded-full border px-[0.7vw] py-[0.25vh] text-[1.35vh] font-bold tracking-[0.15em] whitespace-nowrap uppercase ${
              active ? 'border-fuchsia-400/60 bg-fuchsia-500/15 text-white' : 'border-white/10 text-white/35'
            }`}
          >
            {active && (
              <span
                key={rotation.cycleKey}
                className="page-progress absolute inset-y-0 left-0 bg-fuchsia-500/25"
                style={{ animationDuration: `${ROTATE_SECONDS}s`, animationPlayState: rotation.stopped ? 'paused' : 'running' }}
              />
            )}
            <span className="relative">{p.label}</span>
          </span>
        );
      })}
      {rotation.manualPause && <span className="text-[1.3vh] font-bold text-yellow-300">⏸ pausiert (P)</span>}
    </div>
  );
}

function Stat({ label, value, highlight = false }) {
  return (
    <div className="flex h-[7vh] min-w-[6vw] flex-col items-center justify-center rounded-[1.2vh] border border-white/10 bg-white/5 px-[0.8vw]">
      <span className="text-[1.5vh] font-bold tracking-[0.3em] text-muted uppercase">{label}</span>
      <span
        className={`font-display text-[2.8vh] leading-tight font-black tabular-nums ${
          highlight ? 'title-gradient' : 'text-white'
        }`}
      >
        {value}
      </span>
    </div>
  );
}
