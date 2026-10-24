import * as Haptics from 'expo-haptics';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChallengeButton } from '../components/ChallengeButton';
import { ConnectionBadge } from '../components/ConnectionBadge';
import { formatNumber } from '../components/DartsWidgets';
import { AdminResetModal } from '../components/AdminResetModal';
import { Toast } from '../components/Toast';
import { SERVER_ADDRESS } from '../config';
import { confirmAction } from '../confirm';
import { COLORS, DARTS_COLOR, FONTS } from '../theme';

function haptic(fn) {
  fn().catch(() => {});
}

// Einstieg in den Dart-Tracker: Team-Countdown + eigene Punkte
function DartsCard({ state, name, onPress }) {
  const darts = state.darts;
  const challenge = state.challenges.find((c) => c.kind === 'darts');
  if (!darts || !challenge) return null;
  const me = darts.players.find((p) => p.name === name);
  const liveGames = darts.activeGames.length;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.dartsCard, pressed && styles.dartsCardPressed]}>
      <Text style={styles.dartsEmoji}>🎯</Text>
      <View style={styles.dartsMiddle}>
        <Text style={styles.dartsLabel}>DARTS · {formatNumber(challenge.goal)}</Text>
        <View style={styles.dartsTrack}>
          <View style={[styles.dartsFill, { width: `${Math.min(challenge.percent, 100)}%` }]} />
        </View>
        <Text style={styles.dartsInfo} numberOfLines={1}>
          noch <Text style={styles.dartsStrong}>{formatNumber(darts.remaining)}</Text>
          {liveGames ? ` · ${liveGames} Spiel${liveGames > 1 ? 'e' : ''} live` : ''}
        </Text>
        <Text style={styles.dartsMine} numberOfLines={1}>
          {me ? `Du: ${formatNumber(me.points)} Pkt · Ø ${formatNumber(me.average)}` : 'Du: noch kein Dart geworfen'}
        </Text>
      </View>
      <View style={styles.dartsChip}>
        <Text style={styles.dartsChipText}>ÖFFNEN ›</Text>
      </View>
    </Pressable>
  );
}

