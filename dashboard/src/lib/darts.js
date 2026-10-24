export function dartLabel(dart) {
  if (!dart || dart.segment === 0) return '0';
  if (dart.segment === 25) return dart.multiplier === 2 ? 'BULL' : '25';
  if (dart.multiplier === 3) return `T${dart.segment}`;
  if (dart.multiplier === 2) return `D${dart.segment}`;
  return String(dart.segment);
}

export function dartsLabel(darts) {
  return (darts ?? []).map(dartLabel).join(' ');
}
