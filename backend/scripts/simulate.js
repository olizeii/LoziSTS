// Simuliert eine LAN-Party: 10 Leute ticken zufällig und spielen Darts – zum Testen des TV-Dashboards.
// ACHTUNG: schreibt echte Ticks in die Datenbank! Danach: npm run reset -- --yes
// Aufruf: npm run simulate                         (40 Aktionen gegen localhost:3000)
//         npm run simulate -- http://10.0.0.210:3000 100
import { io } from 'socket.io-client';

const url = process.argv[2] || process.env.SERVER_URL || 'http://localhost:3000';
const count = Number(process.argv[3]) || 40;
const NAMES = ['Max', 'Lena', 'Tim', 'Sarah', 'Jonas', 'Mia', 'Paul', 'Anna', 'Felix', 'Laura'];
// Gewichtung: Liegestütze und Bier werden öfter getickt als Trichter, "darts" = Dart-Aufnahme
const ACTIONS = ['pushups', 'pushups', 'pushups', 'rubiks', 'rubiks', 'running', 'beer', 'beer', 'funnel', 'darts', 'darts', 'darts'];

const pick = (list) => list[Math.floor(Math.random() * list.length)];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function randomDart() {
  const r = Math.random();
  if (r < 0.06) return { segment: 0, multiplier: 0 };
  if (r < 0.1) return { segment: 25, multiplier: Math.random() < 0.3 ? 2 : 1 };
  const segment = Math.random() < 0.5 ? pick([20, 19, 18, 5, 1]) : 1 + Math.floor(Math.random() * 20);
  const m = Math.random();
  return { segment, multiplier: m < 0.18 ? 3 : m < 0.28 ? 2 : 1 };
}

function randomTurn() {
  // ab und zu eine 180 für die Effekte
  if (Math.random() < 0.06) return [1, 2, 3].map(() => ({ segment: 20, multiplier: 3 }));
  return [randomDart(), randomDart(), randomDart()];
}

// Versucht bei kleinem Rest einen Checkout (Double), sonst normale Aufnahme
function gameTurn(remaining) {
  if (remaining <= 40 && remaining % 2 === 0 && Math.random() < 0.5) return [{ segment: remaining / 2, multiplier: 2 }];
  if (remaining === 50 && Math.random() < 0.5) return [{ segment: 25, multiplier: 2 }];
  return randomTurn();
}

const socket = io(url, { query: { client: 'simulator' }, transports: ['websocket'] });
socket.on('connect_error', (err) => {
  console.error(`❌ Keine Verbindung zu ${url}: ${err.message}`);
  process.exit(1);
});

const ask = (event, payload) => socket.timeout(5000).emitWithAck(event, payload);

socket.once('connect', async () => {
  console.log(`✅ Verbunden mit ${url} – sende ${count} Aktionen…`);
  // Ein laufendes 301er-Spiel, damit das Dashboard Live-Spiele zeigt
  let game = (await ask('darts:createGame', { name: 'Max', players: ['Max', 'Lena', 'Tim'], startScore: 301, doubleOut: true })).game;
  console.log(`  🎯 Spiel #${game.id} gestartet: Max vs. Lena vs. Tim (301)`);

  for (let i = 0; i < count; i += 1) {
    const action = pick(ACTIONS);
    let res;
    if (action === 'darts' && game?.status === 'active' && Math.random() < 0.7) {
      const current = game.players.find((p) => p.name === game.currentPlayer);
      res = await ask('darts:turn', { name: current.name, gameId: game.id, player: current.name, darts: gameTurn(current.remaining) });
      if (res.ok) game = res.game;
    } else if (action === 'darts') {
      res = await ask('darts:turn', { name: pick(NAMES), darts: randomTurn() });
    } else {
      res = await ask('tick', { name: pick(NAMES), challengeId: action });
    }

    if (res.ok) {
      console.log(`  ${String(i + 1).padStart(3)}. ${res.event.message}`);
      for (const m of res.milestones ?? []) console.log(`       ${m.message}`);
    } else {
      console.log(`  ${String(i + 1).padStart(3)}. ⚠ ${res.error}`);
    }
    // zwischendurch mal ein Undo
    if (action !== 'darts' && res.ok && Math.random() < 0.05) {
      const undo = await ask('undo', { name: res.event.name });
      if (undo.ok) console.log(`       ${undo.event.message}`);
    }
    await sleep(400 + Math.random() * 1600);
  }
  console.log('🎉 Simulation fertig. Zurücksetzen: npm run reset -- --yes');
  socket.close();
  process.exit(0);
});
