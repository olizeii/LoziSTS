import { useCallback, useEffect, useRef, useState } from 'react';
import { CelebrationOverlay } from './components/CelebrationOverlay.jsx';
import { ChallengeBar } from './components/ChallengeBar.jsx';
import { CollectionsPage } from './components/CollectionsPage.jsx';
import { DartsPanel } from './components/DartsPanel.jsx';
import { GamesPage } from './components/GamesPage.jsx';
import { Header } from './components/Header.jsx';
import { Leaderboard } from './components/Leaderboard.jsx';
import { StartOverlay } from './components/StartOverlay.jsx';
import { Ticker } from './components/Ticker.jsx';
import { AUTOSTART, PAGES, ROTATE_SECONDS, SERVER_URL, themeFor } from './config.js';
import { useIdleCursor } from './hooks/useIdleCursor.js';
import { usePageRotation } from './hooks/usePageRotation.js';
import { dartsLabel } from './lib/darts.js';
import { tickBurst } from './lib/effects.js';
import { sound } from './lib/sound.js';
import { useTracker } from './lib/useTracker.js';

const POP_MS = 1800;
const TEST_MILESTONES = [25, 50, 75, 100];
const T20 = { segment: 20, multiplier: 3, points: 60 };

function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  else document.documentElement.requestFullscreen?.().catch(() => {});
}

function randomTestDart() {
  const segment = 1 + Math.floor(Math.random() * 20);
  const multiplier = 1 + Math.floor(Math.random() * 3);
  return { segment, multiplier, points: segment * multiplier };
}

