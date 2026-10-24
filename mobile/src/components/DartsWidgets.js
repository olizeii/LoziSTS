import { Pressable, StyleSheet, Text, View } from 'react-native';
import { dartLabel } from '../darts/rules';
import { COLORS, DARTS_COLOR, FONTS } from '../theme';

const timeFormatter = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' });

export function formatNumber(value) {
  return Number(value ?? 0).toLocaleString('de-DE');
}

export function SectionTitle({ children }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export function StatGrid({ items }) {
  return (
    <View style={styles.statGrid}>
      {items.map((item) => (
        <View key={item.label} style={styles.statBox}>
          <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
            {item.value}
          </Text>
          <Text style={styles.statLabel}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

export function DartChips({ darts }) {
  return (
    <View style={styles.chips}>
      {darts.map((dart, i) => (
        <View key={i} style={[styles.chip, dart.multiplier >= 2 && styles.chipStrong]}>
          <Text style={[styles.chipText, dart.multiplier >= 2 && styles.chipTextStrong]}>{dartLabel(dart)}</Text>
        </View>
      ))}
    </View>
  );
}

// Eine Aufnahme in Listen (Verlauf, letzte Aufnahmen im Spiel)
export function TurnRow({ turn, showPlayer = false }) {
  const tag = turn.gameId ? `${turn.startScore ?? ''}er` : 'Frei';
  return (
    <View style={styles.turnRow}>
      <View style={styles.turnMeta}>
        <Text style={styles.turnTime}>{timeFormatter.format(new Date(turn.createdAt))}</Text>
        <Text style={[styles.turnTag, turn.gameId && styles.turnTagGame]}>{tag}</Text>
      </View>
      <View style={styles.turnMain}>
        {showPlayer ? (
          <Text style={styles.turnPlayer} numberOfLines={1}>
            {turn.player}
          </Text>
        ) : null}
        <DartChips darts={turn.darts} />
      </View>
      <Text style={[styles.turnPoints, turn.bust && styles.turnBust, turn.checkout && styles.turnCheckout]}>
        {turn.bust ? 'BUST' : turn.checkout ? `✔ ${turn.raw}` : turn.raw}
      </Text>
    </View>
  );
}

// Kompakte Karte eines laufenden Spiels
export function GameListCard({ game, me, onPress }) {
  const mine = game.players.some((p) => p.name === me);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.gameCard, pressed && styles.pressed]}>
      <View style={styles.gameHead}>
        <Text style={styles.gameTitle}>
          {game.startScore} · {game.doubleOut ? 'Double Out' : 'Single Out'}
        </Text>
        {mine ? <Text style={styles.mineBadge}>DU SPIELST</Text> : null}
      </View>
      {game.players.map((p) => {
        const current = p.name === game.currentPlayer;
        return (
          <View key={p.name} style={styles.gamePlayer}>
            <Text style={[styles.gamePlayerName, current && styles.gameCurrent]} numberOfLines={1}>
              {current ? '▶ ' : ''}
              {p.name}
            </Text>
            <Text style={[styles.gameRemaining, current && styles.gameCurrent]}>{p.remaining}</Text>
          </View>
        );
      })}
      <Text style={styles.gameHint}>Antippen zum Mitzählen ›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
    marginTop: 8,
    marginBottom: 2,
  },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statBox: {
    flexGrow: 1,
    flexBasis: '22%',
    backgroundColor: COLORS.panel,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.panelBorder,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  statValue: { fontFamily: FONTS.display, fontSize: 18, color: DARTS_COLOR },
  statLabel: { color: COLORS.muted, fontSize: 10, fontWeight: '800', marginTop: 2, textAlign: 'center' },
  chips: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  chip: {
    minWidth: 38,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 7,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
  },
  chipStrong: { backgroundColor: DARTS_COLOR },
  chipText: { fontFamily: FONTS.displayBold, fontSize: 12, color: COLORS.text },
  chipTextStrong: { color: '#000' },
  turnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  turnMeta: { width: 44, alignItems: 'center', gap: 2 },
  turnTime: { color: COLORS.muted, fontSize: 11, fontWeight: '700' },
  turnTag: { color: COLORS.muted, fontSize: 10, fontWeight: '800' },
  turnTagGame: { color: '#facc15' },
  turnMain: { flex: 1, gap: 4 },
  turnPlayer: { color: COLORS.text, fontSize: 13, fontWeight: '800' },
  turnPoints: { fontFamily: FONTS.display, fontSize: 18, color: DARTS_COLOR, minWidth: 52, textAlign: 'right' },
  turnBust: { color: COLORS.muted, fontSize: 14 },
  turnCheckout: { color: '#facc15' },
  gameCard: {
    backgroundColor: COLORS.panel,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: DARTS_COLOR,
    padding: 12,
    gap: 4,
  },
  pressed: { opacity: 0.8 },
  gameHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  gameTitle: { fontFamily: FONTS.displayBold, color: COLORS.text, fontSize: 14 },
  mineBadge: {
    color: '#000',
    backgroundColor: '#facc15',
    fontSize: 10,
    fontWeight: '900',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  gamePlayer: { flexDirection: 'row', justifyContent: 'space-between' },
  gamePlayerName: { color: COLORS.muted, fontSize: 15, fontWeight: '700', flex: 1 },
  gameRemaining: { fontFamily: FONTS.displayBold, color: COLORS.text, fontSize: 16 },
  gameCurrent: { color: DARTS_COLOR },
  gameHint: { color: COLORS.accent2, fontSize: 12, fontWeight: '700', marginTop: 4, textAlign: 'right' },
});
