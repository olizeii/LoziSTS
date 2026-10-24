import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { createStore } from '../src/db.js';
import { catalogFor, readMinecraftSnapshot } from '../src/minecraft.js';

const STEVE = '11111111-1111-1111-1111-111111111111';
const ALEX = '22222222-2222-2222-2222-222222222222';

// Baut einen Minecraft-Server-Ordner wie auf dem echten Server nach
function writeMinecraftServer(dir, { version = '1.21.4', advancements }) {
  fs.mkdirSync(path.join(dir, 'party_world', 'advancements'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'logs'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'server.properties'), 'motd=LAN\nlevel-name=party_world\n');
  fs.writeFileSync(path.join(dir, 'logs', 'latest.log'), `[12:00:00] [Server thread/INFO]: Starting minecraft server version ${version}\n`);
  fs.writeFileSync(
    path.join(dir, 'usercache.json'),
    JSON.stringify([
      { name: 'Steve', uuid: STEVE, expiresOn: '2026-12-01 10:00:00 +0100' },
      { name: 'Alex', uuid: ALEX, expiresOn: '2026-12-01 10:00:00 +0100' },
    ]),
  );
  for (const [uuid, ids] of Object.entries(advancements)) {
    const data = { DataVersion: 4189 };
    for (const id of ids) data[id] = { criteria: { x: '2026-10-24 15:02:11 +0200' }, done: true };
    data['minecraft:recipes/misc/torch'] = { criteria: { x: '2026-10-24 15:00:00 +0200' }, done: true };
    data['minecraft:story/smelt_iron'] = { criteria: {}, done: false };
    fs.writeFileSync(path.join(dir, 'party_world', 'advancements', `${uuid}.json`), JSON.stringify(data));
  }
}

describe('Minecraft-Katalog', () => {
  test('Anzahl je Version', () => {
    assert.equal(catalogFor('1.21.4').length, 122);
    assert.equal(catalogFor('1.21.5').length, 122);
    assert.equal(catalogFor('1.21.8').length, 124);
    assert.equal(catalogFor('1.21.11').length, 125);
    assert.equal(catalogFor(null).length, 125);
  });
});

