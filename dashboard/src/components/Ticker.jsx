import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import { themeStyle } from '../config.js';

// Lauftext-Geschwindigkeit in Bildschirmbreiten pro Sekunde
const SPEED = 0.075;
const FILLER_BATCH = 6;
const WELCOME = {
  id: 'welcome',
  type: 'info',
  message: '🎮 Willkommen zur LAN-Party Challenge! App öffnen, Namen eintragen, lostickern! 🚀',
};

const timeFormatter = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' });

// News-Ticker: neue Events laufen von rechts ein, dazwischen wird die Historie in Endlosschleife gezeigt.
export const Ticker = forwardRef(function Ticker({ history }, ref) {
  const containerRef = useRef(null);
  const trackRef = useRef(null);
  const [items, setItems] = useState([]);
  const itemsRef = useRef(items);
  const offsetRef = useRef(0);
  const shiftRef = useRef(0);
  const appendingRef = useRef(false);
  const historyRef = useRef(history);
  const cursorRef = useRef(0);
  const seqRef = useRef(0);

  historyRef.current = history;

  const commit = useCallback((next) => {
    itemsRef.current = next;
    setItems(next);
  }, []);

  const makeItem = useCallback((event, live) => ({ key: `t${(seqRef.current += 1)}`, event, live }), []);

  const nextFillers = useCallback(() => {
    // Historie kommt "neueste zuerst" – für den Ticker chronologisch abspielen
    const source = historyRef.current?.length ? [...historyRef.current].reverse() : [];
    if (source.length === 0) return [makeItem(WELCOME, false)];
    const out = [];
    for (let i = 0; i < Math.min(FILLER_BATCH, source.length + 1); i += 1) {
      if (cursorRef.current >= source.length) {
        cursorRef.current = 0;
        out.push(makeItem(WELCOME, false));
        continue;
      }
      out.push(makeItem(source[cursorRef.current], false));
      cursorRef.current += 1;
    }
    return out;
  }, [makeItem]);

  useImperativeHandle(
    ref,
    () => ({
      push(event) {
        const track = trackRef.current;
        const container = containerRef.current;
        const current = itemsRef.current;
        if (!track || !container) {
          commit([...current, makeItem(event, true)]);
          return;
        }
        // Noch nicht sichtbare Füll-Einträge verwerfen, damit das Live-Event sofort reinläuft
        const edge = offsetRef.current + container.clientWidth;
        const children = track.children;
        const kept = [];
        let end = 0;
        current.forEach((item, i) => {
          const el = children[i];
          if (!el || item.live || el.offsetLeft < edge) {
            kept.push(item);
            if (el) end = el.offsetLeft + el.offsetWidth;
          }
        });
        // Abstandhalter, damit das neue Event am rechten Rand einläuft statt mitten im Bild aufzutauchen
        const gap = edge - end;
        if (gap > 0) kept.push({ key: `s${(seqRef.current += 1)}`, spacer: gap });
        commit([...kept, makeItem(event, true)]);
      },
    }),
    [commit, makeItem],
  );

  useEffect(() => {
    let raf;
    let last = performance.now();
    const loop = (now) => {
      const dt = Math.min(now - last, 100) / 1000;
      last = now;
      const track = trackRef.current;
      const container = containerRef.current;
      if (track && container) {
        const width = container.clientWidth;
        const remaining = track.offsetWidth - offsetRef.current - width;
        // Bei Rückstau (viele Live-Events) schneller scrollen
        const boost = Math.min(Math.max(remaining / (width * 2), 1), 4);
        offsetRef.current += width * SPEED * boost * dt;

        if (!shiftRef.current) {
          const first = track.firstElementChild;
          if (first && offsetRef.current > first.offsetWidth) {
            shiftRef.current = first.offsetWidth;
            commit(itemsRef.current.slice(1));
          }
        }
        if (!appendingRef.current && remaining < width * 1.5) {
          appendingRef.current = true;
          commit([...itemsRef.current, ...nextFillers()]);
        }
        track.style.transform = `translate3d(${-offsetRef.current}px, 0, 0)`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [commit, nextFillers]);

  // Nach dem Entfernen des ersten Elements den Offset im selben Frame korrigieren (kein Ruckeln)
  useLayoutEffect(() => {
    if (shiftRef.current) {
      offsetRef.current -= shiftRef.current;
      shiftRef.current = 0;
      if (trackRef.current) trackRef.current.style.transform = `translate3d(${-offsetRef.current}px, 0, 0)`;
    }
    appendingRef.current = false;
  }, [items]);

  return (
    <footer className="relative z-10 mx-[2.2vw] mb-[2vh] flex h-[7.5vh] items-stretch overflow-hidden rounded-[1.4vh] border border-white/10 bg-black/50">
      <div className="z-10 flex shrink-0 items-center gap-[0.6vw] bg-gradient-to-r from-rose-600 to-fuchsia-600 px-[1.4vw] font-display text-[2.2vh] font-black tracking-[0.2em] text-white shadow-[0_0_3vh_rgba(225,29,72,0.6)]">
        <span className="live-dot inline-block h-[1.3vh] w-[1.3vh] rounded-full bg-white" />
        LIVE
      </div>
      <div ref={containerRef} className="ticker-mask relative flex-1 overflow-hidden">
        <div ref={trackRef} className="ticker-track absolute inset-y-0 left-0 items-center text-[2.7vh] font-semibold">
          {items.map((item) =>
            item.spacer ? (
              <span key={item.key} className="shrink-0" style={{ width: item.spacer }} />
            ) : (
              <TickerItem key={item.key} event={item.event} live={item.live} />
            ),
          )}
        </div>
      </div>
    </footer>
  );
});

function TickerItem({ event, live }) {
  const isUndo = event.type === 'undo';
  const time = event.createdAt ? timeFormatter.format(new Date(event.createdAt)) : null;
  return (
    <span
      className={`ticker-item ${live && !isUndo ? 'ticker-item--live' : ''} ${isUndo ? 'text-white/45 italic' : 'text-white/90'}`}
      style={event.challengeId ? themeStyle(event.challengeId) : undefined}
    >
      {time && <span className="mr-[0.7vw] font-display text-[1.6vh] font-bold text-white/35">{time}</span>}
      {event.message}
      <span className="ml-[4.4vw] text-[1.6vh] text-fuchsia-400/60">◆</span>
    </span>
  );
}
