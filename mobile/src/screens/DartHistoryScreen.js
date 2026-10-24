import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatNumber, SectionTitle, StatGrid, TurnRow } from '../components/DartsWidgets';
import { ScreenHeader } from '../components/ScreenHeader';
import { COLORS, DARTS_COLOR } from '../theme';

// Alle eigenen Würfe (frei + aus Spielen) mit Statistik
export function DartHistoryScreen({ name, tracker, goBack }) {
  const { state, status, darts } = tracker;
  const insets = useSafeAreaInsets();
  const [history, setHistory] = useState(null);
  const [error, setError] = useState(null);
  const connected = status === 'connected';
  const eventCount = state?.eventCount;

  const load = useCallback(async () => {
    const res = await darts.fetchHistory(name);
    if (res.ok) {
      setHistory({ stats: res.stats, turns: res.turns });
      setError(null);
    } else {
      setError(res.error);
    }
  }, [darts, name]);

  // Neu laden, sobald irgendwo etwas eingetragen wurde
  useEffect(() => {
    if (connected) load();
  }, [connected, load, eventCount]);

  const stats = history?.stats;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <ScreenHeader title="MEINE WÜRFE" subtitle={name} status={status} onBack={goBack} />
      {!history ? (
        <View style={styles.center}>
          {error ? <Text style={styles.error}>{error}</Text> : <ActivityIndicator size="large" color={DARTS_COLOR} />}
        </View>
      ) : (
        <FlatList
          data={history.turns}
          keyExtractor={(turn) => String(turn.id)}
          renderItem={({ item }) => <TurnRow turn={item} />}
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) + 20 }]}
          ListHeaderComponent={
            <View style={styles.header}>
              <StatGrid
                items={[
                  { label: 'PUNKTE (10.001)', value: formatNumber(stats?.points) },
                  { label: 'Ø 3 DARTS', value: formatNumber(stats?.average) },
                  { label: 'DARTS', value: formatNumber(stats?.darts) },
                  { label: 'AUFNAHMEN', value: formatNumber(stats?.turns) },
                  { label: '180er', value: stats?.count180 ?? 0 },
                  { label: 'BESTE AUFN.', value: stats?.bestTurn ?? 0 },
                  { label: 'BESTES CHECKOUT', value: stats?.bestCheckout ?? 0 },
                  { label: 'SIEGE', value: `${stats?.gamesWon ?? 0}/${stats?.gamesPlayed ?? 0}` },
                ]}
              />
              <SectionTitle>ALLE AUFNAHMEN (NEUESTE ZUERST)</SectionTitle>
            </View>
          }
          ListEmptyComponent={<Text style={styles.empty}>Du hast noch keinen Dart geworfen. 🎯</Text>}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  error: { color: COLORS.danger, fontSize: 14, fontWeight: '700' },
  content: { paddingHorizontal: 14 },
  header: { gap: 8, marginBottom: 8 },
  separator: { height: 6 },
  empty: { color: COLORS.muted, fontSize: 14, textAlign: 'center', paddingVertical: 20 },
});