export function TrackerScreen({ name, tracker, onChangeName, onOpenDarts }) {
  const { state, status, lastError, tick, undo } = tracker;
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState(null);
  const [undoing, setUndoing] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const toastSeq = useRef(0);
  const connected = status === 'connected';

  const showToast = useCallback((message, tone = 'info') => {
    toastSeq.current += 1;
    setToast({ key: toastSeq.current, message, tone });
  }, []);

  const handleTick = useCallback(
    async (challenge) => {
      haptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
      const res = await tick(name, challenge.id);
      if (!res.ok) {
        haptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
        showToast(`❌ ${res.error}`, 'error');
        return false;
      }
      haptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
      if (res.milestones?.length) {
        const top = res.milestones[res.milestones.length - 1];
        showToast(
          top.percent >= 100
            ? `🏆 DU hast ${challenge.label} abgeschlossen! Schau auf den TV!`
            : `⚡ DU hast den ${top.percent}%-Meilenstein geknackt! Schau auf den TV!`,
          'gold',
        );
      } else {
        showToast(`✅ ${res.event.message}`, 'success');
      }
      return true;
    },
    [name, tick, showToast],
  );

  const confirmUndo = useCallback(async () => {
    const confirmed = await confirmAction({
      title: 'Letzten Tick zurücknehmen?',
      message: 'Dein zuletzt getickter Eintrag wird wieder abgezogen.',
      confirmText: 'Zurücknehmen',
      destructive: true,
    });
    if (!confirmed) return;
    setUndoing(true);
    const res = await undo(name);
    setUndoing(false);
    if (res.ok) {
      haptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
      showToast(res.event.message, 'info');
    } else {
      haptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
      showToast(`❌ ${res.error}`, 'error');
    }
  }, [name, undo, showToast]);

  const confirmNameChange = useCallback(async () => {
    const confirmed = await confirmAction({
      title: 'Namen ändern?',
      message: 'Neue Ticks zählen dann für den neuen Namen. Bisherige Punkte bleiben beim alten Namen.',
      confirmText: 'Ändern',
    });
    if (confirmed) onChangeName();
  }, [onChangeName]);

  const myChallengeCount = state
    ? state.challenges.filter((c) => state.leaderboards[c.id]?.some((e) => e.name === name)).length
    : 0;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable onPress={confirmNameChange} style={styles.nameBox} hitSlop={8}>
          <Text style={styles.hello}>HI,</Text>
          <Text style={styles.name} numberOfLines={1}>
            {name} 👋
          </Text>
          <Text style={styles.changeName}>Name ändern</Text>
        </Pressable>
        {/* Versteckt: 3 Sekunden lang auf den Verbindungs-Status drücken öffnet das Admin-Menü */}
        <Pressable onLongPress={() => setAdminOpen(true)} delayLongPress={3000}>
          <ConnectionBadge status={status} />
        </Pressable>
      </View>

      {!connected && (
        <View style={styles.offlineBox}>
          <Text style={styles.offlineText}>
            {status === 'offline'
              ? `Server ${SERVER_ADDRESS} nicht erreichbar. Bist du im LAN-WLAN?`
              : `Verbinde mit ${SERVER_ADDRESS} …`}
          </Text>
          {status === 'offline' && lastError ? <Text style={styles.offlineDetail}>{lastError}</Text> : null}
        </View>
      )}

      {state ? (
        <ScrollView contentContainerStyle={styles.buttons}>
          {state.challenges
            .filter((challenge) => challenge.kind === 'tick')
            .map((challenge) => (
              <ChallengeButton
                key={challenge.id}
                challenge={challenge}
                myEntry={state.leaderboards[challenge.id]?.find((e) => e.name === name)}
                disabled={!connected}
                onTick={handleTick}
              />
            ))}
          <DartsCard state={state} name={name} onPress={onOpenDarts} />
        </ScrollView>
      ) : (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Lade Challenges …</Text>
        </View>
      )}

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Text style={styles.footerInfo}>
          {state ? `Du bist in ${myChallengeCount}/${state.challenges.length} Challenges dabei` : ' '}
        </Text>
        <Pressable
          onPress={confirmUndo}
          disabled={!connected || undoing}
          style={({ pressed }) => [styles.undo, (!connected || undoing) && styles.undoDisabled, pressed && styles.undoPressed]}
        >
          {undoing ? <ActivityIndicator color={COLORS.text} /> : <Text style={styles.undoText}>↩ Letzten Tick zurücknehmen</Text>}
        </Pressable>
      </View>

      <Toast key={toast?.key} toast={toast} bottom={Math.max(insets.bottom, 12) + 96} />
      <AdminResetModal visible={adminOpen} name={name} tracker={tracker} onClose={() => setAdminOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 12,
  },
  nameBox: { flex: 1 },
  hello: { fontFamily: FONTS.displayBold, color: COLORS.muted, fontSize: 12, letterSpacing: 3 },
  name: {
    fontFamily: FONTS.display,
    color: COLORS.text,
    fontSize: 24,
    textShadowColor: COLORS.accent,
    textShadowRadius: 12,
  },
  changeName: { color: COLORS.accent2, fontSize: 12, fontWeight: '700', marginTop: 2 },
  offlineBox: {
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.danger,
    backgroundColor: '#2a0610',
  },
  offlineText: { color: COLORS.text, fontSize: 14, fontWeight: '700', textAlign: 'center' },
  offlineDetail: { color: COLORS.muted, fontSize: 11, textAlign: 'center', marginTop: 4 },
  buttons: { paddingHorizontal: 16, paddingBottom: 8, gap: 12 },
  dartsCard: {
    height: 118,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: DARTS_COLOR,
    backgroundColor: COLORS.panel,
    shadowColor: DARTS_COLOR,
    shadowOpacity: 0.55,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  dartsCardPressed: { transform: [{ scale: 0.97 }] },
  dartsEmoji: { fontSize: 38 },
  dartsMiddle: { flex: 1, gap: 5 },
  dartsLabel: { fontFamily: FONTS.display, fontSize: 15, color: COLORS.text, letterSpacing: 0.5 },
  dartsTrack: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255, 255, 255, 0.08)', overflow: 'hidden' },
  dartsFill: { height: '100%', borderRadius: 4, backgroundColor: DARTS_COLOR },
  dartsInfo: { color: COLORS.muted, fontSize: 13, fontWeight: '600' },
  dartsStrong: { color: DARTS_COLOR, fontWeight: '800', fontSize: 14 },
  dartsMine: { color: COLORS.text, fontSize: 13, fontWeight: '700', opacity: 0.85 },
  dartsChip: {
    minWidth: 76,
    height: 64,
    borderRadius: 18,
    backgroundColor: DARTS_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  dartsChipText: { fontFamily: FONTS.display, fontSize: 13, color: '#000' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: COLORS.muted, fontSize: 15 },
  footer: { paddingHorizontal: 16, paddingTop: 12, gap: 8 },
  footerInfo: { color: COLORS.muted, fontSize: 12, textAlign: 'center', fontWeight: '600' },
  undo: {
    borderWidth: 1,
    borderColor: COLORS.panelBorder,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  undoDisabled: { opacity: 0.4 },
  undoPressed: { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
  undoText: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
});
