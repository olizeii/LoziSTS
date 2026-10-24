import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SectionTitle } from '../components/DartsWidgets';
import { ScreenHeader } from '../components/ScreenHeader';
import { COLORS, FONTS } from '../theme';

// Übersicht aller Games – antippen öffnet die Eingabe
export function GamesHomeScreen({ tracker, navigate, goBack }) {
  const { state, status } = tracker;
  const games = state?.games;
  const list = games?.list ?? [];
  const sections = [
    { title: 'GAMES', items: list.filter((g) => g.page === 2) },
    { title: 'SAMMELN', items: list.filter((g) => g.page === 3) },
  ];

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <ScreenHeader
        title="🎮 GAMES"
        subtitle={games ? `${games.completed} von ${games.total} geschafft` : 'Lade …'}
        status={status}
        onBack={goBack}
      />
      <ScrollView contentContainerStyle={styles.content}>
        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <SectionTitle>{section.title}</SectionTitle>
            {section.items.map((game) => (
              <GameRow key={game.id} game={game} onPress={() => navigate('game', { gameId: game.id })} />
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function GameRow({ game, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, { borderColor: game.completed ? '#facc15' : `${game.color}66` }, pressed && styles.pressed]}
    >
      <Text style={styles.emoji}>{game.emoji}</Text>
      <View style={styles.middle}>
        <View style={styles.titleRow}>
          <Text style={styles.label} numberOfLines={1}>
            {game.label.toUpperCase()}
          </Text>
          {game.completed ? <Text style={styles.done}>✔</Text> : null}
        </View>
        <Text style={styles.task} numberOfLines={1}>
          {game.task}
        </Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${Math.min(game.percent, 100)}%`, backgroundColor: game.completed ? '#facc15' : game.color }]} />
        </View>
        <Text style={[styles.display, { color: game.color }]} numberOfLines={1}>
          {game.display}
        </Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingHorizontal: 16, paddingBottom: 40 },
  section: { gap: 8, marginBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.panel,
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  emoji: { fontSize: 30 },
  middle: { flex: 1, gap: 3 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { fontFamily: FONTS.display, color: COLORS.text, fontSize: 14, flexShrink: 1 },
  done: { color: '#facc15', fontSize: 14, fontWeight: '900' },
  task: { color: COLORS.muted, fontSize: 12, fontWeight: '600' },
  track: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255, 255, 255, 0.08)', overflow: 'hidden', marginTop: 2 },
  fill: { height: '100%', borderRadius: 3 },
  display: { fontFamily: FONTS.displayBold, fontSize: 13 },
  chevron: { color: COLORS.muted, fontSize: 26, fontWeight: '300' },
});
