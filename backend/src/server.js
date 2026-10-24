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
  if (!ADMIN_TOKEN) return res.status(403).json({ ok: false, error: 'ADMIN_TOKEN ist nicht gesetzt' });
  if (req.get('x-admin-token') !== ADMIN_TOKEN) return res.status(401).json({ ok: false, error: 'Falscher Token' });
  try {
    await store.reset();
    const state = await store.getState();
    io.emit('state', state);
    console.log('[admin] Datenbank zurückgesetzt');
    res.json({ ok: true });
  } catch (err) {
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
