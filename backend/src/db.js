import fs from 'node:fs';
import path from 'node:path';
import sqlite3 from 'sqlite3';
import {
  CHALLENGES,
  DARTS_CHALLENGE_ID,
  MILESTONES,
  getChallenge,
  publicChallengeConfig,
  buildEventMessage,
  buildMilestoneMessage,
} from './challenges.js';
import {
  MAX_PLAYERS_PER_GAME,
  MAX_START_SCORE,
  MIN_START_SCORE,
  dartsLabel,
  normalizeDarts,
  scoreX01Turn,
  sumDarts,
  teamPointsFor,
} from './darts.js';
import {
  GAMES,
  buildGameCompleteMessage,
  buildGameMessage,
  buildMinecraftMessage,
  computeGame,
  getGame,
  validateEntry,
} from './games.js';
import { catalogFor } from './minecraft.js';

const SCHEMA = `
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  -- Gesamt-Stats pro Challenge (laufende Summe, wird bei jedem Tick aktualisiert)
  CREATE TABLE IF NOT EXISTS stats (
    challenge_id TEXT PRIMARY KEY,
    label        TEXT    NOT NULL,
    goal         INTEGER NOT NULL,
    total        INTEGER NOT NULL DEFAULT 0,
    updated_at   TEXT
  );

  -- Event-Log: jeder einzelne Tick (und jedes Undo) mit Timestamp, User und Kategorie
  CREATE TABLE IF NOT EXISTS events (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    type             TEXT    NOT NULL CHECK (type IN ('tick', 'undo')),
    user_name        TEXT    NOT NULL,
    challenge_id     TEXT    NOT NULL REFERENCES stats(challenge_id),
    amount           INTEGER NOT NULL,
    reverts_event_id INTEGER REFERENCES events(id),
    created_at       TEXT    NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_events_challenge_user ON events (challenge_id, user_name);
  CREATE INDEX IF NOT EXISTS idx_events_user ON events (user_name, id);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_events_reverts ON events (reverts_event_id)
    WHERE reverts_event_id IS NOT NULL;

  -- Erreichte Meilensteine (damit jeder Meilenstein nur einmal gefeiert wird)
  CREATE TABLE IF NOT EXISTS milestones (
    challenge_id TEXT    NOT NULL REFERENCES stats(challenge_id),
    percent      INTEGER NOT NULL,
    user_name    TEXT    NOT NULL,
    reached_at   TEXT    NOT NULL,
    PRIMARY KEY (challenge_id, percent)
  );

  -- Dart: interne X01-Spiele (zählen in den 10.001-Team-Countdown)
  CREATE TABLE IF NOT EXISTS dart_games (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    start_score INTEGER NOT NULL,
    double_out  INTEGER NOT NULL DEFAULT 1,
    status      TEXT    NOT NULL CHECK (status IN ('active', 'finished', 'aborted')),
    winner      TEXT,
    created_by  TEXT    NOT NULL,
    created_at  TEXT    NOT NULL,
    finished_at TEXT
  );

  CREATE TABLE IF NOT EXISTS dart_game_players (
    game_id   INTEGER NOT NULL REFERENCES dart_games(id),
    position  INTEGER NOT NULL,
    user_name TEXT    NOT NULL,
    PRIMARY KEY (game_id, position)
  );

  -- Jede Dart-Aufnahme (1–3 Darts), frei geworfen (game_id NULL) oder in einem Spiel
  CREATE TABLE IF NOT EXISTS dart_turns (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id         INTEGER NOT NULL REFERENCES events(id),
    game_id          INTEGER REFERENCES dart_games(id),
    user_name        TEXT    NOT NULL,
    entered_by       TEXT    NOT NULL,
    darts            TEXT    NOT NULL,
    darts_thrown     INTEGER NOT NULL,
    raw_points       INTEGER NOT NULL,
    points           INTEGER NOT NULL,
    bust             INTEGER NOT NULL DEFAULT 0,
    checkout         INTEGER NOT NULL DEFAULT 0,
    remaining_before INTEGER,
    remaining_after  INTEGER,
    undone           INTEGER NOT NULL DEFAULT 0,
    created_at       TEXT    NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_dart_turns_user ON dart_turns (user_name, id);
  CREATE INDEX IF NOT EXISTS idx_dart_turns_game ON dart_turns (game_id, id);
  CREATE INDEX IF NOT EXISTS idx_dart_turns_event ON dart_turns (event_id);

  -- Games (Seite 2/3): jede Eingabe (Sieg/Niederlage, Score, Pokal, Song, Minecraft-Advancement)
  CREATE TABLE IF NOT EXISTS game_entries (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id    TEXT    NOT NULL,
    user_name  TEXT    NOT NULL,
    item       TEXT,
    ref        TEXT,
    value      INTEGER NOT NULL,
    message    TEXT,
    silent     INTEGER NOT NULL DEFAULT 0,
    undone     INTEGER NOT NULL DEFAULT 0,
    created_at TEXT    NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_game_entries_game ON game_entries (game_id, id);

  -- Geschaffte Games (damit jedes nur einmal groß gefeiert wird)
  CREATE TABLE IF NOT EXISTS game_completions (
    game_id      TEXT PRIMARY KEY,
    user_name    TEXT NOT NULL,
    completed_at TEXT NOT NULL
  );
`;

