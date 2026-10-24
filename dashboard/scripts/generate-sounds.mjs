// Erzeugt die Standard-Soundeffekte (8-Bit/Chiptune-Stil) als WAV-Dateien in public/sounds/.
// Aufruf: npm run sounds
// Eigene Sounds? Einfach die Dateien in public/sounds/ mit gleichem Namen ersetzen
// (oder in src/lib/sound.js auf .mp3 umstellen).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SAMPLE_RATE = 44100;
const OUT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'sounds');

const NOTE = {
  C4: 261.63, E4: 329.63, G4: 392.0, A4: 440.0,
  C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880.0, B5: 987.77,
  C6: 1046.5, E6: 1318.51, G6: 1567.98, C7: 2093.0,
  C3: 130.81, G3: 196.0,
};

function wave(type, phase) {
  const p = phase % 1;
  switch (type) {
    case 'square':
      return p < 0.5 ? 0.6 : -0.6;
    case 'pulse':
      return p < 0.25 ? 0.6 : -0.6;
    case 'triangle':
      return 1 - 4 * Math.abs(p - 0.5);
    case 'saw':
      return (2 * p - 1) * 0.6;
    default:
      return Math.sin(2 * Math.PI * p);
  }
}

function createBuffer(seconds) {
  return new Float32Array(Math.ceil(seconds * SAMPLE_RATE));
}

function addNote(buf, start, duration, freq, opts = {}) {
  const {
    type = 'square',
    volume = 0.3,
    attack = 0.005,
    release = 0.08,
    slideTo = null,
    vibrato = 0,
    vibratoRate = 6,
  } = opts;
  const startIdx = Math.floor(start * SAMPLE_RATE);
  const length = Math.floor((duration + release) * SAMPLE_RATE);
  let phase = 0;
  for (let i = 0; i < length && startIdx + i < buf.length; i += 1) {
    const t = i / SAMPLE_RATE;
    const progress = Math.min(t / duration, 1);
    let f = slideTo ? freq * Math.pow(slideTo / freq, progress) : freq;
    if (vibrato) f *= 1 + vibrato * Math.sin(2 * Math.PI * vibratoRate * t);
    phase += f / SAMPLE_RATE;
    let env;
    if (t < attack) env = t / attack;
    else if (t < duration) env = 1 - 0.25 * ((t - attack) / Math.max(duration - attack, 1e-6));
    else env = 0.75 * Math.exp(-((t - duration) / release) * 4);
    buf[startIdx + i] += wave(type, phase) * env * volume;
  }
}

function addNoise(buf, start, duration, volume = 0.3) {
  const startIdx = Math.floor(start * SAMPLE_RATE);
  const length = Math.floor(duration * SAMPLE_RATE);
  let last = 0;
  for (let i = 0; i < length && startIdx + i < buf.length; i += 1) {
    const env = Math.exp(-(i / length) * 6);
    last = last * 0.6 + (Math.random() * 2 - 1) * 0.4;
    buf[startIdx + i] += last * env * volume;
  }
}

function addEcho(buf, delaySeconds, feedback) {
  const d = Math.floor(delaySeconds * SAMPLE_RATE);
  for (let i = d; i < buf.length; i += 1) buf[i] += buf[i - d] * feedback;
}

function normalize(buf, peak = 0.89) {
  let max = 0;
  for (const v of buf) max = Math.max(max, Math.abs(v));
  if (max === 0) return buf;
  const gain = peak / max;
  for (let i = 0; i < buf.length; i += 1) buf[i] *= gain;
  // kurzes Fade-out gegen Knacken am Ende
  const fade = Math.min(buf.length, Math.floor(0.01 * SAMPLE_RATE));
  for (let i = 0; i < fade; i += 1) buf[buf.length - 1 - i] *= i / fade;
  return buf;
}

