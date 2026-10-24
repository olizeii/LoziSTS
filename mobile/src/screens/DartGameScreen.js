import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { DartPad } from '../components/DartPad';
import { formatNumber, SectionTitle, TurnRow } from '../components/DartsWidgets';
import { ScreenHeader } from '../components/ScreenHeader';
import { Toast, useToast } from '../components/Toast';
import { COLORS, DARTS_COLOR, FONTS } from '../theme';

function haptic(type) {
  Haptics.notificationAsync(type).catch(() => {});
}

// Ein laufendes (oder beendetes) X01-Spiel: Spielstand, Eingabe für den Spieler am Wurf, Undo, Revanche
export function DartGameScreen({ name, tracker, gameId, goBack, replace }) {
  const { status, darts, games } = tracker;
  const game = games[gameId];
  const insets = useSafeAreaInsets();
  const [toast, showToast] = useToast();
  const [busy, setBusy] = useState(false);
  const connected = status === 'connected';

  useEffect(() => {
    if (connected) darts.fetchGame(gameId);
  }, [connected, darts, gameId]);

  if (!game) {
    return (
      <SafeAreaView style={styles.screen}>
        <ScreenHeader title="SPIEL" status={status} onBack={goBack} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={DARTS_COLOR} />
        </View>
      </SafeAreaView>
    );
  }

  const active = game.status === 'active';
  const current = game.players.find((p) => p.name === game.currentPlayer);

  async function submit(thrown) {
    setBusy(true);
    const res = await darts.submitTurn(name, { gameId, player: game.currentPlayer, darts: thrown });
    setBusy(false);
    if (!res.ok) {
      haptic(Haptics.NotificationFeedbackType.Error);
      showToast(`❌ ${res.error}`, 'error');
      darts.fetchGame(gameId);
      return false;
    }
    const { turn } = res;
    if (turn.checkout) {
      haptic(Haptics.NotificationFeedbackType.Success);
      showToast(`🏆 CHECKOUT! ${turn.player} gewinnt mit ${turn.label}!`, 'gold');
    } else if (turn.bust) {
      haptic(Haptics.NotificationFeedbackType.Warning);
      showToast(`💥 BUST! ${turn.player} bleibt auf ${turn.remainingBefore}`, 'error');
    } else {
      haptic(Haptics.NotificationFeedbackType.Success);
      showToast(
        turn.raw === 180 ? `🔥 ONE HUNDRED AND EIGHTY, ${turn.player}!` : `✅ ${turn.player}: ${turn.raw} · Rest ${turn.remainingAfter}`,
        turn.raw === 180 ? 'gold' : 'success',
      );
    }
    return true;
  }

  function confirmUndo() {
    Alert.alert('Letzte Aufnahme zurücknehmen?', 'Die letzte Aufnahme in diesem Spiel wird gelöscht.', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Zurücknehmen',
        style: 'destructive',
        onPress: async () => {
          const res = await darts.undoTurn(name, gameId);
          showToast(res.ok ? res.event.message : `❌ ${res.error}`, res.ok ? 'info' : 'error');
        },
      },
    ]);
  }

  function confirmAbort() {
    Alert.alert('Spiel abbrechen?', 'Geworfene Punkte bleiben in der 10.001 erhalten.', [
      { text: 'Weiterspielen', style: 'cancel' },
      {
        text: 'Abbrechen',
        style: 'destructive',
        onPress: async () => {
          const res = await darts.abortGame(name, gameId);
          if (!res.ok) showToast(`❌ ${res.error}`, 'error');
        },
      },
    ]);
  }

  async function rematch() {
    const names = game.players.map((p) => p.name);
    const rotated = names.length > 1 ? [...names.slice(1), names[0]] : names;
    setBusy(true);
    const res = await darts.createGame(name, { players: rotated, startScore: game.startScore, doubleOut: game.doubleOut });
    setBusy(false);
    if (!res.ok) {
      showToast(`❌ ${res.error}`, 'error');
      return;
    }
    replace('dartGame', { gameId: res.game.id });
  }

  const subtitle = active
    ? `${game.doubleOut ? 'Double Out' : 'Single Out'} · Runde ${game.round}`
    : game.status === 'finished'
      ? `Beendet · Sieger: ${game.winner}`
      : 'Abgebrochen';

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <ScreenHeader title={`${game.startScore}er-SPIEL`} subtitle={subtitle} status={status} onBack={goBack} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) + 20 }]}>
        {game.status === 'finished' ? (
          <View style={styles.winnerCard}>
            <Text style={styles.winnerKicker}>🏆 SIEGER 🏆</Text>
            <Text style={styles.winnerName}>{game.winner}</Text>
          </View>
        ) : null}
        {game.status === 'aborted' ? <Text style={styles.aborted}>Dieses Spiel wurde abgebrochen.</Text> : null}

        <View style={styles.scoreboard}>
          {game.players.map((p) => {
            const isCurrent = active && p.name === game.currentPlayer;
            const isWinner = p.name === game.winner;
            return (
              <View key={p.name} style={[styles.playerRow, isCurrent && styles.playerCurrent, isWinner && styles.playerWinner]}>
                <View style={styles.flex}>
                  <Text style={[styles.playerName, isCurrent && styles.textCurrent]} numberOfLines={1}>
                    {isWinner ? '🏆 ' : isCurrent ? '▶ ' : ''}
                    {p.name}
                    {p.name === name ? ' (du)' : ''}
                  </Text>
                  <Text style={styles.playerStats}>
                    Ø {formatNumber(p.average)} · {p.darts} Darts
                    {p.lastTurn ? ` · zuletzt ${p.lastTurn.bust ? 'BUST' : p.lastTurn.raw}` : ''}
                  </Text>
                </View>
                <Text style={[styles.remaining, isCurrent && styles.textCurrent]}>{p.remaining}</Text>
              </View>
            );
          })}
        </View>

        {active && current ? (
          <>
            <Text style={styles.turnTitle}>
              AM WURF: <Text style={styles.textCurrent}>{current.name}</Text> · noch {current.remaining}
            </Text>
            <DartPad
              remaining={current.remaining}
              doubleOut={game.doubleOut}
              busy={busy}
              disabled={!connected}
              resetKey={`${game.turnCount}-${game.currentPlayer}`}
              onSubmit={submit}
            />
          </>
        ) : null}

        {game.status !== 'active' ? (
          <View style={styles.row}>
            {game.status === 'finished' ? (
              <Pressable onPress={rematch} disabled={busy} style={({ pressed }) => [styles.bigButton, pressed && styles.pressed]}>
                <Text style={styles.bigButtonText}>🔁 REVANCHE</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={goBack} style={({ pressed }) => [styles.bigButton, styles.secondary, pressed && styles.pressed]}>
              <Text style={[styles.bigButtonText, styles.secondaryText]}>ZUR ÜBERSICHT</Text>
            </Pressable>
          </View>
        ) : null}

        {game.turnCount > 0 ? (
          <>
            <View style={styles.listHead}>
              <SectionTitle>LETZTE AUFNAHMEN</SectionTitle>
              {game.status !== 'aborted' ? (
                <Pressable onPress={confirmUndo} hitSlop={8}>
                  <Text style={styles.link}>↩ Rückgängig</Text>
                </Pressable>
              ) : null}
            </View>
            {game.recentTurns.map((turn) => (
              <TurnRow key={turn.id} turn={turn} showPlayer />
            ))}
          </>
        ) : null}

        {active ? (
          <Pressable onPress={confirmAbort} style={styles.abort}>
            <Text style={styles.abortText}>Spiel abbrechen</Text>
          </Pressable>
        ) : null}
      </ScrollView>
      <Toast key={toast?.key} toast={toast} bottom={Math.max(insets.bottom, 16) + 8} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 14, gap: 10 },
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: 10 },
  winnerCard: {
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#facc15',
    backgroundColor: '#2a2106',
  },
  winnerKicker: { color: '#facc15', fontSize: 12, fontWeight: '900', letterSpacing: 3 },
  winnerName: { fontFamily: FONTS.display, color: '#facc15', fontSize: 32, marginTop: 4, textShadowColor: '#facc15', textShadowRadius: 14 },
  aborted: { color: COLORS.muted, textAlign: 'center', fontSize: 14, fontWeight: '700' },
  scoreboard: { gap: 6 },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.panel,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.panelBorder,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  playerCurrent: { borderColor: DARTS_COLOR, borderWidth: 2, backgroundColor: 'rgba(251, 113, 133, 0.1)' },
  playerWinner: { borderColor: '#facc15', borderWidth: 2 },
  playerName: { color: COLORS.text, fontSize: 17, fontWeight: '800' },
  playerStats: { color: COLORS.muted, fontSize: 12, fontWeight: '600', marginTop: 2 },
  remaining: { fontFamily: FONTS.display, fontSize: 30, color: COLORS.text },
  textCurrent: { color: DARTS_COLOR },
  turnTitle: { color: COLORS.text, fontSize: 15, fontWeight: '800', marginTop: 4 },
  bigButton: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    backgroundColor: DARTS_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigButtonText: { fontFamily: FONTS.display, fontSize: 14, color: '#000', letterSpacing: 1 },
  secondary: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: COLORS.panelBorder },
  secondaryText: { color: COLORS.text },
  pressed: { transform: [{ scale: 0.98 }] },
  listHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 6 },
  link: { color: COLORS.accent2, fontSize: 13, fontWeight: '800' },
  abort: { alignSelf: 'center', paddingVertical: 14 },
  abortText: { color: COLORS.danger, fontSize: 14, fontWeight: '800' },
});
