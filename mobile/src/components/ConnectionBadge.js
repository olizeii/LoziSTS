import { StyleSheet, Text, View } from 'react-native';
import { COLORS, FONTS } from '../theme';

const LABELS = {
  connected: 'LIVE',
  connecting: 'VERBINDE…',
  offline: 'OFFLINE',
};

const TONES = {
  connected: COLORS.success,
  connecting: COLORS.warning,
  offline: COLORS.danger,
};

export function ConnectionBadge({ status }) {
  const color = TONES[status] ?? COLORS.muted;
  return (
    <View style={[styles.badge, { borderColor: color, backgroundColor: `${color}22` }]}>
      <View style={[styles.dot, { backgroundColor: color, shadowColor: color }]} />
      <Text style={[styles.label, { color }]}>{LABELS[status] ?? status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    shadowOpacity: 0.9,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
  label: {
    fontFamily: FONTS.displayBold,
    fontSize: 10,
    letterSpacing: 1.5,
  },
});
