// Simuliert eine LAN-Party: 10 Leute ticken zufällig – zum Testen des TV-Dashboards.
// ACHTUNG: schreibt echte Ticks in die Datenbank! Danach: npm run reset -- --yes
// Aufruf: npm run simulate                         (40 Ticks gegen localhost:3000)
//         npm run simulate -- http://10.0.0.210:3000 100
import { io } from 'socket.io-client';

const url = process.argv[2] || process.env.SERVER_URL || 'http://localhost:3000';
const count = Number(process.argv[3]) || 40;
const NAMES = ['Max', 'Lena', 'Tim', 'Sarah', 'Jonas', 'Mia', 'Paul', 'Anna', 'Felix', 'Laura'];
// Gewichtung: Liegestütze werden öfter getickt als Trichter
const CHALLENGES = ['pushups', 'pushups', 'pushups', 'pushups', 'rubiks', 'rubiks', 'running', 'running', 'funnel'];

const pick = (list) => list[Math.floor(Math.random() * list.length)];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const socket = io(url, { query: { client: 'simulator' }, transports: ['websocket'] });
socket.on('connect_error', (err) => {
  console.error(`❌ Keine Verbindung zu ${url}: ${err.message}`);
  process.exit(1);
});

socket.once('connect', async () => {
  console.log(`✅ Verbunden mit ${url} – sende ${count} Ticks…`);
  for (let i = 0; i < count; i += 1) {
    const res = await socket.timeout(5000).emitWithAck('tick', { name: pick(NAMES), challengeId: pick(CHALLENGES) });
    if (res.ok) {
      console.log(`  ${String(i + 1).padStart(3)}. ${res.event.message}`);
      for (const m of res.milestones) console.log(`       ${m.message}`);
    } else {
      console.log(`  ${String(i + 1).padStart(3)}. ⚠ ${res.error}`);
    }
    // zwischendurch mal ein Undo
    if (Math.random() < 0.05) {
      const undo = await socket.timeout(5000).emitWithAck('undo', { name: res.event?.name ?? pick(NAMES) });
      if (undo.ok) console.log(`       ${undo.event.message}`);
    }
    await sleep(400 + Math.random() * 1600);
  }
  console.log('🎉 Simulation fertig. Zurücksetzen: npm run reset -- --yes');
  socket.close();
  process.exit(0);
});
