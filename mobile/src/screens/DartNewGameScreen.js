import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { SectionTitle } from '../components/DartsWidgets';
import { ScreenHeader } from '../components/ScreenHeader';
import { Toast, useToast } from '../components/Toast';
import { MAX_NAME_LENGTH } from '../config';
import { MAX_PLAYERS, START_SCORES } from '../darts/rules';
import { COLORS, DARTS_COLOR, FONTS } from '../theme';

function cleanName(raw) {
  return raw.replace(/\s+/g, ' ').trim();
}

function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Neues X01-Spiel anlegen: Startpunkte, Double-Out, Spieler & Reihenfolge
export function DartNewGameScreen({ name, tracker, goBack, replace }) {
  const { state, status, darts } = tracker;
  const insets = useSafeAreaInsets();
  const [toast, showToast] = useToast();
  const [startScore, setStartScore] = useState(501);
  const [doubleOut, setDoubleOut] = useState(true);
  const [players, setPlayers] = useState([name]);
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);

  // Bekannte Namen aus allen Leaderboards als Vorschläge
  const suggestions = useMemo(() => {
    const names = new Set();
    Object.values(state?.leaderboards ?? {}).forEach((board) => board.forEach((e) => names.add(e.name)));
    (state?.darts?.players ?? []).forEach((p) => names.add(p.name));
    const chosen = new Set(players.map((p) => p.toLowerCase()));
    return [...names].filter((n) => !chosen.has(n.toLowerCase())).sort((a, b) => a.localeCompare(b, 'de'));
  }, [state, players]);

  function addPlayer(raw) {
    const player = cleanName(raw);
    if (!player) return;
    if (players.length >= MAX_PLAYERS) {
      showToast(`Maximal ${MAX_PLAYERS} Spieler`, 'error');
      return;
    }
    if (players.some((p) => p.toLowerCase() === player.toLowerCase())) {
      showToast(`${player} ist schon dabei`, 'error');
      return;
    }
    setPlayers((prev) => [...prev, player]);
    setNewName('');
  }

  function removePlayer(player) {
    setPlayers((prev) => prev.filter((p) => p !== player));
  }

  async function start() {
    if (!players.length) return;
    setBusy(true);
    const res = await darts.createGame(name, { players, startScore, doubleOut });
    setBusy(false);
    if (!res.ok) {
      showToast(`❌ ${res.error}`, 'error');
      return;
    }
    replace('dartGame', { gameId: res.game.id });
  }

  const modeLabel = players.length === 1 ? 'Solo' : players.length === 2 ? '1 gegen 1' : `${players.length} Spieler`;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <ScreenHeader title="NEUES SPIEL" subtitle="Punkte zählen für die 10.001" status={status} onBack={goBack} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) + 90 }]}
        keyboardShouldPersistTaps="handled"
      >
        <SectionTitle>STARTPUNKTE</SectionTitle>
        <View style={styles.row}>
          {START_SCORES.map((score) => (
            <Pressable
              key={score}
              onPress={() => setStartScore(score)}
              style={[styles.scoreChip, startScore === score && styles.scoreChipActive]}
            >
              <Text style={[styles.scoreText, startScore === score && styles.scoreTextActive]}>{score}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.switchRow}>
          <View style={styles.flex}>
            <Text style={styles.switchTitle}>Double Out</Text>
            <Text style={styles.switchSub}>Letzter Dart muss ein Doppel (oder Bull) sein</Text>
          </View>
          <Switch
            value={doubleOut}
            onValueChange={setDoubleOut}
            trackColor={{ true: DARTS_COLOR, false: '#333' }}
            thumbColor="#fff"
          />
        </View>

        <SectionTitle>
          SPIELER ({modeLabel}) – REIHENFOLGE = WURFREIHENFOLGE
        </SectionTitle>
        {players.map((player, index) => (
          <View key={player} style={styles.playerRow}>
            <Text style={styles.playerIndex}>{index + 1}.</Text>
            <Text style={styles.playerName} numberOfLines={1}>
              {player}
              {player === name ? ' (du)' : ''}
            </Text>
            <Pressable onPress={() => removePlayer(player)} hitSlop={10} style={styles.removeButton}>
              <Text style={styles.removeText}>✕</Text>
            </Pressable>
          </View>
        ))}
        {players.length > 1 ? (
          <Pressable onPress={() => setPlayers((prev) => shuffle(prev))} style={styles.shuffle}>
            <Text style={styles.shuffleText}>🔀 Reihenfolge auslosen</Text>
          </Pressable>
        ) : null}

        <View style={styles.addRow}>
          <TextInput
            value={newName}
            onChangeText={setNewName}
            placeholder="Spieler hinzufügen"
            placeholderTextColor={COLORS.muted}
            style={styles.input}
            maxLength={MAX_NAME_LENGTH}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={() => addPlayer(newName)}
          />
          <Pressable onPress={() => addPlayer(newName)} style={styles.addButton}>
            <Text style={styles.addText}>+</Text>
          </Pressable>
        </View>
        {suggestions.length ? (
          <View style={styles.suggestions}>
            {suggestions.map((s) => (
              <Pressable key={s} onPress={() => addPlayer(s)} style={styles.suggestion}>
                <Text style={styles.suggestionText}>+ {s}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Pressable
          onPress={start}
          disabled={busy || players.length === 0 || status !== 'connected'}
          style={({ pressed }) => [
            styles.startButton,
            (busy || players.length === 0 || status !== 'connected') && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.startText}>
            {startScore} STARTEN · {modeLabel.toUpperCase()} 🎯
          </Text>
        </Pressable>
      </View>
      <Toast key={toast?.key} toast={toast} bottom={Math.max(insets.bottom, 12) + 80} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingHorizontal: 16, gap: 8 },
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: 8 },
  scoreChip: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.panelBorder,
    backgroundColor: COLORS.panel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreChipActive: { borderColor: DARTS_COLOR, backgroundColor: DARTS_COLOR },
  scoreText: { fontFamily: FONTS.display, fontSize: 18, color: COLORS.text },
  scoreTextActive: { color: '#000' },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.panel,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.panelBorder,
    padding: 12,
    marginTop: 4,
  },
  switchTitle: { color: COLORS.text, fontSize: 16, fontWeight: '800' },
  switchSub: { color: COLORS.muted, fontSize: 12, marginTop: 2 },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.panel,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.panelBorder,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  playerIndex: { fontFamily: FONTS.display, color: DARTS_COLOR, fontSize: 16, width: 26 },
  playerName: { flex: 1, color: COLORS.text, fontSize: 16, fontWeight: '800' },
  removeButton: { padding: 4 },
  removeText: { color: COLORS.muted, fontSize: 16, fontWeight: '800' },
  shuffle: { alignSelf: 'flex-start', paddingVertical: 6 },
  shuffleText: { color: COLORS.accent2, fontSize: 14, fontWeight: '800' },
  addRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  input: {
    flex: 1,
    backgroundColor: COLORS.panel,
    borderWidth: 1.5,
    borderColor: COLORS.accent,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '700',
  },
  addButton: {
    width: 52,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: { color: '#fff', fontSize: 26, fontWeight: '800', marginTop: -2 },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  suggestion: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.panelBorder,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  suggestionText: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  footer: { paddingHorizontal: 16, paddingTop: 10, backgroundColor: COLORS.bg },
  startButton: {
    height: 60,
    borderRadius: 18,
    backgroundColor: DARTS_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: DARTS_COLOR,
    shadowOpacity: 0.6,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  disabled: { opacity: 0.4 },
  pressed: { transform: [{ scale: 0.98 }] },
  startText: { fontFamily: FONTS.display, fontSize: 16, color: '#000', letterSpacing: 1 },
});
