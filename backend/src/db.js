import fs from 'node:fs';
import path from 'node:path';
import sqlite3 from 'sqlite3';
import {
  CHALLENGES,
  MILESTONES,
  getChallenge,
  publicChallengeConfig,
  buildEventMessage,
  buildMilestoneMessage,
} from './challenges.js';

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
`;

const RECENT_EVENTS_LIMIT = 30;

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
  event.message = buildEventMessage(event);
  return event;
}

function percentOf(total, goal) {
  return goal > 0 ? Math.round((total / goal) * 1000) / 10 : 0;
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

  async function addTick(name, challengeId) {
    const challenge = getChallenge(challengeId);
    if (!challenge) throw new Error(`Unbekannte Challenge: ${challengeId}`);

    return exclusive(() =>
      transaction(async () => {
        const now = new Date().toISOString();
        const { lastID } = await db.run(
          `INSERT INTO events (type, user_name, challenge_id, amount, created_at)
           VALUES ('tick', ?, ?, ?, ?)`,
          [name, challenge.id, challenge.increment, now],
        );
        await db.run('UPDATE stats SET total = total + ?, updated_at = ? WHERE challenge_id = ?', [
          challenge.increment,
          now,
          challenge.id,
        ]);
        const { total } = await db.get('SELECT total FROM stats WHERE challenge_id = ?', [challenge.id]);

        const milestones = [];
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

        const row = await db.get('SELECT * FROM events WHERE id = ?', [lastID]);
        return { event: toEvent(row), milestones };
      }),
    );
  }

  // Nimmt den letzten eigenen Tick zurück (optional nur in einer bestimmten Challenge).
  async function undoLastTick(name, challengeId = null) {
    if (challengeId && !getChallenge(challengeId)) throw new Error(`Unbekannte Challenge: ${challengeId}`);

    return exclusive(() =>
      transaction(async () => {
        const target = await db.get(
          `SELECT e.* FROM events e
           WHERE e.type = 'tick' AND e.user_name = ?
             AND (? IS NULL OR e.challenge_id = ?)
             AND NOT EXISTS (SELECT 1 FROM events u WHERE u.reverts_event_id = e.id)
           ORDER BY e.id DESC
           LIMIT 1`,
          [name, challengeId, challengeId],
        );
        if (!target) return null;

        const now = new Date().toISOString();
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

        const row = await db.get('SELECT * FROM events WHERE id = ?', [lastID]);
        return { event: toEvent(row) };
      }),
    );
  }

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
    const rows = await db.all('SELECT * FROM events ORDER BY id DESC LIMIT ?', [limit]);
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
      players,
      eventCount,
      serverTime: new Date().toISOString(),
    };
  }

  async function getEvents({ limit = 500, offset = 0 } = {}) {
    const rows = await db.all('SELECT * FROM events ORDER BY id ASC LIMIT ? OFFSET ?', [limit, offset]);
    return rows.map(toEvent);
  }

  async function reset() {
    return exclusive(() =>
      transaction(async () => {
        await db.run('DELETE FROM milestones');
        await db.run('DELETE FROM events');
        await db.run("DELETE FROM sqlite_sequence WHERE name = 'events'");
        await db.run('UPDATE stats SET total = 0, updated_at = NULL');
      }),
    );
  }

  async function close() {
    await writeQueue;
    await db.close();
  }

  return { addTick, undoLastTick, getState, getEvents, getRecentEvents, getLeaderboards, reset, close };
}
