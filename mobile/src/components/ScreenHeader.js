import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, FONTS } from '../theme';
import { ConnectionBadge } from './ConnectionBadge';

export function ScreenHeader({ title, subtitle, status, onBack }) {
  return (
    <View style={styles.header}>
      <Pressable onPress={onBack} hitSlop={12} style={({ pressed }) => [styles.back, pressed && styles.backPressed]}>
        <Text style={styles.backText}>‹</Text>
      </Pressable>
      <View style={styles.titles}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {status ? <ConnectionBadge status={status} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 10,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.panelBorder,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  backPressed: { backgroundColor: 'rgba(255, 255, 255, 0.12)' },
  backText: { color: COLORS.text, fontSize: 28, lineHeight: 30, fontWeight: '600', marginTop: -2 },
  titles: { flex: 1 },
  title: { fontFamily: FONTS.display, color: COLORS.text, fontSize: 18, letterSpacing: 1 },
  subtitle: { color: COLORS.muted, fontSize: 12, fontWeight: '700', marginTop: 2 },
});
