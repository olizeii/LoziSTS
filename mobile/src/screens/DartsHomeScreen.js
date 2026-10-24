import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatNumber, GameListCard, SectionTitle, StatGrid } from '../components/DartsWidgets';
import { ScreenHeader } from '../components/ScreenHeader';
import { COLORS, DARTS_COLOR, FONTS } from '../theme';

export function DartsHomeScreen({ name, tracker, navigate, goBack }) {
  const { state, status } = tracker;
  const darts = state?.darts;
  const challenge = state?.challenges.find((c) => c.kind === 'darts');
  const me = darts?.players.find((p) => p.name === name);
  const percent = Math.min(challenge?.percent ?? 0, 100);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <ScreenHeader title="🎯 DARTS" subtitle="Team-Countdown & Spiele" status={status} onBack={goBack} />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.countdown}>
          <Text style={styles.countdownKicker}>
            {challenge?.completed ? 'GESCHAFFT! 🏆' : `NOCH BIS 0 · START ${formatNumber(darts?.goal ?? 10001)}`}
          </Text>
          <Text style={styles.countdownValue}>{formatNumber(darts?.remaining ?? 0)}</Text>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${percent}%` }]} />
          </View>
          <Text style={styles.countdownInfo}>
            {formatNumber(darts?.total)} Punkte · {formatNumber(darts?.darts)} Darts · Ø {formatNumber(darts?.average)} ·{' '}
            {darts?.count180 ?? 0}× 180
          </Text>
        </View>

        <View style={styles.actions}>
          <Pressable onPress={() => navigate('dartFree')} style={({ pressed }) => [styles.action, styles.actionPrimary, pressed && styles.pressed]}>
            <Text style={styles.actionEmoji}>🎯</Text>
            <Text style={styles.actionText}>FREI WERFEN</Text>
            <Text style={styles.actionSub}>zählt direkt für die 10.001</Text>
          </Pressable>
          <Pressable onPress={() => navigate('dartNewGame')} style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
            <Text style={styles.actionEmoji}>⚔️</Text>
            <Text style={styles.actionText}>NEUES SPIEL</Text>
            <Text style={styles.actionSub}>301 / 501 · solo, 1v1 oder mehr</Text>
          </Pressable>
        </View>

        <SectionTitle>MEINE DART-STATS</SectionTitle>
        <StatGrid
          items={[
            { label: 'PUNKTE', value: formatNumber(me?.points) },
            { label: 'Ø 3 DARTS', value: formatNumber(me?.average) },
            { label: 'DARTS', value: formatNumber(me?.darts) },
            { label: '180er', value: me?.count180 ?? 0 },
            { label: 'BESTE AUFN.', value: me?.bestTurn ?? 0 },
            { label: 'BESTES CHECKOUT', value: me?.bestCheckout ?? 0 },
            { label: 'SIEGE', value: `${me?.gamesWon ?? 0}/${me?.gamesPlayed ?? 0}` },
          ]}
        />
        <Pressable onPress={() => navigate('dartHistory')} style={({ pressed }) => [styles.historyButton, pressed && styles.pressed]}>
          <Text style={styles.historyText}>📜 Alle meine Würfe ansehen ›</Text>
        </Pressable>

        <SectionTitle>LAUFENDE SPIELE</SectionTitle>
        {darts?.activeGames.length ? (
          darts.activeGames.map((game) => (
            <GameListCard key={game.id} game={game} me={name} onPress={() => navigate('dartGame', { gameId: game.id })} />
          ))
        ) : (
          <Text style={styles.empty}>Gerade läuft kein Spiel – starte eins! ⚔️</Text>
        )}

        {darts?.recentGames.length ? (
          <>
            <SectionTitle>ZULETZT BEENDET</SectionTitle>
            {darts.recentGames.map((g) => (
              <Pressable key={g.id} onPress={() => navigate('dartGame', { gameId: g.id })} style={styles.recentGame}>
                <Text style={styles.recentText} numberOfLines={1}>
                  🏆 <Text style={styles.recentWinner}>{g.winner}</Text> gewinnt {g.startScore}
                </Text>
                <Text style={styles.recentPlayers} numberOfLines={1}>
                  {g.players.join(' · ')}
                </Text>
              </Pressable>
            ))}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingHorizontal: 16, paddingBottom: 40, gap: 10 },
  countdown: {
    backgroundColor: COLORS.panel,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: DARTS_COLOR,
    padding: 16,
    alignItems: 'center',
    shadowColor: DARTS_COLOR,
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  countdownKicker: { color: COLORS.muted, fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  countdownValue: {
    fontFamily: FONTS.display,
    fontSize: 54,
    color: DARTS_COLOR,
    textShadowColor: DARTS_COLOR,
    textShadowRadius: 16,
    marginVertical: 4,
  },
  track: { alignSelf: 'stretch', height: 10, borderRadius: 5, backgroundColor: 'rgba(255, 255, 255, 0.08)', overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: DARTS_COLOR, borderRadius: 5 },
  countdownInfo: { color: COLORS.muted, fontSize: 12, fontWeight: '700', marginTop: 8, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 10 },
  action: {
    flex: 1,
    backgroundColor: COLORS.panel,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: COLORS.panelBorder,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 4,
  },
  actionPrimary: { borderColor: DARTS_COLOR },
  pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
  actionEmoji: { fontSize: 30 },
  actionText: { fontFamily: FONTS.display, fontSize: 14, color: COLORS.text, letterSpacing: 1 },
  actionSub: { color: COLORS.muted, fontSize: 11, fontWeight: '600', textAlign: 'center' },
  historyButton: { paddingVertical: 10, alignItems: 'center' },
  historyText: { color: COLORS.accent2, fontSize: 14, fontWeight: '800' },
  empty: { color: COLORS.muted, fontSize: 14, textAlign: 'center', paddingVertical: 14 },
  recentGame: { backgroundColor: 'rgba(255, 255, 255, 0.04)', borderRadius: 12, padding: 10 },
  recentText: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  recentWinner: { color: '#facc15' },
  recentPlayers: { color: COLORS.muted, fontSize: 12, marginTop: 2 },
});