function writeWav(file, buf) {
  const data = Buffer.alloc(buf.length * 2);
  for (let i = 0; i < buf.length; i += 1) {
    const s = Math.max(-1, Math.min(1, buf[i]));
    data.writeInt16LE(Math.round(s * 32767), i * 2);
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // Mono
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  fs.writeFileSync(file, Buffer.concat([header, data]));
}

// --- Sounds -----------------------------------------------------------------------

function tick() {
  const buf = createBuffer(0.45);
  addNote(buf, 0, 0.06, NOTE.B5, { type: 'square', volume: 0.3, release: 0.02 });
  addNote(buf, 0.06, 0.22, NOTE.E6, { type: 'square', volume: 0.3, release: 0.12 });
  addNote(buf, 0.06, 0.22, NOTE.E6 * 2, { type: 'triangle', volume: 0.08, release: 0.1 });
  addEcho(buf, 0.09, 0.25);
  return normalize(buf, 0.7);
}

function undo() {
  const buf = createBuffer(0.45);
  addNote(buf, 0, 0.28, NOTE.E5, { type: 'triangle', volume: 0.5, slideTo: NOTE.A4 / 2, release: 0.1 });
  addNote(buf, 0, 0.28, NOTE.E5 / 2, { type: 'square', volume: 0.12, slideTo: NOTE.A4 / 4, release: 0.1 });
  return normalize(buf, 0.6);
}

function milestone() {
  const buf = createBuffer(1.9);
  const arp = [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6, NOTE.E6, NOTE.G6];
  arp.forEach((f, i) => {
    addNote(buf, i * 0.065, 0.06, f, { type: 'square', volume: 0.25, release: 0.03 });
  });
  const chordStart = arp.length * 0.065;
  for (const f of [NOTE.C6, NOTE.E6, NOTE.G6]) {
    addNote(buf, chordStart, 0.75, f, { type: 'pulse', volume: 0.14, vibrato: 0.006, release: 0.35 });
  }
  addNote(buf, chordStart, 0.75, NOTE.C7, { type: 'triangle', volume: 0.1, vibrato: 0.008, release: 0.35 });
  addNote(buf, chordStart, 0.8, NOTE.C3, { type: 'triangle', volume: 0.4, release: 0.3 });
  addNoise(buf, chordStart, 0.18, 0.25);
  addEcho(buf, 0.14, 0.3);
  return normalize(buf, 0.85);
}

function complete() {
  const buf = createBuffer(4.2);
  const run = [NOTE.C4, NOTE.E4, NOTE.G4, NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6];
  run.forEach((f, i) => {
    addNote(buf, i * 0.07, 0.065, f, { type: 'square', volume: 0.22, release: 0.03 });
  });
  const t1 = run.length * 0.07 + 0.05;
  // Fanfare: G5 – A5 – C6 (lang)
  addNote(buf, t1, 0.16, NOTE.G5, { type: 'square', volume: 0.25 });
  addNote(buf, t1 + 0.2, 0.16, NOTE.A5, { type: 'square', volume: 0.25 });
  const t2 = t1 + 0.42;
  for (const f of [NOTE.C6, NOTE.E6, NOTE.G6]) {
    addNote(buf, t2, 1.6, f, { type: 'pulse', volume: 0.13, vibrato: 0.01, vibratoRate: 5.5, release: 0.8 });
  }
  addNote(buf, t2, 1.6, NOTE.C5, { type: 'saw', volume: 0.12, vibrato: 0.006, release: 0.8 });
  addNote(buf, t2, 1.8, NOTE.C3, { type: 'triangle', volume: 0.45, release: 0.6 });
  addNote(buf, t1, 0.36, NOTE.G3, { type: 'triangle', volume: 0.4 });
  addNoise(buf, t1, 0.12, 0.25);
  addNoise(buf, t2, 0.3, 0.35);
  addNoise(buf, t2 + 0.5, 0.15, 0.15);
  addEcho(buf, 0.16, 0.35);
  return normalize(buf, 0.9);
}

fs.mkdirSync(OUT_DIR, { recursive: true });
const sounds = { tick, undo, milestone, complete };
for (const [name, build] of Object.entries(sounds)) {
  const file = path.join(OUT_DIR, `${name}.wav`);
  writeWav(file, build());
  console.log(`✅ ${path.relative(process.cwd(), file)}`);
}
