import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express from 'express';
import { Server } from 'socket.io';
import { CHALLENGES, publicChallengeConfig } from './challenges.js';
import { createStore } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'lanparty.db');
const STATIC_DIR = process.env.STATIC_DIR || path.join(__dirname, '..', '..', 'dashboard', 'dist');
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';

const MAX_NAME_LENGTH = 24;
const RATE_LIMIT_WINDOW_MS = 1000;
const RATE_LIMIT_MAX_ACTIONS = 10;

function cleanName(raw) {
  if (typeof raw !== 'string') return null;
  const name = raw.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim();
  if (!name || name.length > MAX_NAME_LENGTH) return null;
  return name;
}

function lanAddresses() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((iface) => iface && iface.family === 'IPv4' && !iface.internal)
    .map((iface) => iface.address);
}

const store = await createStore(DB_PATH);

const app = express();
app.use(cors());
app.use(express.json({ limit: '16kb' }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
  pingInterval: 10000,
  pingTimeout: 8000,
});

// --- Gemeinsame Aktionen (werden von Socket.io und REST genutzt) -----------------

async function handleTick(rawName, challengeId) {
  const name = cleanName(rawName);
  if (!name) throw new Error(`Ungültiger Name (1–${MAX_NAME_LENGTH} Zeichen)`);
  const { event, milestones } = await store.addTick(name, challengeId);
  const state = await store.getState();
  io.emit('tick', { event, milestones, state });
  console.log(`[tick] ${event.message}`);
  for (const m of milestones) console.log(`[milestone] ${m.message}`);
  return { event, milestones, state };
}

async function handleUndo(rawName, challengeId) {
  const name = cleanName(rawName);
  if (!name) throw new Error(`Ungültiger Name (1–${MAX_NAME_LENGTH} Zeichen)`);
  const result = await store.undoLastTick(name, challengeId || null);
  if (!result) throw new Error('Kein Tick zum Rückgängigmachen gefunden');
  const state = await store.getState();
  io.emit('undo', { event: result.event, state });
  console.log(`[undo] ${result.event.message}`);
  return { event: result.event, state };
}

function requireName(raw) {
  const name = cleanName(raw);
  if (!name) throw new Error(`Ungültiger Name (1–${MAX_NAME_LENGTH} Zeichen)`);
  return name;
}

async function handleDartTurn(payload) {
  const enteredBy = requireName(payload.name);
  const player = payload.player ? requireName(payload.player) : null;
  const { event, milestones, turn, game } = await store.addDartTurn({
    enteredBy,
    gameId: payload.gameId ?? null,
    player,
    darts: payload.darts,
  });
  const state = await store.getState();
  io.emit('tick', { event, milestones, state });
  if (game) io.emit('darts:game', game);
  console.log(`[darts] ${event.message}${game ? ` (Spiel #${game.id})` : ''}`);
  for (const m of milestones) console.log(`[milestone] ${m.message}`);
  return { event, milestones, turn, game };
}

async function handleDartUndo(payload) {
  const requester = requireName(payload.name);
  const { event, game } = await store.undoDartTurn({ requester, gameId: payload.gameId ?? null });
  const state = await store.getState();
  io.emit('undo', { event, state });
  if (game) io.emit('darts:game', game);
  console.log(`[darts] ${event.message}`);
  return { event, game };
}

async function handleCreateGame(payload) {
  const createdBy = requireName(payload.name);
  if (!Array.isArray(payload.players)) throw new Error('Spielerliste fehlt');
  const players = payload.players.map(requireName);
  const game = await store.createDartGame({
    createdBy,
    players,
    startScore: payload.startScore,
    doubleOut: payload.doubleOut !== false,
  });
  io.emit('state', await store.getState());
  io.emit('darts:game', game);
  console.log(`[darts] Neues ${game.startScore}er-Spiel #${game.id}: ${players.join(' vs. ')}`);
  return { game };
}

async function handleAbortGame(payload) {
  const name = requireName(payload.name);
  const game = await store.abortDartGame({ gameId: payload.gameId });
  io.emit('state', await store.getState());
  io.emit('darts:game', game);
  console.log(`[darts] Spiel #${game.id} abgebrochen von ${name}`);
  return { game };
}

function adminError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function tokenMatches(token) {
  if (typeof token !== 'string') return false;
  const given = Buffer.from(token);
  const expected = Buffer.from(ADMIN_TOKEN);
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

// Alles löschen (Ticks, Darts, Meilensteine) – nur mit ADMIN_TOKEN
async function handleReset(token, source) {
  if (!ADMIN_TOKEN) throw adminError(403, 'Reset ist deaktiviert – ADMIN_TOKEN in der .env des Servers setzen');
  if (!tokenMatches(token)) throw adminError(401, 'Falsches Admin-Passwort');
  await store.reset();
  io.emit('state', await store.getState());
  io.emit('admin:reset');
  console.log(`[admin] Datenbank zurückgesetzt (über ${source})`);
}

// --- REST API -------------------------------------------------------------------

const api = express.Router();

api.get('/health', (_req, res) => {
  res.json({ ok: true, uptime: process.uptime(), clients: io.engine.clientsCount });
});

api.get('/challenges', (_req, res) => {
  res.json(CHALLENGES.map(publicChallengeConfig));
});

api.get('/state', async (_req, res, next) => {
  try {
    res.json(await store.getState());
  } catch (err) {
    next(err);
  }
});

api.get('/events', async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 500, 1), 5000);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    res.json(await store.getEvents({ limit, offset }));
  } catch (err) {
    next(err);
  }
});

