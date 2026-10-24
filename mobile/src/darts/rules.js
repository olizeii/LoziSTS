// Dart-Regeln auf dem Handy: Beschriftung, Vorschau einer Aufnahme (Bust/Checkout) und Checkout-Tipps.
// Gewertet wird verbindlich auf dem Server – das hier ist nur die Live-Vorschau.

export const DARTS_PER_TURN = 3;
export const START_SCORES = [301, 501, 701, 1001];
export const MAX_PLAYERS = 8;

export function makeDart(segment, multiplier) {
  if (segment === 0) return { segment: 0, multiplier: 0, points: 0 };
  return { segment, multiplier, points: segment * multiplier };
}

export function dartLabel(dart) {
  if (!dart || dart.segment === 0) return '0';
  if (dart.segment === 25) return dart.multiplier === 2 ? 'BULL' : '25';
  if (dart.multiplier === 3) return `T${dart.segment}`;
  if (dart.multiplier === 2) return `D${dart.segment}`;
  return String(dart.segment);
}

export function sumDarts(darts) {
  return darts.reduce((sum, d) => sum + d.points, 0);
}

// Vorschau: was passiert mit diesen Darts bei gegebenem Rest?
export function previewTurn(darts, remaining, doubleOut) {
  const raw = sumDarts(darts);
  if (remaining == null) return { raw, bust: false, checkout: false, remainingAfter: null, locked: false };
  let rest = remaining;
  for (const dart of darts) {
    rest -= dart.points;
    if (rest < 0 || (doubleOut && rest === 1) || (rest === 0 && doubleOut && dart.multiplier !== 2)) {
      return { raw, bust: true, checkout: false, remainingAfter: remaining, locked: true };
    }
    if (rest === 0) return { raw, bust: false, checkout: true, remainingAfter: 0, locked: true };
  }
  return { raw, bust: false, checkout: false, remainingAfter: rest, locked: false };
}

// --- Checkout-Tipps ---------------------------------------------------------------

const range = (from, to) => Array.from({ length: from - to + 1 }, (_, i) => from - i);
const TRIPLES = range(20, 1).map((s) => makeDart(s, 3));
const DOUBLES = range(20, 1).map((s) => makeDart(s, 2));
const SINGLES = range(20, 1).map((s) => makeDart(s, 1));
const BULL = makeDart(25, 2);
const OUTER_BULL = makeDart(25, 1);

// Bevorzugte Aufbau-Darts (erst große Triples, dann Singles)
const SETUP = [...TRIPLES.slice(0, 11), OUTER_BULL, ...SINGLES, ...TRIPLES.slice(11), BULL];
// Beliebte Doppel zuerst
const PREFERRED_DOUBLES = [20, 16, 18, 12, 10, 8, 14, 6, 4, 2, 19, 17, 15, 13, 11, 9, 7, 5, 3, 1];
const FINISH_DOUBLE_OUT = [...PREFERRED_DOUBLES.map((s) => makeDart(s, 2)), BULL];
const FINISH_SINGLE_OUT = [...TRIPLES, BULL, OUTER_BULL, ...DOUBLES, ...SINGLES];

const cache = new Map();

// Genau n Aufbau-Darts, die zusammen rest ergeben
function setupPath(rest, n) {
  if (n === 1) {
    const dart = SETUP.find((d) => d.points === rest);
    return dart ? [dart] : null;
  }
  for (const setup of SETUP) {
    if (setup.points >= rest) continue;
    const tail = setupPath(rest - setup.points, n - 1);
    if (tail) return [setup, ...tail];
  }
  return null;
}

// Zuerst das bevorzugte Finish wählen, dann den Weg dorthin
function search(rest, dartsLeft, finishes) {
  for (const finish of finishes) {
    if (finish.points > rest) continue;
    if (finish.points === rest) {
      if (dartsLeft === 1) return [finish];
      continue;
    }
    if (dartsLeft === 1) continue;
    const path = setupPath(rest - finish.points, dartsLeft - 1);
    if (path) return [...path, finish];
  }
  return null;
}

// Kürzester Weg zum Checkout mit höchstens dartsLeft Darts (oder null)
export function checkoutSuggestion(remaining, dartsLeft = DARTS_PER_TURN, doubleOut = true) {
  if (!remaining || dartsLeft < 1 || remaining > (doubleOut ? 170 : 180)) return null;
  const key = `${remaining}|${dartsLeft}|${doubleOut}`;
  if (cache.has(key)) return cache.get(key);
  const finishes = doubleOut ? FINISH_DOUBLE_OUT : FINISH_SINGLE_OUT;
  let result = null;
  for (let n = 1; n <= dartsLeft && !result; n += 1) result = search(remaining, n, finishes);
  cache.set(key, result);
  return result;
}