const RECENT_GAME_EVENTS_LIMIT = 30;
const GAME_HISTORY_LIMIT = 200;

const EVENT_SELECT = `
  SELECT e.*, t.darts AS dart_darts, t.bust AS dart_bust, t.checkout AS dart_checkout,
         t.raw_points AS dart_raw, t.game_id AS dart_game_id, g.start_score AS dart_start_score
  FROM events e
  LEFT JOIN dart_turns t ON t.event_id = e.id
  LEFT JOIN dart_games g ON g.id = t.game_id
`;

const RECENT_EVENTS_LIMIT = 30;
const ACTIVE_GAMES_LIMIT = 8;
const RECENT_GAMES_LIMIT = 5;
const GAME_RECENT_TURNS = 6;

function promisify(db) {
  return {
    run: (sql, params = []) =>
      new Promise((resolve, reject) => {
        db.run(sql, params, function onRun(err) {
          if (err) reject(err);
          else resolve({ lastID: this.lastID, changes: this.changes });
        });
      }),
    get: (sql, params = []) =>
      new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
      }),
    all: (sql, params = []) =>
      new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
      }),
    exec: (sql) =>
      new Promise((resolve, reject) => {
        db.exec(sql, (err) => (err ? reject(err) : resolve()));
      }),
    close: () =>
      new Promise((resolve, reject) => {
        db.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}

function openDatabase(file) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(file, (err) => (err ? reject(err) : resolve(db)));
  });
}

function toEvent(row) {
  const event = {
    id: row.id,
    type: row.type,
    name: row.user_name,
    challengeId: row.challenge_id,
    amount: row.amount,
    revertsEventId: row.reverts_event_id ?? null,
    createdAt: row.created_at,
  };
  if (row.dart_darts) {
    event.dart = {
      darts: JSON.parse(row.dart_darts),
      bust: Boolean(row.dart_bust),
      checkout: Boolean(row.dart_checkout),
      raw: row.dart_raw,
      gameId: row.dart_game_id ?? null,
      startScore: row.dart_start_score ?? null,
    };
  }
  event.message = buildEventMessage(event);
  return event;
}

function percentOf(total, goal) {
  return goal > 0 ? Math.round((total / goal) * 1000) / 10 : 0;
}

function round1(value) {
  return Math.round(value * 10) / 10;
}

function threeDartAverage(scored, darts) {
  return darts > 0 ? round1((scored / darts) * 3) : 0;
}

function toTurn(row) {
  const darts = JSON.parse(row.darts);
  return {
    id: row.id,
    eventId: row.event_id,
    gameId: row.game_id ?? null,
    startScore: row.start_score ?? null,
    player: row.user_name,
    enteredBy: row.entered_by,
    darts,
    label: dartsLabel(darts),
    dartsThrown: row.darts_thrown,
    raw: row.raw_points,
    points: row.points,
    bust: Boolean(row.bust),
    checkout: Boolean(row.checkout),
    remainingBefore: row.remaining_before ?? null,
    remainingAfter: row.remaining_after ?? null,
    createdAt: row.created_at,
  };
}

// Spielstand eines X01-Spiels aus seinen (nicht zurückgenommenen) Aufnahmen berechnen
function buildGameState(game, playerNames, turnRows) {
  const players = playerNames.map((name) => ({
    name,
    remaining: game.start_score,
    scored: 0,
    darts: 0,
    turns: 0,
    average: 0,
    lastTurn: null,
  }));
  const byName = new Map(players.map((p) => [p.name, p]));
  const turns = turnRows.map(toTurn);

  for (const turn of turns) {
    const p = byName.get(turn.player);
    if (!p) continue;
    p.remaining = turn.remainingAfter ?? p.remaining;
    p.scored += turn.bust ? 0 : turn.remainingBefore - turn.remainingAfter;
    p.darts += turn.dartsThrown;
    p.turns += 1;
    p.lastTurn = { label: turn.label, raw: turn.raw, bust: turn.bust, checkout: turn.checkout };
  }
  for (const p of players) p.average = threeDartAverage(p.scored, p.darts);

  const active = game.status === 'active';
  const currentIndex = active && players.length ? turns.length % players.length : null;

  return {
    id: game.id,
    startScore: game.start_score,
    doubleOut: Boolean(game.double_out),
    status: game.status,
    winner: game.winner ?? null,
    createdBy: game.created_by,
    createdAt: game.created_at,
    finishedAt: game.finished_at ?? null,
    players,
    currentPlayer: currentIndex === null ? null : players[currentIndex].name,
    round: players.length ? Math.floor(turns.length / players.length) + 1 : 1,
    turnCount: turns.length,
    recentTurns: turns.slice(-GAME_RECENT_TURNS).reverse(),
  };
}

