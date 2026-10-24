import { useEffect } from 'react';
import { colorStyle, themeFor, themeStyle } from '../config.js';
import { completeCelebration, milestoneCelebration } from '../lib/effects.js';
import { sound } from '../lib/sound.js';

const GOLD_STYLE = { '--c': '#facc15', '--c2': '#f59e0b', '--glow': 'rgba(250, 204, 21, 0.75)' };

// Was pro Art gespielt/gezeigt wird; challenge = Challenge-Objekt aus dem State
const KINDS = {
  milestone: {
    durationMs: (item) => (item.percent >= 100 ? 7500 : 4800),
    fire: (item) => {
      if (item.percent >= 100) {
        sound.play('complete');
        completeCelebration();
      } else {
        sound.play('milestone');
        milestoneCelebration(themeFor(item.challengeId).color);
      }
    },
    render: (item, challenge) => {
      const complete = item.percent >= 100;
      return {
        style: complete ? GOLD_STYLE : themeStyle(item.challengeId),
        kicker: complete ? '🏆 Challenge geschafft 🏆' : '⚡ Meilenstein ⚡',
        big: complete ? '100%' : `${item.percent}%`,
        title: challenge ? `${challenge.emoji} ${challenge.label}` : '',
        footer: (
          <>
            {complete ? 'Den letzten Punkt holte ' : 'Geknackt von '}
            <span className="text-[var(--c)]">{item.name}</span> 🔥
          </>
        ),
      };
    },
  },
  oneEighty: {
    durationMs: () => 5000,
    fire: () => {
      sound.play('oneEighty');
      milestoneCelebration(themeFor('darts').color);
    },
    render: (item) => ({
      style: themeStyle('darts'),
      kicker: '🎯 One Hundred and Eighty 🎯',
      big: '180',
      title: '🔥 T20 · T20 · T20 🔥',
      footer: (
        <>
          Geworfen von <span className="text-[var(--c)]">{item.name}</span> 💪
        </>
      ),
    }),
  },
  gameComplete: {
    durationMs: () => 7000,
    fire: () => {
      sound.play('complete');
      completeCelebration();
    },
    render: (item) => ({
      style: colorStyle(item.color),
      kicker: '🏆 Game geschafft 🏆',
      big: item.emoji,
      bigSize: 'text-[20vh]',
      title: item.label,
      footer: (
        <>
          {item.task} – den letzten Schritt machte <span className="text-[var(--c)]">{item.name}</span> 🔥
        </>
      ),
    }),
  },
  checkout: {
    durationMs: () => 5500,
    fire: () => {
      sound.play('checkout');
      milestoneCelebration('#facc15');
    },
    render: (item) => ({
      style: GOLD_STYLE,
      kicker: `🎯 ${item.startScore ? `${item.startScore}er-Spiel` : 'Spiel'} gewonnen 🎯`,
      big: 'CHECKOUT!',
      bigSize: 'text-[17vh]',
      title: `${item.label} · ${item.raw} Punkte`,
      footer: (
        <>
          🏆 <span className="text-[var(--c)]">{item.name}</span> gewinnt!
        </>
      ),
    }),
  },
};

export function CelebrationOverlay({ item, challenges, onDone }) {
  const kind = item ? KINDS[item.kind] : null;

  useEffect(() => {
    if (!item || !kind) return undefined;
    kind.fire(item);
    const timer = setTimeout(onDone, kind.durationMs(item));
    return () => clearTimeout(timer);
    // Nur einmal pro Eintrag auslösen
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.key]);

  if (!item || !kind) return null;
  const challenge = challenges?.find((c) => c.id === item.challengeId);
  const view = kind.render(item, challenge);

  return (
    <div className="overlay-backdrop fixed inset-0 z-50 grid place-items-center" style={view.style}>
      <div key={item.key} className="milestone-card flex flex-col items-center text-center">
        <span className="mb-[1vh] font-display text-[3vh] font-black tracking-[0.5em] text-white/80 uppercase">
          {view.kicker}
        </span>
        <span className={`milestone-percent font-display leading-none font-black text-[var(--c)] ${view.bigSize ?? 'text-[26vh]'}`}>
          {view.big}
        </span>
        {view.title && (
          <span className="mt-[2vh] font-display text-[5.5vh] font-black tracking-[0.08em] uppercase">{view.title}</span>
        )}
        <span className="mt-[2.5vh] rounded-full border border-white/15 bg-white/5 px-[2vw] py-[1vh] text-[3.2vh] font-bold text-white/90">
          {view.footer}
        </span>
      </div>
    </div>
  );
}
