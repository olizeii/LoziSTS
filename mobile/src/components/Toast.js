import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { COLORS } from '../theme';

const TONES = {
  success: { border: COLORS.success, bg: '#062a1f' },
  error: { border: COLORS.danger, bg: '#2a0610' },
  gold: { border: '#facc15', bg: '#2a2106' },
  info: { border: COLORS.accent, bg: '#1a0a2a' },
};

const VISIBLE_MS = { success: 1800, info: 2200, error: 3200, gold: 4000 };

// Kurze Rückmeldung unten am Bildschirm; toast = { key, message, tone }
export function Toast({ toast, bottom }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!toast) return undefined;
    anim.setValue(0);
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 8 }).start();
    const timer = setTimeout(() => {
      Animated.timing(anim, { toValue: 0, duration: 250, useNativeDriver: true }).start();
    }, VISIBLE_MS[toast.tone] ?? 2000);
    return () => clearTimeout(timer);
  }, [toast, anim]);

  if (!toast) return null;
  const tone = TONES[toast.tone] ?? TONES.info;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.toast,
        {
          bottom,
          borderColor: tone.border,
          backgroundColor: tone.bg,
          shadowColor: tone.border,
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }],
        },
      ]}
    >
      <Text style={styles.text}>{toast.message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowOpacity: 0.6,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  text: { color: COLORS.text, fontSize: 15, fontWeight: '700', textAlign: 'center', lineHeight: 21 },
});
