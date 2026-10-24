import { useEffect } from 'react';
import { themeStyle, themeFor } from '../config.js';
import { completeCelebration, milestoneCelebration } from '../lib/effects.js';
import { sound } from '../lib/sound.js';

const SHOW_MS = 4800;
const SHOW_COMPLETE_MS = 7500;

export function MilestoneOverlay({ milestone, challenge, onDone }) {
  const complete = milestone ? milestone.percent >= 100 : false;

  useEffect(() => {
    if (!milestone) return undefined;
    if (complete) {
      sound.play('complete');
      completeCelebration();
    } else {
      sound.play('milestone');
      milestoneCelebration(themeFor(milestone.challengeId).color);
    }
    const timer = setTimeout(onDone, complete ? SHOW_COMPLETE_MS : SHOW_MS);
    return () => clearTimeout(timer);
    // Nur einmal pro Meilenstein auslösen
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [milestone?.key]);

  if (!milestone || !challenge) return null;

  const style = complete
    ? { '--c': '#facc15', '--c2': '#f59e0b', '--glow': 'rgba(250, 204, 21, 0.75)' }
    : themeStyle(challenge.id);

  return (
    <div className="overlay-backdrop fixed inset-0 z-50 grid place-items-center" style={style}>
      <div key={milestone.key} className="milestone-card flex flex-col items-center text-center">
        <span className="mb-[1vh] font-display text-[3vh] font-black tracking-[0.6em] text-white/80 uppercase">
          {complete ? '🏆 Challenge geschafft 🏆' : '⚡ Meilenstein ⚡'}
        </span>
        <span className="milestone-percent font-display text-[26vh] leading-none font-black text-[var(--c)]">
          {complete ? '100%' : `${milestone.percent}%`}
        </span>
        <span className="mt-[2vh] flex items-center gap-[1vw] font-display text-[6vh] font-black tracking-[0.08em] uppercase">
          <span>{challenge.emoji}</span>
          <span>{challenge.label}</span>
        </span>
        <span className="mt-[2.5vh] rounded-full border border-white/15 bg-white/5 px-[2vw] py-[1vh] text-[3.2vh] font-bold text-white/90">
          {complete ? 'Den letzten Punkt holte ' : 'Geknackt von '}
          <span className="text-[var(--c)]">{milestone.name}</span> 🔥
        </span>
      </div>
    </div>
  );
}