export async function createStore(dbPath) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = promisify(await openDatabase(dbPath));
  await db.exec(SCHEMA);

  // Challenges aus der Config in die Stats-Tabelle übernehmen (Label/Ziel werden aktualisiert, Summen bleiben)
  for (const c of CHALLENGES) {
    await db.run(
      `INSERT INTO stats (challenge_id, label, goal, total, updated_at)
       VALUES (?, ?, ?, 0, NULL)
       ON CONFLICT (challenge_id) DO UPDATE SET label = excluded.label, goal = excluded.goal`,
      [c.id, c.label, c.goal],
    );
  }

  // Alle Schreibzugriffe laufen nacheinander, damit sich Transaktionen nie überlappen.
  let writeQueue = Promise.resolve();
  function exclusive(fn) {
    const result = writeQueue.then(() => fn());
    writeQueue = result.catch(() => {});
    return result;
  }

  async function transaction(fn) {
    await db.run('BEGIN IMMEDIATE');
    try {
      const result = await fn();
      await db.run('COMMIT');
      return result;
    } catch (err) {
      await db.run('ROLLBACK').catch(() => {});
      throw err;
    }
  }

  async function getEventById(id) {
    const row = await db.get(`${EVENT_SELECT} WHERE e.id = ?`, [id]);
    return row ? toEvent(row) : null;
  }

  // Beitrag ins Event-Log schreiben, Gesamt-Summe erhöhen und neu erreichte Meilensteine eintragen
  async function recordContribution(name, challenge, amount, now) {
    const { lastID } = await db.run(
      `INSERT INTO events (type, user_name, challenge_id, amount, created_at)
       VALUES ('tick', ?, ?, ?, ?)`,
      [name, challenge.id, amount, now],
    );
    await db.run('UPDATE stats SET total = total + ?, updated_at = ? WHERE challenge_id = ?', [
      amount,
      now,
      challenge.id,
    ]);
    const { total } = await db.get('SELECT total FROM stats WHERE challenge_id = ?', [challenge.id]);

    const milestones = [];
    if (amount > 0) {
      for (const percent of MILESTONES) {
        if (total * 100 < percent * challenge.goal) continue;
        const { changes } = await db.run(
          `INSERT OR IGNORE INTO milestones (challenge_id, percent, user_name, reached_at)
           VALUES (?, ?, ?, ?)`,
          [challenge.id, percent, name, now],
        );
        if (changes > 0) {
          milestones.push({
            challengeId: challenge.id,
            percent,
            name,
            reachedAt: now,
            message: buildMilestoneMessage(challenge, percent, name),
          });
        }
      }
    }
    return { eventId: lastID, milestones };
  }

  // Gegen-Event schreiben, das einen Beitrag aufhebt
  async function revertEvent(target, name, now) {
    const { lastID } = await db.run(
      `INSERT INTO events (type, user_name, challenge_id, amount, reverts_event_id, created_at)
       VALUES ('undo', ?, ?, ?, ?, ?)`,
      [name, target.challenge_id, -target.amount, target.id, now],
    );
    await db.run('UPDATE stats SET total = total - ?, updated_at = ? WHERE challenge_id = ?', [
      target.amount,
      now,
      target.challenge_id,
    ]);
    return lastID;
  }

  async function addTick(name, challengeId) {
    const challenge = getChallenge(challengeId);
    if (!challenge) throw new Error(`Unbekannte Challenge: ${challengeId}`);
    if (challenge.kind !== 'tick') throw new Error('Darts werden über den Dart-Tracker eingetragen');

    return exclusive(() =>
      transaction(async () => {
        const now = new Date().toISOString();
        const { eventId, milestones } = await recordContribution(name, challenge, challenge.increment, now);
        return { event: await getEventById(eventId), milestones };
      }),
    );
  }

  // Nimmt den letzten eigenen Tick zurück (Darts haben ein eigenes Undo pro Aufnahme).
  async function undoLastTick(name, challengeId = null) {
    if (challengeId && !getChallenge(challengeId)) throw new Error(`Unbekannte Challenge: ${challengeId}`);

    return exclusive(() =>
      transaction(async () => {
        const target = await db.get(
          `SELECT e.* FROM events e
           WHERE e.type = 'tick' AND e.user_name = ? AND e.challenge_id != ?
             AND (? IS NULL OR e.challenge_id = ?)
             AND NOT EXISTS (SELECT 1 FROM events u WHERE u.reverts_event_id = e.id)
           ORDER BY e.id DESC
           LIMIT 1`,
          [name, DARTS_CHALLENGE_ID, challengeId, challengeId],
        );
        if (!target) return null;

        const now = new Date().toISOString();
        const undoId = await revertEvent(target, name, now);
        return { event: await getEventById(undoId) };
      }),
    );
  }

  // ---------------------------------------------------------------------------
  // Darts
  // ---------------------------------------------------------------------------

  async function loadGame(gameId) {
    const game = await db.get('SELECT * FROM dart_games WHERE id = ?', [gameId]);
    if (!game) return null;
    const players = await db.all('SELECT user_name FROM dart_game_players WHERE game_id = ? ORDER BY position', [
      gameId,
    ]);
    const turns = await db.all(
      `SELECT t.*, g.start_score FROM dart_turns t JOIN dart_games g ON g.id = t.game_id
       WHERE t.game_id = ? AND t.undone = 0 ORDER BY t.id`,
      [gameId],
    );
    return buildGameState(
      game,
      players.map((p) => p.user_name),
      turns,
    );
  }

  async function getDartGame(gameId) {
    const game = await loadGame(Number(gameId));
    if (!game) throw new Error('Spiel nicht gefunden');
    return game;
  }

  async function createDartGame({ createdBy, players, startScore, doubleOut }) {
    const score = Number(startScore);
    if (!Number.isInteger(score) || score < MIN_START_SCORE || score > MAX_START_SCORE) {
      throw new Error(`Startpunktzahl muss zwischen ${MIN_START_SCORE} und ${MAX_START_SCORE} liegen`);
    }
    if (!Array.isArray(players) || players.length < 1 || players.length > MAX_PLAYERS_PER_GAME) {
      throw new Error(`Ein Spiel braucht 1–${MAX_PLAYERS_PER_GAME} Spieler`);
    }
    const seen = new Set();
    for (const p of players) {
      const key = p.toLowerCase();
      if (seen.has(key)) throw new Error(`${p} ist doppelt im Spiel`);
      seen.add(key);
    }

    return exclusive(() =>
      transaction(async () => {
        const now = new Date().toISOString();
        const { lastID } = await db.run(
          `INSERT INTO dart_games (start_score, double_out, status, created_by, created_at)
           VALUES (?, ?, 'active', ?, ?)`,
          [score, doubleOut === false ? 0 : 1, createdBy, now],
        );
        for (let i = 0; i < players.length; i += 1) {
          await db.run('INSERT INTO dart_game_players (game_id, position, user_name) VALUES (?, ?, ?)', [
            lastID,
            i,
            players[i],
          ]);
        }
        return loadGame(lastID);
      }),
    );
  }

  // Eine Aufnahme eintragen – frei geworfen (ohne gameId) oder für den Spieler am Wurf in einem Spiel
  async function addDartTurn({ enteredBy, gameId = null, player = null, darts: rawDarts }) {
    const darts = normalizeDarts(rawDarts);
    const challenge = getChallenge(DARTS_CHALLENGE_ID);

    return exclusive(() =>
      transaction(async () => {
        const now = new Date().toISOString();
        let thrower = player || enteredBy;
        let result;
        let remainingBefore = null;
        let game = null;

        if (gameId) {
          game = await loadGame(Number(gameId));
          if (!game) throw new Error('Spiel nicht gefunden');
          if (game.status !== 'active') throw new Error('Das Spiel ist schon beendet');
          if (player && player !== game.currentPlayer) {
            throw new Error(`${game.currentPlayer} ist am Wurf – Ansicht wird aktualisiert`);
          }
          thrower = game.currentPlayer;
          remainingBefore = game.players.find((p) => p.name === thrower).remaining;
          result = scoreX01Turn(darts, remainingBefore, game.doubleOut);
        } else {
          const raw = sumDarts(darts);
          result = { darts, raw, scored: raw, bust: false, checkout: false, remainingAfter: null };
        }

        const teamPoints = teamPointsFor(result);
        const { eventId, milestones } = await recordContribution(thrower, challenge, teamPoints, now);
        const { lastID: turnId } = await db.run(
          `INSERT INTO dart_turns (event_id, game_id, user_name, entered_by, darts, darts_thrown, raw_points,
             points, bust, checkout, remaining_before, remaining_after, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            eventId,
            game ? game.id : null,
            thrower,
            enteredBy,
            JSON.stringify(result.darts),
            result.darts.length,
            result.raw,
            teamPoints,
            result.bust ? 1 : 0,
            result.checkout ? 1 : 0,
            remainingBefore,
            game ? result.remainingAfter : null,
            now,
          ],
        );

        if (game && result.checkout) {
          await db.run(`UPDATE dart_games SET status = 'finished', winner = ?, finished_at = ? WHERE id = ?`, [
            thrower,
            now,
            game.id,
          ]);
        }

        const turnRow = await db.get(
          `SELECT t.*, g.start_score FROM dart_turns t LEFT JOIN dart_games g ON g.id = t.game_id WHERE t.id = ?`,
          [turnId],
        );
        return {
          event: await getEventById(eventId),
          milestones,
          turn: toTurn(turnRow),
          game: game ? await loadGame(game.id) : null,
        };
      }),
    );
  }

  // Letzte Aufnahme zurücknehmen: im Spiel die letzte Aufnahme des Spiels, sonst die letzte eigene freie Aufnahme
  async function undoDartTurn({ requester, gameId = null }) {
    return exclusive(() =>
      transaction(async () => {
        let turn;
        if (gameId) {
          const game = await db.get('SELECT * FROM dart_games WHERE id = ?', [Number(gameId)]);
          if (!game) throw new Error('Spiel nicht gefunden');
          if (game.status === 'aborted') throw new Error('Das Spiel wurde abgebrochen');
          turn = await db.get('SELECT * FROM dart_turns WHERE game_id = ? AND undone = 0 ORDER BY id DESC LIMIT 1', [
            game.id,
          ]);
        } else {
          turn = await db.get(
            `SELECT * FROM dart_turns
             WHERE game_id IS NULL AND undone = 0 AND (user_name = ? OR entered_by = ?)
             ORDER BY id DESC LIMIT 1`,
            [requester, requester],
          );
        }
        if (!turn) throw new Error('Keine Aufnahme zum Rückgängigmachen gefunden');

        const now = new Date().toISOString();
        const target = await db.get('SELECT * FROM events WHERE id = ?', [turn.event_id]);
        const undoId = await revertEvent(target, turn.user_name, now);
        await db.run('UPDATE dart_turns SET undone = 1 WHERE id = ?', [turn.id]);
        if (turn.game_id && turn.checkout) {
          // Checkout zurückgenommen → Spiel läuft weiter
          await db.run(
            `UPDATE dart_games SET status = 'active', winner = NULL, finished_at = NULL WHERE id = ?`,
            [turn.game_id],
          );
        }
        return {
          event: await getEventById(undoId),
          game: turn.game_id ? await loadGame(turn.game_id) : null,
        };
      }),
    );
  }

  async function abortDartGame({ gameId }) {
    return exclusive(() =>
      transaction(async () => {
        const game = await db.get('SELECT * FROM dart_games WHERE id = ?', [Number(gameId)]);
        if (!game) throw new Error('Spiel nicht gefunden');
        if (game.status !== 'active') throw new Error('Das Spiel läuft nicht mehr');
        await db.run(`UPDATE dart_games SET status = 'aborted', finished_at = ? WHERE id = ?`, [
          new Date().toISOString(),
          game.id,
        ]);
        return loadGame(game.id);
      }),
    );
  }

  async function getDartPlayerStats(name = null) {
    const rows = await db.all(
      `SELECT user_name,
              SUM(points) AS points,
              SUM(CASE WHEN bust = 0 THEN raw_points ELSE 0 END) AS scored,
              SUM(darts_thrown) AS darts,
              COUNT(*) AS turns,
              SUM(CASE WHEN bust = 0 AND raw_points = 180 THEN 1 ELSE 0 END) AS count180,
              MAX(CASE WHEN bust = 0 THEN raw_points END) AS best_turn,
              MAX(CASE WHEN checkout = 1 THEN raw_points END) AS best_checkout
       FROM dart_turns
       WHERE undone = 0 AND (? IS NULL OR user_name = ?)
       GROUP BY user_name`,
      [name, name],
    );
    const wins = await db.all(
      `SELECT winner AS user_name, COUNT(*) AS wins FROM dart_games
       WHERE status = 'finished' GROUP BY winner`,
    );
    const played = await db.all(
      `SELECT p.user_name, COUNT(*) AS played FROM dart_game_players p
       JOIN dart_games g ON g.id = p.game_id WHERE g.status = 'finished' GROUP BY p.user_name`,
    );
    const winsBy = new Map(wins.map((r) => [r.user_name, r.wins]));
    const playedBy = new Map(played.map((r) => [r.user_name, r.played]));

    return rows
      .map((r) => ({
        name: r.user_name,
        points: r.points,
        scored: r.scored,
        darts: r.darts,
        turns: r.turns,
        average: threeDartAverage(r.scored, r.darts),
        count180: r.count180,
        bestTurn: r.best_turn ?? 0,
        bestCheckout: r.best_checkout ?? 0,
        gamesWon: winsBy.get(r.user_name) ?? 0,
        gamesPlayed: playedBy.get(r.user_name) ?? 0,
      }))
      .sort((a, b) => b.points - a.points || b.average - a.average);
  }

  async function getDartsOverview() {
    const challenge = getChallenge(DARTS_CHALLENGE_ID);
    const { total } = await db.get('SELECT total FROM stats WHERE challenge_id = ?', [challenge.id]);
    const totals = await db.get(
      `SELECT COALESCE(SUM(darts_thrown), 0) AS darts,
              COALESCE(SUM(CASE WHEN bust = 0 THEN raw_points ELSE 0 END), 0) AS scored,
              COALESCE(SUM(CASE WHEN bust = 0 AND raw_points = 180 THEN 1 ELSE 0 END), 0) AS count180,
              COUNT(*) AS turns
       FROM dart_turns WHERE undone = 0`,
    );
    const activeRows = await db.all(
      `SELECT id FROM dart_games WHERE status = 'active' ORDER BY id DESC LIMIT ?`,
      [ACTIVE_GAMES_LIMIT],
    );
    const activeGames = [];
    for (const row of activeRows) activeGames.push(await loadGame(row.id));

    const finishedRows = await db.all(
      `SELECT g.id, g.start_score, g.winner, g.finished_at,
              (SELECT GROUP_CONCAT(user_name, ', ') FROM
                 (SELECT user_name FROM dart_game_players WHERE game_id = g.id ORDER BY position)) AS players
       FROM dart_games g WHERE g.status = 'finished' ORDER BY g.finished_at DESC LIMIT ?`,
      [RECENT_GAMES_LIMIT],
    );

    return {
      goal: challenge.goal,
      total,
      remaining: Math.max(0, challenge.goal - total),
      darts: totals.darts,
      turns: totals.turns,
      average: threeDartAverage(totals.scored, totals.darts),
      count180: totals.count180,
      players: await getDartPlayerStats(),
      activeGames,
      recentGames: finishedRows.map((r) => ({
        id: r.id,
        startScore: r.start_score,
        winner: r.winner,
        players: r.players ? r.players.split(', ') : [],
        finishedAt: r.finished_at,
      })),
    };
  }

  async function getDartHistory(name, limit = 150) {
    const rows = await db.all(
      `SELECT t.*, g.start_score FROM dart_turns t LEFT JOIN dart_games g ON g.id = t.game_id
       WHERE t.user_name = ? AND t.undone = 0 ORDER BY t.id DESC LIMIT ?`,
      [name, limit],
    );
    const [stats] = await getDartPlayerStats(name);
    return { stats: stats ?? null, turns: rows.map(toTurn) };
  }

  // ---------------------------------------------------------------------------
  // Games (Seite 2/3)
  // ---------------------------------------------------------------------------

  // Minecraft-Katalog und Sync-Status (wird bei jedem Sync aktualisiert)
  const minecraftState = { catalog: catalogFor(null), status: { ok: false, error: 'Noch nicht synchronisiert' } };
  // Nach Start/Reset wird der vorhandene Minecraft-Fortschritt still übernommen (kein Ticker-Spam)
  let minecraftSilentImport = true;

  function toGameEntry(row) {
    return { id: row.id, name: row.user_name, value: row.value, item: row.item, ref: row.ref, createdAt: row.created_at };
  }

  function toGameEvent(row, game) {
    return {
      id: `g${row.id}`,
      kind: 'game',
      type: 'tick',
      gameId: game.id,
      challengeId: game.id,
      color: game.color,
      name: row.user_name,
      value: row.value,
      item: row.item,
      message: row.message,
      createdAt: row.created_at,
    };
  }

  async function loadGameEntries(gameId) {
    const rows = await db.all('SELECT * FROM game_entries WHERE game_id = ? AND undone = 0 ORDER BY id', [gameId]);
    return rows.map(toGameEntry);
  }

  async function computeGameState(game) {
    return computeGame(game, await loadGameEntries(game.id), minecraftState);
  }

  // Erstmals geschafft? Dann einmalig als Feier zurückgeben
  async function checkCompletion(game, before, after, name, now) {
    if (!after.completed || before.completed) return null;
    const { changes } = await db.run(
      'INSERT OR IGNORE INTO game_completions (game_id, user_name, completed_at) VALUES (?, ?, ?)',
      [game.id, name, now],
    );
    if (!changes) return null;
    return { gameId: game.id, label: game.label, emoji: game.emoji, color: game.color, task: game.task, name, message: buildGameCompleteMessage(game, name) };
  }

  async function addGameEntry({ name, gameId, value, item = null }) {
    const game = getGame(gameId);
    if (!game) throw new Error(`Unbekanntes Spiel: ${gameId}`);
    const entry = validateEntry(game, { value, item });

    return exclusive(() =>
      transaction(async () => {
        const now = new Date().toISOString();
        const before = await computeGameState(game);
        const { lastID } = await db.run(
          'INSERT INTO game_entries (game_id, user_name, item, value, created_at) VALUES (?, ?, ?, ?, ?)',
          [game.id, name, entry.item, entry.value, now],
        );
        const after = await computeGameState(game);
        const message = buildGameMessage(game, { name, ...entry }, after);
        await db.run('UPDATE game_entries SET message = ? WHERE id = ?', [message, lastID]);
        const completion = await checkCompletion(game, before, after, name, now);
        const row = await db.get('SELECT * FROM game_entries WHERE id = ?', [lastID]);
        return { event: toGameEvent(row, game), game: after, completion };
      }),
    );
  }

  // Letzte eigene Eingabe in diesem Spiel zurücknehmen
  async function undoGameEntry({ name, gameId }) {
    const game = getGame(gameId);
    if (!game) throw new Error(`Unbekanntes Spiel: ${gameId}`);
    if (game.type === 'minecraft') throw new Error('Minecraft wird automatisch synchronisiert');

    return exclusive(() =>
      transaction(async () => {
        const target = await db.get(
          `SELECT * FROM game_entries WHERE game_id = ? AND user_name = ? AND undone = 0 ORDER BY id DESC LIMIT 1`,
          [game.id, name],
        );
        if (!target) throw new Error('Keine eigene Eingabe zum Rückgängigmachen gefunden');
        await db.run('UPDATE game_entries SET undone = 1 WHERE id = ?', [target.id]);
        const after = await computeGameState(game);
        const event = {
          ...toGameEvent(target, game),
          id: `gu${target.id}`,
          type: 'undo',
          message: `↩️ ${game.emoji} ${game.label}: Eingabe von ${name} zurückgenommen`,
          createdAt: new Date().toISOString(),
        };
        return { event, game: after };
      }),
    );
  }

  // Minecraft-Momentaufnahme übernehmen; liefert neue Advancements als Ticker-Events
  async function syncMinecraft(snapshot) {
    const game = getGame('minecraft');
    const now = new Date().toISOString();
    if (!snapshot.ok) {
      minecraftState.status = { ok: false, error: snapshot.error, lastSync: now };
      return { events: [], completion: null, changed: false };
    }
    minecraftState.catalog = catalogFor(snapshot.version);
    minecraftState.status = {
      ok: true,
      version: snapshot.version,
      versionDetected: snapshot.versionDetected,
      world: snapshot.world,
      players: snapshot.players.length,
      lastSync: now,
    };
    const known = new Set(minecraftState.catalog.map((a) => a.id));
    const titles = new Map(minecraftState.catalog.map((a) => [a.id, a.title]));
    const silent = minecraftSilentImport;
    minecraftSilentImport = false;

    return exclusive(() =>
      transaction(async () => {
        const existing = await db.all("SELECT item, ref FROM game_entries WHERE game_id = 'minecraft'");
        const have = new Set(existing.map((r) => `${r.ref}|${r.item}`));
        const fresh = [];
        for (const player of snapshot.players) {
          for (const adv of player.done) {
            if (!known.has(adv.id) || have.has(`${player.uuid}|${adv.id}`)) continue;
            fresh.push({ player, adv });
          }
        }
        if (!fresh.length) return { events: [], completion: null, changed: false };

        // chronologisch eintragen, damit "wer war zuerst" stimmt
        fresh.sort((a, b) => (a.adv.at ?? now).localeCompare(b.adv.at ?? now));
        const before = await computeGameState(game);
        const events = [];
        for (const { player, adv } of fresh) {
          const teamNew = !(await db.get("SELECT 1 FROM game_entries WHERE game_id = 'minecraft' AND item = ?", [adv.id]));
          const { lastID } = await db.run(
            `INSERT INTO game_entries (game_id, user_name, item, ref, value, silent, created_at)
             VALUES ('minecraft', ?, ?, ?, 1, ?, ?)`,
            [player.name, adv.id, player.uuid, silent || !teamNew ? 1 : 0, silent ? now : adv.at ?? now],
          );
          if (!silent && teamNew) {
            const after = await computeGameState(game);
            const message = buildMinecraftMessage(player.name, titles.get(adv.id), after);
            await db.run('UPDATE game_entries SET message = ? WHERE id = ?', [message, lastID]);
            const row = await db.get('SELECT * FROM game_entries WHERE id = ?', [lastID]);
            events.push(toGameEvent(row, game));
          }
        }
        const after = await computeGameState(game);
        const last = fresh[fresh.length - 1].player.name;
        const completion = silent ? null : await checkCompletion(game, before, after, last, now);
        return { events, completion, changed: true };
      }),
    );
  }

  async function getGameHistory(gameId, limit = GAME_HISTORY_LIMIT) {
    const game = getGame(gameId);
    if (!game) throw new Error(`Unbekanntes Spiel: ${gameId}`);
    const rows = await db.all(
      'SELECT * FROM game_entries WHERE game_id = ? AND undone = 0 ORDER BY id DESC LIMIT ?',
      [game.id, limit],
    );
    return rows.map((r) => ({ ...toGameEntry(r), message: r.message }));
  }

  async function getGamesState() {
    const list = [];
    for (const game of GAMES) list.push(await computeGameState(game));
    const recentRows = await db.all(
      `SELECT * FROM game_entries WHERE undone = 0 AND silent = 0 AND message IS NOT NULL
       ORDER BY id DESC LIMIT ?`,
      [RECENT_GAME_EVENTS_LIMIT],
    );
    return {
      list,
      completed: list.filter((g) => g.completed).length,
      total: list.length,
      recentEvents: recentRows.map((r) => toGameEvent(r, getGame(r.game_id) ?? { id: r.game_id, color: null })),
    };
  }

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  async function getLeaderboards() {
    const rows = await db.all(
      `SELECT challenge_id, user_name, SUM(amount) AS total, MAX(created_at) AS last_at
       FROM events
       GROUP BY challenge_id, user_name
       HAVING total > 0
       ORDER BY challenge_id, total DESC, last_at ASC`,
    );
    const boards = Object.fromEntries(CHALLENGES.map((c) => [c.id, []]));
    for (const row of rows) {
      const board = boards[row.challenge_id];
      if (!board) continue;
      board.push({ rank: board.length + 1, name: row.user_name, total: row.total });
    }
    return boards;
  }

  async function getRecentEvents(limit = RECENT_EVENTS_LIMIT) {
    const rows = await db.all(`${EVENT_SELECT} ORDER BY e.id DESC LIMIT ?`, [limit]);
    return rows.map(toEvent);
  }

  async function getState() {
    const statsRows = await db.all('SELECT challenge_id, total, updated_at FROM stats');
    const statsById = new Map(statsRows.map((r) => [r.challenge_id, r]));
    const milestoneRows = await db.all('SELECT * FROM milestones ORDER BY reached_at');
    const { players } = await db.get(
      `SELECT COUNT(*) AS players FROM (
         SELECT user_name FROM events GROUP BY user_name HAVING SUM(amount) > 0
       )`,
    );
    const { eventCount } = await db.get("SELECT COUNT(*) AS eventCount FROM events WHERE type = 'tick'");

    const challenges = CHALLENGES.map((c) => {
      const stats = statsById.get(c.id);
      const total = stats?.total ?? 0;
      return {
        ...publicChallengeConfig(c),
        total,
        percent: percentOf(total, c.goal),
        completed: total >= c.goal,
        updatedAt: stats?.updated_at ?? null,
        milestonesReached: milestoneRows
          .filter((m) => m.challenge_id === c.id)
          .map((m) => ({ percent: m.percent, name: m.user_name, reachedAt: m.reached_at })),
      };
    });

    return {
      challenges,
      milestoneSteps: MILESTONES,
      leaderboards: await getLeaderboards(),
      recentEvents: await getRecentEvents(),
      darts: await getDartsOverview(),
      games: await getGamesState(),
      players,
      eventCount,
      serverTime: new Date().toISOString(),
    };
  }

  async function getEvents({ limit = 500, offset = 0 } = {}) {
    const rows = await db.all(`${EVENT_SELECT} ORDER BY e.id ASC LIMIT ? OFFSET ?`, [limit, offset]);
    return rows.map(toEvent);
  }

  async function reset() {
    return exclusive(() =>
      transaction(async () => {
        await db.run('DELETE FROM game_entries');
        await db.run('DELETE FROM game_completions');
        minecraftSilentImport = true;
        await db.run('DELETE FROM dart_turns');
        await db.run('DELETE FROM dart_game_players');
        await db.run('DELETE FROM dart_games');
        await db.run('DELETE FROM milestones');
        await db.run('DELETE FROM events');
        await db.run(
          "DELETE FROM sqlite_sequence WHERE name IN ('events', 'dart_turns', 'dart_games', 'game_entries')",
        );
        await db.run('UPDATE stats SET total = 0, updated_at = NULL');
      }),
    );
  }

  async function close() {
    await writeQueue;
    await db.close();
  }

  return {
    addTick,
    undoLastTick,
    createDartGame,
    addDartTurn,
    undoDartTurn,
    abortDartGame,
    getDartGame,
    getDartHistory,
    addGameEntry,
    undoGameEntry,
    syncMinecraft,
    getGameHistory,
    getGamesState,
    getState,
    getEvents,
    getRecentEvents,
    getLeaderboards,
    reset,
    close,
  };
}
