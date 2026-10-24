import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { challengeColors, COLORS, FONTS } from '../theme';

// Fetter Button für eine Challenge: tippen = fester Schritt (+1 / +5 / +1 km / +1)
export function ChallengeButton({ challenge, myEntry, disabled, onTick }) {
  const { color, color2 } = challengeColors(challenge.id);
  const scale = useRef(new Animated.Value(1)).current;
  const flash = useRef(new Animated.Value(0)).current;
  const shake = useRef(new Animated.Value(0)).current;
  const [pops, setPops] = useState([]);
  const [pending, setPending] = useState(0);
  const popSeq = useRef(0);

  const percent = Math.min(challenge.percent, 100);
  const incrementLabel = challenge.unit === 'km' ? `+${challenge.increment} km` : `+${challenge.increment}`;

  function pressIn() {
    Animated.spring(scale, { toValue: 0.95, useNativeDriver: true, speed: 50, bounciness: 0 }).start();
  }

  function pressOut() {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 12 }).start();
  }

  function runFlash() {
    flash.setValue(1);
    Animated.timing(flash, { toValue: 0, duration: 500, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }

  function runShake() {
    shake.setValue(0);
    Animated.sequence(
      [10, -10, 7, -7, 0].map((toValue) =>
        Animated.timing(shake, { toValue, duration: 50, useNativeDriver: true }),
      ),
    ).start();
  }

  async function press() {
    popSeq.current += 1;
    const popId = popSeq.current;
    setPops((prev) => [...prev, popId]);
    runFlash();
    setPending((n) => n + 1);
    const ok = await onTick(challenge);
    setPending((n) => n - 1);
    if (!ok) runShake();
  }

  return (
    <Animated.View style={[styles.wrapper, { transform: [{ scale }, { translateX: shake }] }]}>
      <Pressable
        onPress={press}
        onPressIn={pressIn}
        onPressOut={pressOut}
        disabled={disabled}
        style={[styles.button, { borderColor: color, shadowColor: color }, disabled && styles.disabled]}
        accessibilityRole="button"
        accessibilityLabel={`${challenge.label} ${incrementLabel}`}
      >
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.flash, { backgroundColor: color, opacity: flash.interpolate({ inputRange: [0, 1], outputRange: [0, 0.35] }) }]} />

        <Text style={styles.emoji}>{challenge.emoji}</Text>

        <View style={styles.middle}>
          <Text style={styles.label} numberOfLines={1} adjustsFontSizeToFit>
            {challenge.label.toUpperCase()}
          </Text>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${percent}%`, backgroundColor: color, shadowColor: color2 }]} />
          </View>
          <Text style={styles.progress} numberOfLines={1}>
            <Text style={[styles.progressStrong, { color }]}>{challenge.total.toLocaleString('de-DE')}</Text>
            {' '}/ {challenge.goal.toLocaleString('de-DE')} {challenge.unit}
            {challenge.completed ? '  ✔' : ''}
          </Text>
          <Text style={styles.mine} numberOfLines={1}>
            {myEntry ? `Du: ${myEntry.total.toLocaleString('de-DE')} · Platz ${myEntry.rank}` : 'Du: noch nix – leg los!'}
          </Text>
        </View>

        <View style={[styles.chip, { backgroundColor: color }]}>
          {pending > 0 ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.chipText} numberOfLines={1} adjustsFontSizeToFit>
              {incrementLabel}
            </Text>
          )}
        </View>

        {pops.map((id) => (
          <FloatingPop
            key={id}
            text={incrementLabel}
            color={color}
            onDone={() => setPops((prev) => prev.filter((p) => p !== id))}
          />
        ))}
      </Pressable>
    </Animated.View>
  );
}

function FloatingPop({ text, color, onDone }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(onDone);
    // Nur einmal beim Erscheinen abspielen
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.Text
      pointerEvents="none"
      style={[
        styles.pop,
        {
          color,
          textShadowColor: color,
          opacity: progress.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0] }),
          transform: [
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [10, -50] }) },
            { scale: progress.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.6, 1.25, 1] }) },
          ],
        },
      ]}
    >
      {text}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 22,
    borderWidth: 2,
    backgroundColor: COLORS.panel,
    shadowOpacity: 0.55,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
    overflow: 'visible',
  },
  disabled: { opacity: 0.4 },
  flash: { borderRadius: 20 },
  emoji: { fontSize: 38 },
  middle: { flex: 1, gap: 5 },
  label: { fontFamily: FONTS.display, fontSize: 15, color: COLORS.text, letterSpacing: 0.5 },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 4, shadowOpacity: 0.9, shadowRadius: 6 },
  progress: { color: COLORS.muted, fontSize: 13, fontWeight: '600' },
  progressStrong: { fontWeight: '800', fontSize: 14 },
  mine: { color: COLORS.text, fontSize: 13, fontWeight: '700', opacity: 0.85 },
  chip: {
    minWidth: 76,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  chipText: { fontFamily: FONTS.display, fontSize: 22, color: '#000' },
  pop: {
    position: 'absolute',
    right: 24,
    top: 4,
    fontFamily: FONTS.display,
    fontSize: 26,
    textShadowRadius: 12,
  },
});