api.post('/tick', async (req, res) => {
  try {
    const { name, challengeId } = req.body ?? {};
    const { event, milestones } = await handleTick(name, challengeId);
    res.status(201).json({ ok: true, event, milestones });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

api.post('/undo', async (req, res) => {
  try {
    const { name, challengeId } = req.body ?? {};
    const { event } = await handleUndo(name, challengeId);
    res.json({ ok: true, event });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

api.post('/admin/reset', async (req, res, next) => {
  try {
    await handleReset(req.get('x-admin-token'), 'API');
    res.json({ ok: true });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ ok: false, error: err.message });
    next(err);
  }
});

app.use('/api', api);

// --- Dashboard (wird ab Schritt 2/4 als statischer Build ausgeliefert) ------------

if (fs.existsSync(path.join(STATIC_DIR, 'index.html'))) {
  app.use(express.static(STATIC_DIR));
  app.get(/^\/(?!api|socket\.io).*/, (_req, res) => res.sendFile(path.join(STATIC_DIR, 'index.html')));
  console.log(`[http] Dashboard wird ausgeliefert aus ${STATIC_DIR}`);
} else {
  app.get('/', (_req, res) => {
    res.type('text').send('LAN-Party Challenge Tracker Backend läuft. API: /api/state');
  });
}

app.use((err, _req, res, _next) => {
  console.error('[http] Fehler:', err);
  res.status(500).json({ ok: false, error: 'Interner Serverfehler' });
});

// --- Socket.io ------------------------------------------------------------------

io.on('connection', async (socket) => {
  const client = socket.handshake.query.client || 'unknown';
  console.log(`[socket] verbunden: ${socket.id} (${client}) – ${io.engine.clientsCount} Clients`);

  const recentActions = [];
  function rateLimited() {
    const now = Date.now();
    while (recentActions.length && now - recentActions[0] > RATE_LIMIT_WINDOW_MS) recentActions.shift();
    if (recentActions.length >= RATE_LIMIT_MAX_ACTIONS) return true;
    recentActions.push(now);
    return false;
  }

  function respond(ack) {
    return typeof ack === 'function' ? ack : () => {};
  }

  socket.on('tick', async (payload, ack) => {
    const reply = respond(ack);
    if (rateLimited()) return reply({ ok: false, error: 'Langsam! Zu viele Ticks pro Sekunde.' });
    try {
      const { event, milestones } = await handleTick(payload?.name, payload?.challengeId);
      reply({ ok: true, event, milestones });
    } catch (err) {
      reply({ ok: false, error: err.message });
    }
  });

  socket.on('undo', async (payload, ack) => {
    const reply = respond(ack);
    if (rateLimited()) return reply({ ok: false, error: 'Langsam! Zu viele Aktionen pro Sekunde.' });
    try {
      const { event } = await handleUndo(payload?.name, payload?.challengeId);
      reply({ ok: true, event });
    } catch (err) {
      reply({ ok: false, error: err.message });
    }
  });

  // Dart-Aktionen: Antwort per Ack { ok: true, ...ergebnis } bzw. { ok: false, error }
  function onAction(eventName, handler, { limited = true } = {}) {
    socket.on(eventName, async (payload, ack) => {
      const reply = respond(ack);
      if (limited && rateLimited()) return reply({ ok: false, error: 'Langsam! Zu viele Aktionen pro Sekunde.' });
      try {
        reply({ ok: true, ...(await handler(payload ?? {})) });
      } catch (err) {
        reply({ ok: false, error: err.message });
      }
    });
  }

  onAction('darts:turn', handleDartTurn);
  onAction('darts:undo', handleDartUndo);
  onAction('darts:createGame', handleCreateGame);
  onAction('darts:abortGame', handleAbortGame);
  onAction('darts:game', async (payload) => ({ game: await store.getDartGame(payload.gameId) }), { limited: false });
  onAction('darts:history', async (payload) => store.getDartHistory(requireName(payload.name)), { limited: false });
  onAction('admin:reset', async (payload) => {
    await handleReset(payload.token, `App (${payload.name ?? 'unbekannt'})`);
    return {};
  });

  // Akzeptiert sowohl emit('state:get', ack) als auch emit('state:get', payload, ack)
  socket.on('state:get', async (...args) => {
    const reply = respond(args.find((arg) => typeof arg === 'function'));
    try {
      reply({ ok: true, state: await store.getState() });
    } catch (err) {
      reply({ ok: false, error: err.message });
    }
  });

  socket.on('disconnect', (reason) => {
    console.log(`[socket] getrennt: ${socket.id} (${reason})`);
  });

  try {
    socket.emit('state', await store.getState());
  } catch (err) {
    console.error('[socket] Konnte Initial-State nicht senden:', err);
  }
});

// --- Start & Shutdown -----------------------------------------------------------

server.listen(PORT, HOST, () => {
  console.log('==============================================');
  console.log(' 🎮 LAN-Party Challenge Tracker – Backend');
  console.log('==============================================');
  console.log(` Datenbank: ${DB_PATH}`);
  console.log(` Lokal:     http://localhost:${PORT}`);
  for (const ip of lanAddresses()) console.log(` LAN:       http://${ip}:${PORT}`);
  console.log('==============================================');
});

let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n[server] ${signal} empfangen – fahre herunter...`);
  io.close();
  server.close();
  try {
    await store.close();
  } catch (err) {
    console.error('[server] Fehler beim Schließen der DB:', err);
  }
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
