import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { dartsLabel, normalizeDart, scoreX01Turn } from '../src/darts.js';
import { createStore } from '../src/db.js';

const T20 = { segment: 20, multiplier: 3 };
const D20 = { segment: 20, multiplier: 2 };
const S20 = { segment: 20, multiplier: 1 };
const S1 = { segment: 1, multiplier: 1 };
const D16 = { segment: 16, multiplier: 2 };
const BULL = { segment: 25, multiplier: 2 };
const MISS = { segment: 0, multiplier: 0 };

const norm = (darts) => darts.map(normalizeDart);

describe('Dart-Regeln', () => {
  test('normalisiert und beschriftet Darts', () => {
    assert.deepEqual(normalizeDart(T20), { segment: 20, multiplier: 3, points: 60 });
    assert.equal(normalizeDart({ segment: 25, multiplier: 3 }), null);
    assert.equal(normalizeDart({ segment: 21, multiplier: 1 }), null);
    assert.equal(dartsLabel(norm([T20, D16, BULL, MISS, { segment: 25, multiplier: 1 }])), 'T20 D16 BULL 0 25');
  });

  test('normale Aufnahme wird mit Fehlwürfen auf 3 Darts aufgefüllt', () => {
    const r = scoreX01Turn(norm([T20]), 501, true);
    assert.equal(r.scored, 60);
    assert.equal(r.darts.length, 3);
    assert.equal(r.remainingAfter, 441);
  });

  test('Bust bei Überwerfen, Rest 1 und Checkout ohne Double', () => {
    assert.equal(scoreX01Turn(norm([T20]), 40, true).bust, true);
    assert.equal(scoreX01Turn(norm([S20, S20]), 41, true).bust, true);
    assert.equal(scoreX01Turn(norm([S20, S20]), 40, true).bust, true);
    assert.equal(scoreX01Turn(norm([S20, S20]), 40, false).checkout, true);
  });

  test('Checkout mit Double bzw. Bull beendet die Aufnahme', () => {
    const r = scoreX01Turn(norm([T20, D20, T20]), 100, true);
    assert.equal(r.checkout, true);
    assert.equal(r.darts.length, 2);
    assert.equal(r.scored, 100);
    assert.equal(scoreX01Turn(norm([BULL]), 50, true).checkout, true);
  });
});

describe('Dart-Store', () => {
  let store;
  let dir;

  before(async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lan-darts-'));
    store = await createStore(path.join(dir, 'test.db'));
  });

  after(async () => {
    await store.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const dartsTotal = async () => (await store.getState()).challenges.find((c) => c.id === 'darts').total;

  test('freie Aufnahme zählt voll in den Team-Countdown', async () => {
    const { turn, event } = await store.addDartTurn({ enteredBy: 'Max', darts: [T20, T20, T20] });
    assert.equal(turn.raw, 180);
    assert.equal(event.amount, 180);
    assert.match(event.message, /ONE HUNDRED AND EIGHTY/);
    assert.equal(await dartsTotal(), 180);
    const state = await store.getState();
    assert.equal(state.darts.remaining, 10001 - 180);
    assert.equal(state.darts.count180, 1);
  });

  test('normaler Tick auf Darts wird abgelehnt', async () => {
    await assert.rejects(store.addTick('Max', 'darts'), /Dart-Tracker/);
  });

  test('1v1-Spiel: Reihenfolge, Bust, Checkout und Sieger', async () => {
    const before = await dartsTotal();
    const game = await store.createDartGame({ createdBy: 'Max', players: ['Max', 'Lena'], startScore: 101, doubleOut: true });
    assert.equal(game.currentPlayer, 'Max');

    await store.addDartTurn({ enteredBy: 'Max', gameId: game.id, player: 'Max', darts: [T20, S1] }); // Max 101 → 40
    await assert.rejects(
      store.addDartTurn({ enteredBy: 'Max', gameId: game.id, player: 'Max', darts: [S1] }),
      /Lena ist am Wurf/,
    );
    const bust = await store.addDartTurn({ enteredBy: 'Max', gameId: game.id, darts: [T20, T20] }); // Lena bust
    assert.equal(bust.turn.bust, true);
    assert.equal(bust.event.amount, 0);
    assert.equal(bust.game.players.find((p) => p.name === 'Lena').remaining, 101);

    const win = await store.addDartTurn({ enteredBy: 'Lena', gameId: game.id, darts: [D20] }); // Max checkt 40 aus
    assert.equal(win.turn.checkout, true);
    assert.equal(win.game.status, 'finished');
    assert.equal(win.game.winner, 'Max');
    assert.equal(await dartsTotal(), before + 61 + 40);

    await assert.rejects(store.addDartTurn({ enteredBy: 'Max', gameId: game.id, darts: [S1] }), /beendet/);
  });

  test('Undo des Checkouts öffnet das Spiel wieder', async () => {
    const game = await store.createDartGame({ createdBy: 'Tim', players: ['Tim'], startScore: 101, doubleOut: true });
    await store.addDartTurn({ enteredBy: 'Tim', gameId: game.id, darts: [T20, D20, S1] }); // 101 → 0? 60+40=100, +1 = 101 aber letzter nicht Double → Bust
    let g = await store.getDartGame(game.id);
    assert.equal(g.players[0].remaining, 101);
    await store.addDartTurn({ enteredBy: 'Tim', gameId: game.id, darts: [T20, S1, D20] }); // Checkout
    g = await store.getDartGame(game.id);
    assert.equal(g.status, 'finished');

    const before = await dartsTotal();
    const { game: reopened } = await store.undoDartTurn({ requester: 'Tim', gameId: game.id });
    assert.equal(reopened.status, 'active');
    assert.equal(reopened.winner, null);
    assert.equal(reopened.players[0].remaining, 101);
    assert.equal(await dartsTotal(), before - 101);
  });

  test('Verlauf und Spieler-Statistik', async () => {
    const { stats, turns } = await store.getDartHistory('Max');
    assert.ok(turns.length >= 3);
    assert.equal(stats.gamesWon, 1);
    assert.equal(stats.count180, 1);
    assert.ok(stats.average > 0);
  });

  test('allgemeines Undo fasst Darts nicht an', async () => {
    await store.addTick('Max', 'beer');
    const res = await store.undoLastTick('Max');
    assert.equal(res.event.challengeId, 'beer');
    assert.equal(await store.undoLastTick('Max'), null);
  });

  test('Reset leert auch die Dart-Tabellen', async () => {
    await store.reset();
    const state = await store.getState();
    assert.equal(state.darts.total, 0);
    assert.equal(state.darts.turns, 0);
    assert.equal(state.darts.activeGames.length, 0);
  });
});
