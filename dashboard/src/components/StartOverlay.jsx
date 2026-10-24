import { useEffect, useRef } from 'react';
import { EVENT_TITLE } from '../config.js';

// Browser erlauben Sound erst nach einer Interaktion – daher einmal "Start" drücken.
export function StartOverlay({ connected, onStart }) {
  const buttonRef = useRef(null);

  useEffect(() => {
    buttonRef.current?.focus();
  }, []);

  return (
    <div className="overlay-backdrop fixed inset-0 z-[300] grid place-items-center backdrop-blur-md">
      <div className="flex flex-col items-center gap-[3vh] text-center">
        <div className="text-[10vh] leading-none">🎮</div>
        <h1 className="title-gradient font-display text-[7vh] leading-none font-black tracking-[0.12em] uppercase">
          {EVENT_TITLE}
        </h1>
        <button
          ref={buttonRef}
          type="button"
          onClick={onStart}
          className="start-button mt-[2vh] rounded-[2vh] border border-white/20 bg-gradient-to-r from-cyan-500 via-purple-600 to-pink-600 px-[4vw] py-[2.4vh] font-display text-[4vh] font-black tracking-[0.2em] text-white uppercase outline-none focus-visible:ring-4 focus-visible:ring-white/60"
        >
          ▶ Start
        </button>
        <p className="text-[2.2vh] font-semibold text-white/60">
          Klicken oder <kbd className="rounded border border-white/30 px-[0.4vw]">Enter</kbd> – aktiviert Sound & Vollbild
        </p>
        <p className="text-[1.8vh] font-semibold tracking-wider text-white/40">
          F = Vollbild · M = Ton · ←/→ = Seite wechseln · P = Seitenwechsel pausieren
          <br />
          Tests (nur lokal): T = Tick · Shift+T = Meilenstein · D = Dart · Shift+D = 180 · C = Checkout · G = Game geschafft
        </p>
        <p className={`text-[1.8vh] font-bold tracking-widest ${connected ? 'text-emerald-400' : 'text-rose-400'}`}>
          {connected ? '● Server verbunden' : '● Verbinde mit Server…'}
        </p>
      </div>
    </div>
  );
}