export default function App() {
  const [started, setStarted] = useState(AUTOSTART);
  const [muted, setMuted] = useState(sound.muted);
  const [pops, setPops] = useState([]);
  const [flashes, setFlashes] = useState({});
  const [hot, setHot] = useState({});
  const [celebrations, setCelebrations] = useState([]);
  const barRefs = useRef({});
  const tickerRef = useRef(null);
  const seqRef = useRef(0);
  const stateRef = useRef(null);
  // Während einer Feier bleibt die aktuelle Seite stehen
  const rotation = usePageRotation(PAGES.length, ROTATE_SECONDS, celebrations.length > 0);
  const { showPage } = rotation;

  useIdleCursor();
  useEffect(() => sound.subscribe(setMuted), []);

  const nextKey = () => {
    seqRef.current += 1;
    return seqRef.current;
  };

  const queueCelebrations = useCallback((items) => {
    if (items.length) setCelebrations((prev) => [...prev, ...items.map((item) => ({ ...item, key: nextKey() }))]);
  }, []);

  const celebrateEvent = useCallback(
    (event) => {
      const key = nextKey();
      const { challengeId, dart } = event;
      const bust = Boolean(dart?.bust);

      setFlashes((prev) => ({ ...prev, [challengeId]: { key } }));
      setPops((prev) => [...prev, { id: key, challengeId, amount: event.amount, name: event.name, bust }]);
      setTimeout(() => setPops((prev) => prev.filter((p) => p.id !== key)), POP_MS);
      tickerRef.current?.push(event);

      if (event.type === 'undo') {
        sound.play('undo');
        return;
      }
      if (bust) {
        sound.play('bust');
        return;
      }
      setHot((prev) => ({ ...prev, [challengeId]: { name: event.name, key } }));
      sound.play('tick');
      // kurz warten, bis der Balken angewachsen ist, dann am Balkenende Konfetti schießen
      setTimeout(() => tickBurst(barRefs.current[challengeId], themeFor(challengeId).color), 280);

      if (dart?.raw === 180) queueCelebrations([{ kind: 'oneEighty', name: event.name }]);
      if (dart?.checkout) {
        queueCelebrations([
          { kind: 'checkout', name: event.name, startScore: dart.startScore, label: dartsLabel(dart.darts), raw: dart.raw },
        ]);
      }
    },
    [queueCelebrations],
  );

  const handleTick = useCallback(
    ({ event, milestones }) => {
      celebrateEvent(event);
      queueCelebrations((milestones ?? []).map((m) => ({ ...m, kind: 'milestone' })));
    },
    [celebrateEvent, queueCelebrations],
  );

  const handleUndo = useCallback(({ event }) => celebrateEvent(event), [celebrateEvent]);

  // Neues Game-Ergebnis: zur passenden Seite springen, Karte aufleuchten lassen, ggf. groß feiern
  const handleGame = useCallback(
    ({ event, completion }) => {
      const key = nextKey();
      const game = stateRef.current?.games?.list.find((g) => g.id === event.gameId);
      if (game?.page) showPage(game.page - 1);
      setFlashes((prev) => ({ ...prev, [event.gameId]: { key } }));
      tickerRef.current?.push(event);
      sound.play(event.type === 'undo' ? 'undo' : event.value === 0 && (game?.type === 'wins' || game?.type === 'streak') ? 'bust' : 'tick');
      if (completion) queueCelebrations([{ kind: 'gameComplete', ...completion }]);
    },
    [queueCelebrations, showPage],
  );

  const { state, connected } = useTracker({ onTick: handleTick, onUndo: handleUndo, onGame: handleGame });
  stateRef.current = state;

  // Lokale Effekt-Tests (werden NICHT gespeichert) – praktisch, um Sound & Konfetti am TV zu prüfen
  const runTest = useCallback(
    (type) => {
      const current = stateRef.current;
      if (!current) return;
      const tickChallenges = current.challenges.filter((c) => c.kind === 'tick');
      const base = { id: `test-${nextKey()}`, type: 'tick', name: 'TV-Test', createdAt: new Date().toISOString() };

      if (type === 'game') {
        const games = current.games?.list ?? [];
        const game = games[Math.floor(Math.random() * games.length)];
        if (game) queueCelebrations([{ kind: 'gameComplete', label: game.label, emoji: game.emoji, color: game.color, task: game.task, name: 'TV-Test' }]);
        return;
      }

      if (type === 'darts' || type === '180' || type === 'checkout') {
        const darts = type === '180' ? [T20, T20, T20] : type === 'checkout' ? [T20, { segment: 16, multiplier: 2, points: 32 }] : [randomTestDart(), randomTestDart(), randomTestDart()];
        const raw = darts.reduce((sum, d) => sum + d.points, 0);
        handleTick({
          event: {
            ...base,
            challengeId: 'darts',
            amount: raw,
            dart: { darts, raw, bust: false, checkout: type === 'checkout', startScore: 501 },
            message: `🧪 Test: 🎯 ${dartsLabel(darts)} = ${raw} (nur lokal, nicht gespeichert)`,
          },
          milestones: [],
        });
        return;
      }

      const challenge = tickChallenges[Math.floor(Math.random() * tickChallenges.length)];
      const event = {
        ...base,
        challengeId: challenge.id,
        amount: challenge.increment,
        message: `🧪 Test: ${challenge.emoji} ${challenge.label} +${challenge.increment} (nur lokal, nicht gespeichert)`,
      };
      const milestones =
        type === 'milestone'
          ? [{ challengeId: challenge.id, percent: TEST_MILESTONES[Math.floor(Math.random() * TEST_MILESTONES.length)], name: 'TV-Test' }]
          : [];
      handleTick({ event, milestones });
    },
    [handleTick, queueCelebrations],
  );

  const start = useCallback(() => {
    sound.unlock();
    document.documentElement.requestFullscreen?.().catch(() => {});
    navigator.wakeLock?.request('screen').catch(() => {});
    setStarted(true);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.repeat) return;
      const key = e.key.toLowerCase();
      if (!started) {
        if (key === 'enter' || key === ' ') {
          e.preventDefault();
          start();
        }
        return;
      }
      if (key === 'f') toggleFullscreen();
      else if (key === 'm') sound.toggleMuted();
      else if (key === 't') runTest(e.shiftKey ? 'milestone' : 'tick');
      else if (key === 'd') runTest(e.shiftKey ? '180' : 'darts');
      else if (key === 'c') runTest('checkout');
      else if (key === 'g') runTest('game');
      else if (key === 'arrowright') rotation.next();
      else if (key === 'arrowleft') rotation.prev();
      else if (key === 'p') rotation.togglePause();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [started, start, runTest, rotation]);

  const dismissCelebration = useCallback(() => setCelebrations((prev) => prev.slice(1)), []);

  const tickChallenges = state?.challenges.filter((c) => c.kind === 'tick') ?? [];
  const dartsChallenge = state?.challenges.find((c) => c.kind === 'darts');
  const dartStatsByName = new Map((state?.darts?.players ?? []).map((p) => [p.name, p]));
  const fillRef = (id) => (el) => {
    barRefs.current[id] = el;
  };
  // Ticker-Historie: Challenges/Darts und Games gemischt, neueste zuerst
  const tickerHistory = [...(state?.recentEvents ?? []), ...(state?.games?.recentEvents ?? [])]
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
    .slice(0, 40);

  return (
    <div className="relative flex h-full flex-col">
      <div className="bg-scene">
        <div className="bg-grid" />
      </div>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <Header
          state={state}
          connected={connected}
          muted={muted}
          onToggleMute={() => sound.toggleMuted()}
          rotation={rotation}
        />

        {state && rotation.page === 1 && state.games && <GamesPage games={state.games} flashes={flashes} />}
        {state && rotation.page === 2 && state.games && <CollectionsPage games={state.games} flashes={flashes} />}
        {state && rotation.page === 0 ? (
          <main className="page-in grid min-h-0 flex-1 grid-rows-[minmax(0,1.6fr)_minmax(0,1fr)] gap-[1.6vh] px-[2.2vw] py-[1.8vh]">
            <div className="grid min-h-0 grid-cols-[1.3fr_1fr] gap-[1.2vw]">
              <section className="grid min-h-0 gap-[1.1vh]" style={{ gridTemplateRows: `repeat(${tickChallenges.length}, minmax(0, 1fr))` }}>
                {tickChallenges.map((challenge) => (
                  <ChallengeBar
                    key={challenge.id}
                    challenge={challenge}
                    milestoneSteps={state.milestoneSteps}
                    pops={pops.filter((p) => p.challengeId === challenge.id)}
                    flash={flashes[challenge.id]}
                    fillRef={fillRef(challenge.id)}
                  />
                ))}
              </section>
              {dartsChallenge && (
                <DartsPanel
                  challenge={dartsChallenge}
                  darts={state.darts}
                  recentEvents={state.recentEvents}
                  milestoneSteps={state.milestoneSteps}
                  pops={pops.filter((p) => p.challengeId === dartsChallenge.id)}
                  flash={flashes[dartsChallenge.id]}
                  fillRef={fillRef(dartsChallenge.id)}
                />
              )}
            </div>
            <section
              className="grid min-h-0 gap-x-[0.8vw]"
              style={{ gridTemplateColumns: `repeat(${state.challenges.length}, minmax(0, 1fr))` }}
            >
              {state.challenges.map((challenge) => (
                <Leaderboard
                  key={challenge.id}
                  challenge={challenge}
                  entries={state.leaderboards[challenge.id] ?? []}
                  hot={hot[challenge.id]}
                  subtitleFor={
                    challenge.kind === 'darts'
                      ? (entry) => {
                          const s = dartStatsByName.get(entry.name);
                          return s ? `Ø ${s.average.toLocaleString('de-DE')} · ${s.count180}× 180 · ${s.gamesWon} Siege` : null;
                        }
                      : undefined
                  }
                />
              ))}
            </section>
          </main>
        ) : state ? null : (
          <div className="grid flex-1 place-items-center">
            <div className="flex flex-col items-center gap-[2vh] text-[2.6vh] font-semibold text-white/60">
              <div className="spinner h-[6vh] w-[6vh] rounded-full border-[0.6vh] border-white/10 border-t-fuchsia-500" />
              Verbinde mit {SERVER_URL} …
            </div>
          </div>
        )}

        <Ticker ref={tickerRef} history={tickerHistory} />
      </div>

      {state && !connected && (
        <div className="fixed top-[11vh] left-1/2 z-40 -translate-x-1/2 rounded-full border border-rose-500/60 bg-rose-950/90 px-[2vw] py-[1vh] font-display text-[2vh] font-bold tracking-widest text-rose-200 shadow-[0_0_4vh_rgba(244,63,94,0.5)]">
          ⚠ Verbindung zum Server verloren – verbinde neu…
        </div>
      )}

      <div className="scanlines" />

      <CelebrationOverlay item={celebrations[0] ?? null} challenges={state?.challenges} onDone={dismissCelebration} />

      {!started && <StartOverlay connected={connected} onStart={start} />}
    </div>
  );
}
