import { themeStyle } from '../config.js';
import { useAnimatedNumber } from '../hooks/useAnimatedNumber.js';

export function ChallengeBar({ challenge, milestoneSteps, pops, flash, fillRef }) {
  const animatedTotal = useAnimatedNumber(challenge.total);
  const fillPercent = Math.min(challenge.percent, 100);
  const reached = new Set(challenge.milestonesReached.map((m) => m.percent));

  return (
    <div
      style={themeStyle(challenge.id)}
      className={`challenge-row panel panel-accent flex min-h-0 flex-col justify-center gap-[0.8vh] px-[1.4vw] py-[0.9vh] ${
        challenge.completed ? 'is-complete' : ''
      }`}
    >
      {flash && <div key={flash.key} className="row-pulse pointer-events-none absolute inset-0 rounded-[1.4vh]" />}

      <div className="flex items-center justify-between gap-[1vw]">
        <div className="flex min-w-0 items-center gap-[0.7vw]">
          <span className="text-[3.3vh] leading-none drop-shadow-[0_0_1.5vh_var(--glow)]">{challenge.emoji}</span>
          <span className="truncate font-display text-[2.4vh] leading-none font-black tracking-[0.08em] uppercase">
            {challenge.label}
          </span>
          {challenge.completed && (
            <span className="complete-badge rounded-[0.6vh] bg-yellow-400 px-[0.5vw] py-[0.3vh] font-display text-[1.3vh] font-black tracking-widest text-black">
              ✔ GESCHAFFT
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-baseline gap-[0.6vw] tabular-nums">
          <span className="text-accent font-display text-[3.4vh] leading-none font-black">
            {Math.round(animatedTotal).toLocaleString('de-DE')}
          </span>
          <span className="text-[1.9vh] font-semibold text-muted">
            / {challenge.goal.toLocaleString('de-DE')} {challenge.unit}
          </span>
          <span className="ml-[0.4vw] min-w-[5vw] text-right font-display text-[2.3vh] font-bold text-white">
            {challenge.percent.toLocaleString('de-DE', { maximumFractionDigits: 1 })}%
          </span>
        </div>
      </div>

      <div className="relative h-[2.6vh]">
        <div className="bar-track">
          <div ref={fillRef} className="bar-fill" style={{ width: `${fillPercent}%` }} />
          {flash && <div key={flash.key} className="bar-flash" style={{ '--x': `${fillPercent}%` }} />}
        </div>

        {milestoneSteps
          .filter((step) => step < 100)
          .map((step) => (
            <div
              key={step}
              className={`milestone-mark ${reached.has(step) ? 'is-reached' : ''}`}
              style={{ left: `${step}%` }}
            />
          ))}

        {pops.map((pop) => (
          <div
            key={pop.id}
            className="pop flex items-baseline gap-[0.4vw] font-display"
            style={{ left: `${Math.min(Math.max(fillPercent, 4), 90)}%` }}
          >
            <span className="text-accent text-[3vh] font-black">
              {pop.amount > 0 ? `+${pop.amount}` : pop.amount}
            </span>
            <span className="text-[1.9vh] font-bold text-white drop-shadow-[0_0_1vh_rgba(0,0,0,0.9)]">{pop.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
