// Smoke-Test: verbindet sich wie ein Client, tickt jede Challenge einmal und nimmt alles wieder zurück.
// Aufruf: npm run smoke            (Server auf localhost:3000)
//         npm run smoke -- http://10.0.0.210:3000
import { io } from 'socket.io-client';

const url = process.argv[2] || process.env.SERVER_URL || 'http://localhost:3000';
const NAME = 'Smoke-Test';
const CHALLENGE_IDS = ['rubiks', 'pushups', 'running', 'funnel', 'beer'];

// kleine Pause pro Aktion, damit der Spam-Schutz (10 Aktionen/Sekunde) nicht greift
const PACE_MS = 120;

async function emitWithAck(socket, event, payload) {
  await new Promise((resolve) => setTimeout(resolve, PACE_MS));
  return new Promise((resolve, reject) => {
    socket.timeout(5000).emit(event, payload, (err, res) => (err ? reject(err) : resolve(res)));
  });
}

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

const socket = io(url, { query: { client: 'smoke-test' }, transports: ['websocket'] });
const broadcasts = [];
socket.on('tick', (payload) => broadcasts.push(payload));
socket.on('connect_error', (err) => fail(`Keine Verbindung zu ${url}: ${err.message}`));

socket.once('state', async (initial) => {
  console.log(`✅ Verbunden mit ${url}`);
  const before = Object.fromEntries(initial.challenges.map((c) => [c.id, c.total]));

  for (const challengeId of CHALLENGE_IDS) {
    const res = await emitWithAck(socket, 'tick', { name: NAME, challengeId });
    if (!res.ok) fail(`Tick ${challengeId} fehlgeschlagen: ${res.error}`);
    console.log(`✅ Tick:  ${res.event.message}`);
  }

  const invalid = await emitWithAck(socket, 'tick', { name: NAME, challengeId: 'gibts-nicht' });
  if (invalid.ok) fail('Ungültige Challenge wurde akzeptiert');
  console.log(`✅ Ungültige Challenge abgelehnt: ${invalid.error}`);

  for (let i = 0; i < CHALLENGE_IDS.length; i += 1) {
    const res = await emitWithAck(socket, 'undo', { name: NAME });
    if (!res.ok) fail(`Undo fehlgeschlagen: ${res.error}`);
    console.log(`✅ Undo:  ${res.event.message}`);
  }

  const dart = await emitWithAck(socket, 'darts:turn', {
    name: NAME,
    darts: [
      { segment: 20, multiplier: 3 },
      { segment: 19, multiplier: 3 },
      { segment: 25, multiplier: 2 },
    ],
  });
  if (!dart.ok || dart.turn.raw !== 167) fail(`Dart-Aufnahme fehlgeschlagen: ${dart.error ?? dart.turn.raw}`);
  console.log(`✅ Darts: ${dart.event.message}`);
  const dartUndo = await emitWithAck(socket, 'darts:undo', { name: NAME });
  if (!dartUndo.ok) fail(`Dart-Undo fehlgeschlagen: ${dartUndo.error}`);
  console.log(`✅ Darts: ${dartUndo.event.message}`);

  const { state } = await emitWithAck(socket, 'state:get');
  for (const c of state.challenges) {
    if (c.total !== before[c.id]) fail(`${c.id}: Summe ${c.total} statt ${before[c.id]}`);
  }
  const expectedBroadcasts = CHALLENGE_IDS.length + 1;
  if (broadcasts.length !== expectedBroadcasts) fail(`Erwartet ${expectedBroadcasts} Broadcasts, bekommen ${broadcasts.length}`);

  console.log(`✅ ${broadcasts.length} Broadcasts empfangen, Summen wieder auf Ausgangswert`);
  console.log('\nAktueller Stand:');
  for (const c of state.challenges) console.log(`  ${c.emoji} ${c.label.padEnd(14)} ${c.total}/${c.goal} (${c.percent}%)`);
  console.log('\n🎉 Smoke-Test bestanden!');
  socket.close();
  process.exit(0);
});