describe('Games-Store', () => {
  let store;
  let dir;
  let mcDir;
  const game = async (id) => (await store.getGamesState()).list.find((g) => g.id === id);

  before(async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lan-games-'));
    mcDir = path.join(dir, 'minecraft');
    store = await createStore(path.join(dir, 'test.db'));
  });

  after(async () => {
    await store.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('Siege: Valorant zählt Siege bis 5 und feiert einmal', async () => {
    for (let i = 0; i < 4; i += 1) await store.addGameEntry({ name: 'Max', gameId: 'valorant', value: 1 });
    const loss = await store.addGameEntry({ name: 'Lena', gameId: 'valorant', value: 0 });
    assert.match(loss.event.message, /Niederlage/);
    const win = await store.addGameEntry({ name: 'Lena', gameId: 'valorant', value: 1 });
    assert.equal(win.game.value, 5);
    assert.equal(win.game.completed, true);
    assert.ok(win.completion);
    const again = await store.addGameEntry({ name: 'Lena', gameId: 'valorant', value: 1 });
    assert.equal(again.completion, null);
    assert.equal((await game('valorant')).losses, 1);
  });

  test('Serie: Fortnite B3B braucht 3 Siege am Stück', async () => {
    for (const v of [1, 1, 0, 1, 1]) await store.addGameEntry({ name: 'Tim', gameId: 'fortnite', value: v });
    let g = await game('fortnite');
    assert.equal(g.value, 2);
    assert.equal(g.completed, false);
    const res = await store.addGameEntry({ name: 'Tim', gameId: 'fortnite', value: 1 });
    assert.equal(res.game.completed, true);
    assert.ok(res.completion);
    await store.addGameEntry({ name: 'Tim', gameId: 'fortnite', value: 0 });
    g = await game('fortnite');
    assert.equal(g.value, 0);
    assert.equal(g.completed, true, 'einmal geschafft bleibt geschafft');
  });

  test('Bestwert, Platz und Summe', async () => {
    await store.addGameEntry({ name: 'Max', gameId: 'dino', value: 4200 });
    const rec = await store.addGameEntry({ name: 'Lena', gameId: 'dino', value: 9800 });
    assert.match(rec.event.message, /Rekord/);
    assert.equal((await game('dino')).value, 9800);
    await assert.rejects(store.addGameEntry({ name: 'Max', gameId: 'holeio', value: 120 }), /zwischen/);

    await store.addGameEntry({ name: 'Max', gameId: 'slither', value: 4 });
    const first = await store.addGameEntry({ name: 'Max', gameId: 'slither', value: 1 });
    assert.equal(first.game.completed, true);

    await store.addGameEntry({ name: 'Max', gameId: 'timeguessr', value: 30000 });
    await store.addGameEntry({ name: 'Lena', gameId: 'timeguessr', value: 41000 });
    assert.equal((await game('timeguessr')).value, 71000);
    await assert.rejects(store.addGameEntry({ name: 'Max', gameId: 'timeguessr', value: 60000 }), /zwischen/);
  });

  test('Aufgabe, Undo der eigenen letzten Eingabe', async () => {
    const done = await store.addGameEntry({ name: 'Paul', gameId: 'freestyle', value: 1 });
    assert.equal(done.game.completed, true);
    await assert.rejects(store.undoGameEntry({ name: 'Max', gameId: 'freestyle' }), /Keine eigene/);
    const undo = await store.undoGameEntry({ name: 'Paul', gameId: 'freestyle' });
    assert.equal(undo.game.completed, false);
  });

  test('Mario Kart: nur Gold zählt, letzter Stand pro Cup gilt', async () => {
    await store.addGameEntry({ name: 'Mia', gameId: 'mariokart', item: 'mushroom', value: 2 });
    let g = await game('mariokart');
    assert.equal(g.value, 0);
    assert.equal(g.items.find((c) => c.id === 'mushroom').trophy, 2);
    const gold = await store.addGameEntry({ name: 'Mia', gameId: 'mariokart', item: 'mushroom', value: 1 });
    assert.match(gold.event.message, /GOLD im Pilz-Cup/);
    g = await game('mariokart');
    assert.equal(g.value, 1);
    await assert.rejects(store.addGameEntry({ name: 'Mia', gameId: 'mariokart', item: 'rainbow', value: 1 }), /Unbekannter Cup/);
  });

  test('Just Dance: Songs abhaken und zurücknehmen', async () => {
    await store.addGameEntry({ name: 'Anna', gameId: 'justdance', item: 'uptown-funk', value: 1 });
    await store.addGameEntry({ name: 'Anna', gameId: 'justdance', item: 'teacher', value: 1 });
    await store.addGameEntry({ name: 'Felix', gameId: 'justdance', item: 'teacher', value: 0 });
    const g = await game('justdance');
    assert.equal(g.goal, 43);
    assert.equal(g.value, 1);
    assert.equal(g.items.find((s) => s.id === 'uptown-funk').by, 'Anna');
  });

  test('Minecraft: Snapshot lesen, still importieren, neue Advancements melden', async () => {
    writeMinecraftServer(mcDir, {
      advancements: {
        [STEVE]: ['minecraft:story/root', 'minecraft:story/mine_stone'],
        [ALEX]: ['minecraft:story/root'],
      },
    });
    const snap = await readMinecraftSnapshot({ dir: mcDir });
    assert.equal(snap.ok, true);
    assert.equal(snap.world, 'party_world');
    assert.equal(snap.version, '1.21.4');
    assert.equal(snap.players.find((p) => p.uuid === STEVE).name, 'Steve');
    assert.equal(snap.players.find((p) => p.uuid === STEVE).done.length, 2, 'Rezepte und unfertige zählen nicht');

    const first = await store.syncMinecraft(snap);
    assert.equal(first.events.length, 0, 'erster Abgleich ist still');
    let g = await game('minecraft');
    assert.equal(g.goal, 122);
    assert.equal(g.value, 2);
    assert.equal(g.sync.version, '1.21.4');

    writeMinecraftServer(mcDir, {
      advancements: {
        [STEVE]: ['minecraft:story/root', 'minecraft:story/mine_stone'],
        [ALEX]: ['minecraft:story/root', 'minecraft:story/mine_stone', 'minecraft:story/mine_diamond'],
      },
    });
    const second = await store.syncMinecraft(await readMinecraftSnapshot({ dir: mcDir }));
    assert.equal(second.events.length, 1, 'nur das für das Team neue Advancement wird gemeldet');
    assert.match(second.events[0].message, /Alex hat „Diamanten!" erreicht! \(3\/122\)/);
    g = await game('minecraft');
    assert.equal(g.value, 3);
    assert.equal(g.leaders[0].name, 'Alex');

    const none = await store.syncMinecraft(await readMinecraftSnapshot({ dir: mcDir }));
    assert.equal(none.changed, false);
    await assert.rejects(store.undoGameEntry({ name: 'Alex', gameId: 'minecraft' }), /automatisch/);
  });

  test('Minecraft ohne Ordner meldet einen Fehler statt abzustürzen', async () => {
    const snap = await readMinecraftSnapshot({ dir: path.join(dir, 'gibts-nicht') });
    assert.equal(snap.ok, false);
    await store.syncMinecraft(snap);
    assert.equal((await game('minecraft')).sync.ok, false);
  });

  test('Ticker-Historie und Reset', async () => {
    const state = await store.getGamesState();
    assert.ok(state.recentEvents.length > 5);
    assert.ok(state.recentEvents.every((e) => e.message));
    await store.reset();
    const after = await store.getGamesState();
    assert.equal(after.recentEvents.length, 0);
    assert.equal(after.list.find((g) => g.id === 'valorant').value, 0);
  });
});
