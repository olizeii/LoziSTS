import { LEADERBOARD_SIZE, themeStyle } from '../config.js';

const MEDALS = ['🥇', '🥈', '🥉'];

export function Leaderboard({ challenge, entries, hot }) {
  const top = entries.slice(0, LEADERBOARD_SIZE);
  const rest = entries.length - top.length;
  const leaderTotal = top[0]?.total || 1;

  return (
    <section style={themeStyle(challenge.id)} className="panel flex min-h-0 flex-col overflow-hidden px-[1.1vw] py-[1.4vh]">
      <header className="mb-[1vh] flex items-center justify-between border-b border-white/10 pb-[0.9vh]">
        <div className="flex items-center gap-[0.5vw]">
          <span className="text-[2.8vh]">{challenge.emoji}</span>
          <span className="text-accent font-display text-[1.9vh] font-black tracking-[0.12em] uppercase">
            {challenge.label}
          </span>
        </div>
        <span className="text-[1.5vh] font-bold tracking-[0.25em] text-muted uppercase">Top {LEADERBOARD_SIZE}</span>
      </header>

      {top.length === 0 ? (
        <div className="grid flex-1 place-items-center text-center text-[2vh] font-semibold text-white/40">
          Noch niemand dabei –<br />wer macht den ersten Tick?
        </div>
      ) : (
        <ol className="flex flex-1 flex-col gap-[0.5vh]">
          {top.map((entry, index) => {
            const isHot = hot && hot.name === entry.name;
            return (
              <li key={entry.name} className="lb-row rounded-[0.8vh]">
                <div
                  key={isHot ? hot.key : 'static'}
                  className={`flex items-center gap-[0.6vw] rounded-[0.8vh] px-[0.5vw] py-[0.35vh] ${isHot ? 'lb-hot' : ''}`}
                >
                  <span className="w-[2.2vw] text-center font-display text-[2.3vh] font-black text-white/70">
                    {MEDALS[index] ?? `${index + 1}.`}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-[0.5vw]">
                      <span className={`truncate text-[2.3vh] font-bold ${index === 0 ? 'text-white' : 'text-white/85'}`}>
                        {entry.name}
                      </span>
                      <span className="shrink-0 font-display text-[2vh] font-bold tabular-nums text-accent">
                        {entry.total.toLocaleString('de-DE')}
                        <span className="ml-[0.3vw] font-body text-[1.4vh] font-semibold text-muted">{challenge.unit}</span>
                      </span>
                    </div>
                    <div className="mt-[0.3vh] h-[0.5vh] overflow-hidden rounded-full bg-white/5">
                      <div className="lb-bar h-full rounded-full" style={{ width: `${(entry.total / leaderTotal) * 100}%` }} />
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {rest > 0 && (
        <div className="mt-[0.5vh] text-center text-[1.5vh] font-semibold text-muted">+ {rest} weitere</div>
      )}
    </section>
  );
}
