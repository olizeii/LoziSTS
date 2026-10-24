// Spielt lokale Sounddateien aus public/sounds/ per HTML5 Audio.
// Eigene Sounds: Dateien ersetzen oder hier auf .mp3 umstellen.
const FILES = {
  tick: 'sounds/tick.wav',
  undo: 'sounds/undo.wav',
  milestone: 'sounds/milestone.wav',
  complete: 'sounds/complete.wav',
};

const VOLUME = {
  tick: 0.55,
  undo: 0.4,
  milestone: 0.9,
  complete: 1,
};

// Mehrere Instanzen pro Sound, damit sich schnelle Ticks überlagern können
const POOL_SIZE = 6;
const STORAGE_KEY = 'lan-tracker-muted';

function readMuted() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function writeMuted(muted) {
  try {
    window.localStorage.setItem(STORAGE_KEY, muted ? '1' : '0');
  } catch {
    // Speicher nicht verfügbar – Einstellung gilt nur für diese Sitzung
  }
}

class SoundManager {
  constructor() {
    this.pools = {};
    this.muted = readMuted();
    this.listeners = new Set();
  }

  pool(name) {
    if (!this.pools[name]) {
      const src = `${import.meta.env.BASE_URL}${FILES[name]}`;
      this.pools[name] = Array.from({ length: POOL_SIZE }, () => {
        const audio = new Audio(src);
        audio.preload = 'auto';
        return audio;
      });
    }
    return this.pools[name];
  }

  preload() {
    Object.keys(FILES).forEach((name) => this.pool(name));
  }

  // Muss aus einem Klick/Tastendruck heraus aufgerufen werden (Autoplay-Regeln der Browser)
  unlock() {
    this.preload();
    for (const name of Object.keys(FILES)) {
      const audio = this.pools[name][0];
      audio.muted = true;
      audio
        .play()
        .then(() => {
          audio.pause();
          audio.currentTime = 0;
        })
        .catch(() => {})
        .finally(() => {
          audio.muted = false;
        });
    }
  }

  play(name) {
    if (this.muted || !FILES[name]) return;
    const pool = this.pool(name);
    const audio = pool.find((a) => a.paused || a.ended) ?? pool[0];
    audio.currentTime = 0;
    audio.volume = VOLUME[name] ?? 1;
    audio.play().catch((err) => console.warn(`[sound] ${name} konnte nicht abgespielt werden:`, err.message));
  }

  setMuted(muted) {
    this.muted = muted;
    writeMuted(muted);
    this.listeners.forEach((fn) => fn(muted));
  }

  toggleMuted() {
    this.setMuted(!this.muted);
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
}

export const sound = new SoundManager();
