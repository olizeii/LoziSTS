import { LEADERBOARD_SIZE, themeStyle } from '../config.js';

const MEDALS = ['🥇', '🥈', '🥉'];

// subtitleFor(entry) liefert optional eine Zusatzzeile (z. B. Dart-Average)
export function Leaderboard({ challenge, entries, hot, subtitleFor }) {
  const top = entries.slice(0, LEADERBOARD_SIZE);
  const rest = entries.length - top.length;
  const leaderTotal = top[0]?.total || 1;

  return (
    <section style={themeStyle(challenge.id)} className="panel flex min-h-0 flex-col overflow-hidden px-[0.8vw] py-[1.1vh]">
      <header className="mb-[0.7vh] flex items-center justify-between border-b border-white/10 pb-[0.7vh]">
        <div className="flex min-w-0 items-center gap-[0.4vw]">
          <span className="text-[2.4vh]">{challenge.emoji}</span>
          <span className="text-accent truncate font-display text-[1.6vh] font-black tracking-[0.1em] uppercase">
            {challenge.label}
          </span>
        </div>
        <span className="shrink-0 text-[1.3vh] font-bold tracking-[0.2em] text-muted uppercase">Top {LEADERBOARD_SIZE}</span>
      </header>

      {top.length === 0 ? (
        <div className="grid flex-1 place-items-center text-center text-[1.7vh] font-semibold text-white/40">
          Noch niemand dabei –<br />wer macht den Anfang?
        </div>
      ) : (
        <ol className="flex flex-1 flex-col gap-[0.35vh]">
          {top.map((entry, index) => {
            const isHot = hot && hot.name === entry.name;
            const subtitle = subtitleFor?.(entry);
            return (
              <li key={entry.name} className="lb-row rounded-[0.7vh]">
                <div
                  key={isHot ? hot.key : 'static'}
                  className={`flex items-center gap-[0.4vw] rounded-[0.7vh] px-[0.3vw] py-[0.25vh] ${isHot ? 'lb-hot' : ''}`}
                >
                  <span className="w-[1.6vw] text-center font-display text-[1.9vh] font-black text-white/70">
                    {MEDALS[index] ?? `${index + 1}.`}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-[0.4vw]">
                      <span className={`truncate text-[1.9vh] font-bold ${index === 0 ? 'text-white' : 'text-white/85'}`}>
                        {entry.name}
                      </span>
                      <span className="text-accent shrink-0 font-display text-[1.7vh] font-bold tabular-nums">
                        {entry.total.toLocaleString('de-DE')}
                      </span>
                    </div>
                    {subtitle ? (
                      <div className="truncate text-[1.25vh] font-semibold text-muted">{subtitle}</div>
                    ) : (
                      <div className="mt-[0.25vh] h-[0.4vh] overflow-hidden rounded-full bg-white/5">
                        <div className="lb-bar h-full rounded-full" style={{ width: `${(entry.total / leaderTotal) * 100}%` }} />
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {rest > 0 && <div className="mt-[0.3vh] text-center text-[1.3vh] font-semibold text-muted">+ {rest} weitere</div>}
    </section>
  );
}
