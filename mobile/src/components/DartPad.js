import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { checkoutSuggestion, dartLabel, DARTS_PER_TURN, makeDart, previewTurn } from '../darts/rules';
import { COLORS, DARTS_COLOR, FONTS } from '../theme';

const ROWS = [
  [1, 2, 3, 4, 5],
  [6, 7, 8, 9, 10],
  [11, 12, 13, 14, 15],
  [16, 17, 18, 19, 20],
];

const MODIFIERS = [
  { value: 2, label: 'DOUBLE', color: '#34d399' },
  { value: 3, label: 'TRIPLE', color: DARTS_COLOR },
];

function selection() {
  Haptics.selectionAsync().catch(() => {});
}

// Eingabe einer Aufnahme (bis zu 3 Darts). remaining = Rest im Spiel (null bei freiem Werfen).
// resetKey: ändert sich z. B. wenn ein anderer Spieler am Wurf ist → Eingabe wird geleert.
export function DartPad({ remaining = null, doubleOut = true, disabled = false, busy = false, resetKey, onSubmit }) {
  const [darts, setDarts] = useState([]);
  const [multiplier, setMultiplier] = useState(1);

  useEffect(() => {
    setDarts([]);
    setMultiplier(1);
  }, [resetKey]);

  const preview = previewTurn(darts, remaining, doubleOut);
  const locked = darts.length >= DARTS_PER_TURN || preview.locked;
  const inputDisabled = disabled || busy || locked;
  const suggestion =
    remaining != null && !preview.locked
      ? checkoutSuggestion(preview.remainingAfter, DARTS_PER_TURN - darts.length, doubleOut)
      : null;

  function add(dart) {
    if (inputDisabled) return;
    selection();
    setDarts((prev) => [...prev, dart]);
    setMultiplier(1);
  }

  function pressSegment(segment) {
    add(makeDart(segment, segment === 25 ? Math.min(multiplier, 2) : multiplier));
  }

  function toggleModifier(value) {
    if (inputDisabled) return;
    selection();
    setMultiplier((m) => (m === value ? 1 : value));
  }

  function removeLast() {
    if (busy || darts.length === 0) return;
    selection();
    setDarts((prev) => prev.slice(0, -1));
  }

  async function submit() {
    if (busy || disabled || darts.length === 0) return;
    const ok = await onSubmit(darts);
    if (ok) {
      setDarts([]);
      setMultiplier(1);
    }
  }

  let statusText = null;
  let statusColor = COLORS.muted;
  if (preview.bust) {
    statusText = '💥 BUST – Aufnahme zählt 0';
    statusColor = COLORS.danger;
  } else if (preview.checkout) {
    statusText = '🎯 CHECKOUT!';
    statusColor = '#facc15';
  } else if (remaining != null) {
    statusText = `Rest danach: ${preview.remainingAfter}`;
  }

  const activeModifier = MODIFIERS.find((m) => m.value === multiplier);

  return (
    <View style={[styles.pad, disabled && styles.disabled]}>
      <View style={styles.slotsRow}>
        {Array.from({ length: DARTS_PER_TURN }, (_, i) => {
          const dart = darts[i];
          return (
            <View key={i} style={[styles.slot, dart && styles.slotFilled, dart?.multiplier >= 2 && styles.slotStrong]}>
              <Text style={[styles.slotText, !dart && styles.slotEmpty]}>{dart ? dartLabel(dart) : `${i + 1}.`}</Text>
            </View>
          );
        })}
        <View style={styles.sumBox}>
          <Text style={styles.sumLabel}>SUMME</Text>
          <Text style={styles.sumValue}>{preview.raw}</Text>
        </View>
      </View>

      <View style={styles.infoRow}>
        {statusText ? <Text style={[styles.status, { color: statusColor }]}>{statusText}</Text> : <View />}
        {suggestion ? (
          <Text style={styles.suggestion}>Weg: {suggestion.map(dartLabel).join(' ')}</Text>
        ) : null}
      </View>

      <View style={styles.modRow}>
        {MODIFIERS.map((m) => {
          const active = multiplier === m.value;
          return (
            <Pressable
              key={m.value}
              onPress={() => toggleModifier(m.value)}
              style={[styles.modKey, { borderColor: m.color }, active && { backgroundColor: m.color }]}
            >
              <Text style={[styles.modText, { color: active ? '#000' : m.color }]}>{m.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {ROWS.map((row) => (
        <View key={row[0]} style={styles.keyRow}>
          {row.map((segment) => (
            <Pressable
              key={segment}
              onPress={() => pressSegment(segment)}
              disabled={inputDisabled}
              style={({ pressed }) => [
                styles.key,
                activeModifier && { borderColor: activeModifier.color },
                pressed && styles.keyPressed,
                inputDisabled && styles.keyDisabled,
              ]}
            >
              <Text style={[styles.keyText, activeModifier && { color: activeModifier.color }]}>
                {activeModifier ? `${activeModifier.label[0]}${segment}` : segment}
              </Text>
            </Pressable>
          ))}
        </View>
      ))}

      <View style={styles.keyRow}>
        <Pressable
          onPress={() => pressSegment(25)}
          disabled={inputDisabled || multiplier === 3}
          style={({ pressed }) => [styles.key, styles.keyWide, pressed && styles.keyPressed, (inputDisabled || multiplier === 3) && styles.keyDisabled]}
        >
          <Text style={styles.keyText}>{multiplier === 2 ? 'BULL' : '25'}</Text>
        </Pressable>
        <Pressable
          onPress={() => add(makeDart(25, 2))}
          disabled={inputDisabled}
          style={({ pressed }) => [styles.key, styles.keyWide, styles.keyBull, pressed && styles.keyPressed, inputDisabled && styles.keyDisabled]}
        >
          <Text style={[styles.keyText, { color: '#000' }]}>BULL</Text>
        </Pressable>
        <Pressable
          onPress={() => add(makeDart(0, 0))}
          disabled={inputDisabled}
          style={({ pressed }) => [styles.key, styles.keyWide, pressed && styles.keyPressed, inputDisabled && styles.keyDisabled]}
        >
          <Text style={[styles.keyText, styles.keyMuted]}>MISS</Text>
        </Pressable>
        <Pressable
          onPress={removeLast}
          disabled={busy || darts.length === 0}
          style={({ pressed }) => [styles.key, styles.keyWide, pressed && styles.keyPressed, (busy || darts.length === 0) && styles.keyDisabled]}
        >
          <Text style={[styles.keyText, styles.keyMuted]}>⌫</Text>
        </Pressable>
      </View>

      <Pressable
        onPress={submit}
        disabled={busy || disabled || darts.length === 0}
        style={({ pressed }) => [
          styles.submit,
          (busy || disabled || darts.length === 0) && styles.submitDisabled,
          pressed && styles.submitPressed,
        ]}
      >
        {busy ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text style={styles.submitText}>
            {darts.length === 0 ? 'DARTS ANTIPPEN' : `EINTRAGEN · ${preview.bust ? 'BUST' : preview.raw}`}
          </Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  pad: {
    backgroundColor: COLORS.panel,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.panelBorder,
    padding: 12,
    gap: 8,
  },
  disabled: { opacity: 0.45 },
  slotsRow: { flexDirection: 'row', gap: 8 },
  slot: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotFilled: { borderStyle: 'solid', borderColor: DARTS_COLOR, backgroundColor: 'rgba(251, 113, 133, 0.12)' },
  slotStrong: { backgroundColor: DARTS_COLOR },
  slotText: { fontFamily: FONTS.display, fontSize: 20, color: COLORS.text },
  slotEmpty: { color: 'rgba(255, 255, 255, 0.25)', fontSize: 14 },
  sumBox: { width: 72, alignItems: 'center', justifyContent: 'center' },
  sumLabel: { color: COLORS.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  sumValue: { fontFamily: FONTS.display, fontSize: 26, color: DARTS_COLOR },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 18 },
  status: { fontSize: 13, fontWeight: '800' },
  suggestion: { color: '#facc15', fontSize: 13, fontWeight: '800' },
  modRow: { flexDirection: 'row', gap: 8 },
  modKey: { flex: 1, height: 42, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  modText: { fontFamily: FONTS.display, fontSize: 14, letterSpacing: 1 },
  keyRow: { flexDirection: 'row', gap: 6 },
  key: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyWide: { height: 46 },
  keyBull: { backgroundColor: '#ef4444', borderColor: '#ef4444' },
  keyPressed: { backgroundColor: 'rgba(255, 255, 255, 0.18)' },
  keyDisabled: { opacity: 0.35 },
  keyText: { fontFamily: FONTS.displayBold, fontSize: 17, color: COLORS.text },
  keyMuted: { color: COLORS.muted, fontSize: 15 },
  submit: {
    marginTop: 4,
    height: 56,
    borderRadius: 16,
    backgroundColor: DARTS_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: DARTS_COLOR,
    shadowOpacity: 0.6,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  submitDisabled: { opacity: 0.4 },
  submitPressed: { transform: [{ scale: 0.98 }] },
  submitText: { fontFamily: FONTS.display, fontSize: 16, color: '#000', letterSpacing: 1 },
});
