import { themeStyle } from '../config.js';
import { useAnimatedNumber } from '../hooks/useAnimatedNumber.js';
import { dartLabel } from '../lib/darts.js';

const MAX_GAMES = 2;
const MAX_PLAYERS_PER_CARD = 4;
const RECENT_THROWS = 4;

// Großes Darts-Panel: Team-Countdown von 10.001, Live-Spiele bzw. letzte Würfe
export function DartsPanel({ challenge, darts, recentEvents, milestoneSteps, pops, flash, fillRef }) {
  const animatedRemaining = useAnimatedNumber(darts.remaining, 900);
  const fillPercent = Math.min(challenge.percent, 100);
  const reached = new Set(challenge.milestonesReached.map((m) => m.percent));
  const games = darts.activeGames.slice(0, MAX_GAMES);
  const recentThrows = recentEvents
    .filter((e) => e.challengeId === 'darts' && e.type === 'tick' && e.dart)
    .slice(0, RECENT_THROWS);

  return (
    <section
      style={themeStyle('darts')}
      className={`challenge-row panel relative flex min-h-0 flex-col overflow-hidden px-[1.4vw] py-[1.4vh] ${
        challenge.completed ? 'is-complete' : ''
      }`}
    >
      {flash && <div key={flash.key} className="row-pulse pointer-events-none absolute inset-0 rounded-[1.4vh]" />}
      <div className="dart-board-bg pointer-events-none absolute -top-[8vh] -right-[8vh] h-[30vh] w-[30vh] rounded-full opacity-[0.12]" />

      <header className="flex items-center justify-between">
        <div className="flex items-center gap-[0.6vw]">
          <span className="text-[3.4vh] leading-none">🎯</span>
          <span className="text-accent font-display text-[2.6vh] font-black tracking-[0.12em]">DARTS</span>
          <span className="text-[1.6vh] font-bold tracking-[0.25em] text-muted uppercase">
            Team-Countdown {challenge.goal.toLocaleString('de-DE')}
          </span>
        </div>
        <div className="flex items-center gap-[0.8vw] text-[1.9vh] font-bold text-white/80">
          <span>
            Ø <span className="text-accent font-display">{darts.average.toLocaleString('de-DE')}</span>
          </span>
          <span>
            <span className="text-accent font-display">{darts.count180}</span>× 180
          </span>
        </div>
      </header>

      <div className="mt-[0.6vh] flex items-end justify-between gap-[1vw]">
        <div className="flex items-baseline gap-[0.8vw]">
          <span className="font-display text-[2.2vh] font-black tracking-[0.2em] text-white/60">
            {challenge.completed ? 'GESCHAFFT!' : 'NOCH'}
          </span>
          <span className="text-accent font-display text-[9vh] leading-[0.95] font-black tabular-nums">
            {Math.round(animatedRemaining).toLocaleString('de-DE')}
          </span>
        </div>
        <div className="pb-[0.8vh] text-right text-[1.8vh] leading-snug font-semibold text-muted">
          <div>
            <span className="font-display font-bold text-white">{challenge.total.toLocaleString('de-DE')}</span>{' '}
            Punkte geworfen
          </div>
          <div>
            <span className="font-display font-bold text-white">{darts.darts.toLocaleString('de-DE')}</span> Darts ·{' '}
            <span className="font-display font-bold text-white">
              {challenge.percent.toLocaleString('de-DE', { maximumFractionDigits: 1 })}%
            </span>
          </div>
        </div>
      </div>

      <div className="relative mt-[0.8vh] h-[2.6vh] shrink-0">
        <div className="bar-track">
          <div ref={fillRef} className="bar-fill" style={{ width: `${fillPercent}%` }} />
          {flash && <div key={flash.key} className="bar-flash" style={{ '--x': `${fillPercent}%` }} />}
        </div>
        {milestoneSteps
          .filter((step) => step < 100)
          .map((step) => (
            <div key={step} className={`milestone-mark ${reached.has(step) ? 'is-reached' : ''}`} style={{ left: `${step}%` }} />
          ))}
        {pops.map((pop) => (
          <div
            key={pop.id}
            className="pop flex items-baseline gap-[0.4vw] font-display"
            style={{ left: `${Math.min(Math.max(fillPercent, 6), 88)}%` }}
          >
            <span className={`text-[3.2vh] font-black ${pop.bust ? 'text-white/70' : 'text-accent'}`}>
              {pop.bust ? 'BUST' : `+${pop.amount}`}
            </span>
            <span className="text-[1.9vh] font-bold text-white drop-shadow-[0_0_1vh_rgba(0,0,0,0.9)]">{pop.name}</span>
          </div>
        ))}
      </div>

      <div className="mt-[1.6vh] flex min-h-0 flex-1 flex-col">
        <div className="mb-[0.8vh] flex items-center gap-[0.5vw] text-[1.5vh] font-bold tracking-[0.3em] text-muted uppercase">
          {games.length > 0 ? (
            <>
              <span className="live-dot inline-block h-[1vh] w-[1vh] rounded-full bg-rose-500" />
              Live-Spiele
              {darts.activeGames.length > games.length && (
                <span className="tracking-normal normal-case">(+{darts.activeGames.length - games.length} weitere)</span>
              )}
            </>
          ) : (
            'Letzte Würfe'
          )}
        </div>

        {games.length > 0 ? (
          <div className={`grid min-h-0 flex-1 gap-[0.8vw] ${games.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {games.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        ) : recentThrows.length > 0 ? (
          <ul className="flex flex-col gap-[0.6vh]">
            {recentThrows.map((e) => (
              <li key={e.id} className="flex items-center justify-between rounded-[0.8vh] bg-white/5 px-[0.8vw] py-[0.5vh]">
                <span className="truncate text-[2vh] font-bold text-white/90">{e.name}</span>
                <span className="flex items-center gap-[0.4vw]">
                  {e.dart.darts.map((d, i) => (
                    <DartChip key={i} dart={d} />
                  ))}
                  <span className={`ml-[0.4vw] min-w-[3.5vw] text-right font-display text-[2.1vh] font-black ${e.dart.bust ? 'text-white/40' : 'text-accent'}`}>
                    {e.dart.bust ? 'BUST' : e.dart.raw}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="grid flex-1 place-items-center text-center text-[2vh] font-semibold text-white/40">
            Noch kein Dart geworfen – Dart-Tracker in der App öffnen! 🎯
          </div>
        )}
      </div>
    </section>
  );
}

function GameCard({ game }) {
  const shown = game.players.slice(0, MAX_PLAYERS_PER_CARD);
  return (
    <div className="flex min-h-0 flex-col rounded-[1vh] border border-white/10 bg-black/30 px-[0.8vw] py-[0.8vh]">
      <div className="mb-[0.5vh] flex items-center justify-between text-[1.5vh] font-bold tracking-wider text-muted">
        <span>
          <span className="font-display text-white/80">{game.startScore}</span>
          {game.doubleOut ? ' · Double Out' : ' · Single Out'}
        </span>
        <span>Runde {game.round}</span>
      </div>
      <ul className="flex flex-col gap-[0.35vh]">
        {shown.map((p) => {
          const current = p.name === game.currentPlayer;
          return (
            <li
              key={p.name}
              className={`flex items-center justify-between rounded-[0.6vh] px-[0.5vw] py-[0.25vh] ${current ? 'game-current' : ''}`}
            >
              <span className={`truncate text-[1.9vh] font-bold ${current ? 'text-white' : 'text-white/70'}`}>
                {current ? '▶ ' : ''}
                {p.name}
              </span>
              <span className="flex items-baseline gap-[0.5vw]">
                <span className="text-[1.4vh] font-semibold text-muted">Ø {p.average.toLocaleString('de-DE')}</span>
                <span className={`font-display text-[2.4vh] font-black tabular-nums ${current ? 'text-accent' : 'text-white'}`}>
                  {p.remaining}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
      {game.players.length > shown.length && (
        <div className="mt-[0.3vh] text-[1.3vh] text-muted">+ {game.players.length - shown.length} weitere</div>
      )}
    </div>
  );
}

function DartChip({ dart }) {
  const strong = dart.multiplier >= 2;
  return (
    <span
      className={`min-w-[2.6vw] rounded-[0.5vh] px-[0.3vw] py-[0.1vh] text-center font-display text-[1.5vh] font-bold ${
        strong ? 'bg-[var(--c)] text-black' : 'bg-white/10 text-white/80'
      }`}
    >
      {dartLabel(dart)}
    </span>
  );
}
