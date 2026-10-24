// Dart-Regeln: Darts normalisieren, Aufnahmen werten (X01 mit Bust/Checkout) und beschriften.

// Zählt eine überworfene Aufnahme (Bust) trotzdem für den 10.001-Team-Countdown?
export const BUST_COUNTS_FOR_TEAM = false;

export const DARTS_PER_TURN = 3;
export const MAX_PLAYERS_PER_GAME = 8;
export const MIN_START_SCORE = 101;
export const MAX_START_SCORE = 2001;

// Ein Dart: segment 0 (Miss), 1–20 oder 25 (Bull); multiplier 1–3 (Bull nur 1–2)
export function normalizeDart(raw) {
  const segment = Number(raw?.segment);
  const multiplier = Number(raw?.multiplier ?? 1);
  if (!Number.isInteger(segment) || !Number.isInteger(multiplier)) return null;
  if (segment === 0) return { segment: 0, multiplier: 0, points: 0 };
  if (segment >= 1 && segment <= 20 && multiplier >= 1 && multiplier <= 3) {
    return { segment, multiplier, points: segment * multiplier };
  }
  if (segment === 25 && (multiplier === 1 || multiplier === 2)) {
    return { segment, multiplier, points: 25 * multiplier };
  }
  return null;
}

export function normalizeDarts(rawDarts) {
  if (!Array.isArray(rawDarts) || rawDarts.length < 1 || rawDarts.length > DARTS_PER_TURN) {
    throw new Error(`Eine Aufnahme hat 1–${DARTS_PER_TURN} Darts`);
  }
  return rawDarts.map((raw, i) => {
    const dart = normalizeDart(raw);
    if (!dart) throw new Error(`Dart ${i + 1} ist ungültig`);
    return dart;
  });
}

export function isDouble(dart) {
  return dart.multiplier === 2;
}

export function dartLabel(dart) {
  if (!dart || dart.segment === 0) return '0';
  if (dart.segment === 25) return dart.multiplier === 2 ? 'BULL' : '25';
  if (dart.multiplier === 3) return `T${dart.segment}`;
  if (dart.multiplier === 2) return `D${dart.segment}`;
  return String(dart.segment);
}

export function dartsLabel(darts) {
  return darts.map(dartLabel).join(' ');
}

export function sumDarts(darts) {
  return darts.reduce((sum, d) => sum + d.points, 0);
}

// Wertet eine Aufnahme in einem X01-Spiel.
// Nach Bust oder Checkout werden weitere Darts ignoriert.
export function scoreX01Turn(darts, remaining, doubleOut) {
  let rest = remaining;
  for (let i = 0; i < darts.length; i += 1) {
    const dart = darts[i];
    rest -= dart.points;
    const used = darts.slice(0, i + 1);
    const bust = rest < 0 || (doubleOut && rest === 1) || (rest === 0 && doubleOut && !isDouble(dart));
    if (bust) {
      return { darts: used, raw: sumDarts(used), scored: 0, bust: true, checkout: false, remainingAfter: remaining };
    }
    if (rest === 0) {
      return { darts: used, raw: sumDarts(used), scored: remaining, bust: false, checkout: true, remainingAfter: 0 };
    }
  }
  // Fehlende Darts einer normalen Aufnahme zählen als Fehlwürfe
  const filled = [...darts];
  while (filled.length < DARTS_PER_TURN) filled.push({ segment: 0, multiplier: 0, points: 0 });
  const raw = sumDarts(filled);
  return { darts: filled, raw, scored: raw, bust: false, checkout: false, remainingAfter: remaining - raw };
}

// Punkte, die eine Aufnahme zum 10.001-Team-Countdown beiträgt
export function teamPointsFor(result) {
  if (result.bust) return BUST_COUNTS_FOR_TEAM ? result.raw : 0;
  return result.raw;
}

export function buildDartMessage(name, dart) {
  const labels = dartsLabel(dart.darts);
  if (dart.bust) return `💥 ${name} hat sich überworfen – BUST! (${labels})`;
  if (dart.checkout) {
    const game = dart.startScore ? `das ${dart.startScore}er-Spiel` : 'das Spiel';
    return `🎯 CHECKOUT! ${name} gewinnt ${game} mit ${labels} (${dart.raw})`;
  }
  if (dart.raw === 180) return `🔥🎯 ONE HUNDRED AND EIGHTY!!! ${name} wirft ${labels}!`;
  return `🎯 ${name} wirft ${labels} = ${dart.raw} Punkte`;
}
