// Liest den Advancement-Fortschritt direkt aus dem Ordner des Minecraft-Java-Servers:
//   <MINECRAFT_DIR>/server.properties        → Name der Welt (level-name)
//   <MINECRAFT_DIR>/<welt>/advancements/*.json → Fortschritt pro Spieler (Dateiname = UUID)
//   <MINECRAFT_DIR>/usercache.json           → UUID → Spielername
//   <MINECRAFT_DIR>/logs/latest.log          → Server-Version ("Starting minecraft server version 1.21.4")
import fs from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CATALOG = JSON.parse(
  readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'data', 'minecraft-advancements.json'), 'utf8'),
).advancements;

function compareVersions(a, b) {
  const x = a.split('.').map(Number);
  const y = b.split('.').map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i += 1) {
    const d = (x[i] ?? 0) - (y[i] ?? 0);
    if (d) return d;
  }
  return 0;
}

// Advancements, die es in dieser Version gibt (ohne bekannte Version: neueste Liste)
export function catalogFor(version) {
  return CATALOG.filter((a) => {
    if (!version) return !a.until;
    if (a.since && compareVersions(version, a.since) < 0) return false;
    if (a.until && compareVersions(version, a.until) >= 0) return false;
    return true;
  });
}

async function readText(file) {
  try {
    return await fs.readFile(file, 'utf8');
  } catch {
    return null;
  }
}

async function readJsonFile(file) {
  const text = await readText(file);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function detectWorldName(dir) {
  const props = await readText(path.join(dir, 'server.properties'));
  const match = props?.match(/^level-name=(.+)$/m);
  return match ? match[1].trim() : 'world';
}

async function detectVersion(dir) {
  const log = await readText(path.join(dir, 'logs', 'latest.log'));
  const match = log?.match(/Starting minecraft server version (\S+)/);
  return match ? match[1] : null;
}

// "2025-10-24 15:02:11 +0200" → ISO-Zeitstempel
function parseMinecraftDate(text) {
  const m = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) ([+-]\d{2})(\d{2})$/.exec(text ?? '');
  if (!m) return null;
  const date = new Date(`${m[1]}T${m[2]}${m[3]}:${m[4]}`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

// Momentaufnahme: welche Spieler haben welche Advancements abgeschlossen?
export async function readMinecraftSnapshot({ dir, version: versionOverride }) {
  if (!dir) return { ok: false, error: 'MINECRAFT_DIR ist nicht gesetzt' };
  try {
    await fs.access(dir);
  } catch {
    return { ok: false, error: `Minecraft-Ordner nicht gefunden: ${dir}` };
  }

  const world = await detectWorldName(dir);
  // ponytail: Neuere Vanilla-Server legen advancements unter <welt>/players/advancements ab,
  // ältere direkt unter <welt>/advancements — beide probieren statt raten.
  const advCandidates = [path.join(dir, world, 'players', 'advancements'), path.join(dir, world, 'advancements')];
  let advDir = null;
  let files;
  for (const candidate of advCandidates) {
    try {
      files = (await fs.readdir(candidate)).filter((f) => f.endsWith('.json'));
      advDir = candidate;
      break;
    } catch {
      // nächsten Kandidaten probieren
    }
  }
  if (!advDir) {
    return { ok: false, error: `Kein Advancement-Ordner gefunden (${advCandidates.join(' oder ')})` };
  }

  const version = versionOverride || (await detectVersion(dir));
  const usercache = (await readJsonFile(path.join(dir, 'usercache.json'))) ?? [];
  const names = new Map(usercache.map((u) => [u.uuid, u.name]));

  const players = [];
  for (const file of files) {
    const uuid = file.replace(/\.json$/, '');
    const data = await readJsonFile(path.join(advDir, file));
    if (!data) continue;
    const done = [];
    for (const [id, progress] of Object.entries(data)) {
      if (!id.startsWith('minecraft:') || id.startsWith('minecraft:recipes/') || !progress?.done) continue;
      const times = Object.values(progress.criteria ?? {}).map(parseMinecraftDate).filter(Boolean).sort();
      done.push({ id, at: times[times.length - 1] ?? null });
    }
    players.push({ uuid, name: names.get(uuid) ?? uuid.slice(0, 8), done });
  }

  return { ok: true, world, version, versionDetected: !versionOverride && Boolean(version), players };
}
