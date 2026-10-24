import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { DartPad } from '../components/DartPad';
import { formatNumber, SectionTitle, TurnRow } from '../components/DartsWidgets';
import { ScreenHeader } from '../components/ScreenHeader';
import { Toast, useToast } from '../components/Toast';
import { confirmAction } from '../confirm';
import { COLORS } from '../theme';

const RECENT_FREE_TURNS = 8;

// Freies Werfen: jede Aufnahme zählt direkt in den 10.001-Team-Countdown
export function DartFreeScreen({ name, tracker, goBack }) {
  const { state, status, darts } = tracker;
  const insets = useSafeAreaInsets();
  const [toast, showToast] = useToast();
  const [busy, setBusy] = useState(false);
  const [recent, setRecent] = useState([]);
  const connected = status === 'connected';

  const loadRecent = useCallback(async () => {
    const res = await darts.fetchHistory(name);
    if (res.ok) setRecent(res.turns.filter((t) => !t.gameId).slice(0, RECENT_FREE_TURNS));
  }, [darts, name]);

  useEffect(() => {
    if (connected) loadRecent();
  }, [connected, loadRecent]);

  async function submit(thrown) {
    setBusy(true);
    const res = await darts.submitTurn(name, { darts: thrown });
    setBusy(false);
    if (!res.ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      showToast(`❌ ${res.error}`, 'error');
      return false;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    showToast(res.turn.raw === 180 ? '🔥 ONE HUNDRED AND EIGHTY! Schau auf den TV!' : `✅ ${res.turn.raw} Punkte eingetragen`, res.turn.raw === 180 ? 'gold' : 'success');
    loadRecent();
    return true;
  }

  async function confirmUndo() {
    const confirmed = await confirmAction({
      title: 'Letzte Aufnahme zurücknehmen?',
      message: 'Deine letzte freie Aufnahme wird wieder abgezogen.',
      confirmText: 'Zurücknehmen',
      destructive: true,
    });
    if (!confirmed) return;
    const res = await darts.undoTurn(name, null);
    showToast(res.ok ? res.event.message : `❌ ${res.error}`, res.ok ? 'info' : 'error');
    if (res.ok) loadRecent();
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <ScreenHeader
        title="FREI WERFEN"
        subtitle={`Noch ${formatNumber(state?.darts?.remaining)} bis 0 · Werfer: ${name}`}
        status={status}
        onBack={goBack}
      />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) + 20 }]}>
        <DartPad busy={busy} disabled={!connected} onSubmit={submit} />

        <View style={styles.listHead}>
          <SectionTitle>MEINE LETZTEN FREIEN AUFNAHMEN</SectionTitle>
          {recent.length ? (
            <Pressable onPress={confirmUndo} hitSlop={8}>
              <Text style={styles.undo}>↩ Rückgängig</Text>
            </Pressable>
          ) : null}
        </View>
        {recent.length ? (
          recent.map((turn) => <TurnRow key={turn.id} turn={turn} />)
        ) : (
          <Text style={styles.empty}>Noch nichts geworfen – ran ans Board! 🎯</Text>
        )}
      </ScrollView>
      <Toast key={toast?.key} toast={toast} bottom={Math.max(insets.bottom, 16) + 8} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingHorizontal: 14, gap: 8 },
  listHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 8 },
  undo: { color: COLORS.accent2, fontSize: 13, fontWeight: '800' },
  empty: { color: COLORS.muted, fontSize: 14, textAlign: 'center', paddingVertical: 12 },
});
