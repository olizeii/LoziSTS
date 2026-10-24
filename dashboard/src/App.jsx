import { useCallback, useEffect, useRef, useState } from 'react';
import { ChallengeBar } from './components/ChallengeBar.jsx';
import { Header } from './components/Header.jsx';
import { Leaderboard } from './components/Leaderboard.jsx';
import { MilestoneOverlay } from './components/MilestoneOverlay.jsx';
import { StartOverlay } from './components/StartOverlay.jsx';
import { Ticker } from './components/Ticker.jsx';
import { AUTOSTART, SERVER_URL, themeFor } from './config.js';
import { useIdleCursor } from './hooks/useIdleCursor.js';
import { tickBurst } from './lib/effects.js';
import { sound } from './lib/sound.js';
import { useTracker } from './lib/useTracker.js';

const POP_MS = 1800;
const TEST_MILESTONES = [25, 50, 75, 100];

function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  else document.documentElement.requestFullscreen?.().catch(() => {});
}

export default function App() {
  const [started, setStarted] = useState(AUTOSTART);
  const [muted, setMuted] = useState(sound.muted);
  const [pops, setPops] = useState([]);
  const [flashes, setFlashes] = useState({});
  const [hot, setHot] = useState({});
  const [milestoneQueue, setMilestoneQueue] = useState([]);
  const barRefs = useRef({});
  const tickerRef = useRef(null);
  const seqRef = useRef(0);
  const stateRef = useRef(null);

  useIdleCursor();
  useEffect(() => sound.subscribe(setMuted), []);

  const nextKey = () => {
    seqRef.current += 1;
    return seqRef.current;
  };

  const celebrateEvent = useCallback((event) => {
    const key = nextKey();
    const { challengeId } = event;

    setFlashes((prev) => ({ ...prev, [challengeId]: { key } }));
    setPops((prev) => [...prev, { id: key, challengeId, amount: event.amount, name: event.name }]);
    setTimeout(() => setPops((prev) => prev.filter((p) => p.id !== key)), POP_MS);
    tickerRef.current?.push(event);

    if (event.type === 'undo') {
      sound.play('undo');
      return;
    }
    setHot((prev) => ({ ...prev, [challengeId]: { name: event.name, key } }));
    sound.play('tick');
    // kurz warten, bis der Balken angewachsen ist, dann am Balkenende Konfetti schießen
    setTimeout(() => tickBurst(barRefs.current[challengeId], themeFor(challengeId).color), 280);
  }, []);

  const handleTick = useCallback(
    ({ event, milestones }) => {
      celebrateEvent(event);
      if (milestones?.length) {
        setMilestoneQueue((prev) => [...prev, ...milestones.map((m) => ({ ...m, key: nextKey() }))]);
      }
    },
    [celebrateEvent],
  );

  const handleUndo = useCallback(({ event }) => celebrateEvent(event), [celebrateEvent]);

  const { state, connected } = useTracker({ onTick: handleTick, onUndo: handleUndo });
  stateRef.current = state;

  // Lokaler Effekt-Test (wird NICHT gespeichert) – praktisch, um Sound & Konfetti am TV zu prüfen
  const runTest = useCallback(
    (withMilestone) => {
      const current = stateRef.current;
      if (!current) return;
      const challenge = current.challenges[Math.floor(Math.random() * current.challenges.length)];
      const event = {
        id: `test-${nextKey()}`,
        type: 'tick',
        name: 'TV-Test',
        challengeId: challenge.id,
        amount: challenge.increment,
        createdAt: new Date().toISOString(),
        message: `🧪 Test: ${challenge.emoji} ${challenge.label} +${challenge.increment} (nur lokal, nicht gespeichert)`,
      };
      const milestones = withMilestone
        ? [
            {
              challengeId: challenge.id,
              percent: TEST_MILESTONES[Math.floor(Math.random() * TEST_MILESTONES.length)],
              name: 'TV-Test',
            },
          ]
        : [];
      handleTick({ event, milestones });
    },
    [handleTick],
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
      else if (key === 't') runTest(e.shiftKey);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [started, start, runTest]);

  const dismissMilestone = useCallback(() => setMilestoneQueue((prev) => prev.slice(1)), []);
  const currentMilestone = milestoneQueue[0] ?? null;
  const milestoneChallenge = currentMilestone
    ? state?.challenges.find((c) => c.id === currentMilestone.challengeId)
    : null;

  return (
    <div className="relative flex h-full flex-col">
      <div className="bg-scene">
        <div className="bg-grid" />
      </div>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <Header state={state} connected={connected} muted={muted} onToggleMute={() => sound.toggleMuted()} />

        {state ? (
          <main className="grid min-h-0 flex-1 grid-cols-[1.45fr_1fr] gap-[1.4vw] px-[2.2vw] py-[2vh]">
            <section className="grid min-h-0 grid-rows-4 gap-[1.8vh]">
              {state.challenges.map((challenge) => (
                <ChallengeBar
                  key={challenge.id}
                  challenge={challenge}
                  milestoneSteps={state.milestoneSteps}
                  pops={pops.filter((p) => p.challengeId === challenge.id)}
                  flash={flashes[challenge.id]}
                  fillRef={(el) => {
                    barRefs.current[challenge.id] = el;
                  }}
                />
              ))}
            </section>
            <section className="grid min-h-0 grid-cols-2 grid-rows-2 gap-x-[1.1vw] gap-y-[1.8vh]">
              {state.challenges.map((challenge) => (
                <Leaderboard
                  key={challenge.id}
                  challenge={challenge}
                  entries={state.leaderboards[challenge.id] ?? []}
                  hot={hot[challenge.id]}
                />
              ))}
            </section>
          </main>
        ) : (
          <div className="grid flex-1 place-items-center">
            <div className="flex flex-col items-center gap-[2vh] text-[2.6vh] font-semibold text-white/60">
              <div className="spinner h-[6vh] w-[6vh] rounded-full border-[0.6vh] border-white/10 border-t-fuchsia-500" />
              Verbinde mit {SERVER_URL} …
            </div>
          </div>
        )}

        <Ticker ref={tickerRef} history={state?.recentEvents ?? []} />
      </div>

      {state && !connected && (
        <div className="fixed top-[11vh] left-1/2 z-40 -translate-x-1/2 rounded-full border border-rose-500/60 bg-rose-950/90 px-[2vw] py-[1vh] font-display text-[2vh] font-bold tracking-widest text-rose-200 shadow-[0_0_4vh_rgba(244,63,94,0.5)]">
          ⚠ Verbindung zum Server verloren – verbinde neu…
        </div>
      )}

      <div className="scanlines" />

      <MilestoneOverlay milestone={currentMilestone} challenge={milestoneChallenge} onDone={dismissMilestone} />

      {!started && <StartOverlay connected={connected} onStart={start} />}
    </div>
  );
}
