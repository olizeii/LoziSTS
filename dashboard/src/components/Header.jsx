import { EVENT_TITLE } from '../config.js';
import { useAnimatedNumber } from '../hooks/useAnimatedNumber.js';
import { useClock } from '../hooks/useClock.js';

export function Header({ state, connected, muted, onToggleMute }) {
  const clock = useClock();
  const overall = state
    ? state.challenges.reduce((sum, c) => sum + Math.min(c.percent, 100), 0) / state.challenges.length
    : 0;
  const animatedOverall = useAnimatedNumber(overall);
  const animatedEvents = useAnimatedNumber(state?.eventCount ?? 0);

  return (
    <header className="flex items-center justify-between gap-[2vw] px-[2.2vw] pt-[2vh]">
      <div className="flex items-center gap-[1.2vw]">
        <div className="grid h-[6.5vh] w-[6.5vh] place-items-center rounded-[1.2vh] border border-white/10 bg-white/5 text-[3.6vh] shadow-[0_0_3vh_rgba(168,85,247,0.35)]">
          🎮
        </div>
        <div>
          <h1 className="title-gradient font-display text-[4.2vh] leading-none font-black tracking-[0.12em] uppercase">
            {EVENT_TITLE}
          </h1>
          <p className="mt-[0.6vh] text-[1.9vh] font-semibold tracking-[0.35em] text-muted uppercase">
            Gemeinsam knacken wir alle 4 Challenges
          </p>
        </div>
      </div>

      <div className="flex items-center gap-[1vw]">
        <Stat label="Gesamt" value={`${animatedOverall.toFixed(1)}%`} highlight />
        <Stat label="Spieler" value={state?.players ?? 0} />
        <Stat label="Ticks" value={Math.round(animatedEvents)} />

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

function Stat({ label, value, highlight = false }) {
  return (
    <div className="flex h-[7vh] min-w-[7.5vw] flex-col items-center justify-center rounded-[1.2vh] border border-white/10 bg-white/5 px-[1vw]">
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
