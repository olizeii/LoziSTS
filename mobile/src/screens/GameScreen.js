import * as Haptics from 'expo-haptics';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { SectionTitle } from '../components/DartsWidgets';
import { ScreenHeader } from '../components/ScreenHeader';
import { Toast, useToast } from '../components/Toast';
import { confirmAction } from '../confirm';
import { COLORS, FONTS } from '../theme';

const fmt = (n) => Number(n ?? 0).toLocaleString('de-DE');
const TROPHIES = [
  { value: 1, label: '🥇', name: 'Gold' },
  { value: 2, label: '🥈', name: 'Silber' },
  { value: 3, label: '🥉', name: 'Bronze' },
  { value: 0, label: '✕', name: 'keiner' },
];
const TAB_LABELS = { story: 'Minecraft', nether: 'Nether', end: 'Das Ende', adventure: 'Abenteuer', husbandry: 'Landwirtschaft' };
const timeFormatter = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' });

function haptic(type) {
  Haptics.notificationAsync(type).catch(() => {});
}

// Wie ein Eintrag in der Historie angezeigt wird
function describeEntry(game, entry) {
  switch (game.type) {
    case 'wins':
    case 'streak':
      return entry.value === 1 ? '🏆 Sieg' : '💀 Niederlage';
    case 'rank':
      return `Platz ${entry.value}`;
    case 'best':
    case 'sum':
      return game.unit === 'Runde' ? `Runde ${entry.value}` : `${fmt(entry.value)}${game.unit === '%' ? ' %' : ''}`;
    case 'task':
      return '✅ erledigt';
    case 'trophies': {
      const cup = game.items?.find((c) => c.id === entry.item);
      const trophy = TROPHIES.find((t) => t.value === entry.value);
      return `${cup?.label ?? entry.item}: ${trophy?.value ? `${trophy.label} ${trophy.name}` : 'zurückgesetzt'}`;
    }
    case 'checklist': {
      const song = game.items?.find((s) => s.id === entry.item);
      return `${entry.value === 1 ? '💃' : '↩'} ${song?.title ?? entry.item}`;
    }
    case 'minecraft': {
      const adv = game.items?.find((a) => a.id === entry.item);
      return `⛏️ ${adv?.title ?? entry.item}`;
    }
    default:
      return String(entry.value);
  }
}

// Eingabe und Fortschritt eines Games
export function GameScreen({ name, tracker, gameId, goBack }) {
  const { state, status, gamesApi } = tracker;
  const game = state?.games?.list.find((g) => g.id === gameId);
  const insets = useSafeAreaInsets();
  const [toast, showToast] = useToast();
  const [busy, setBusy] = useState(false);
  const connected = status === 'connected';

  if (!game) {
    return (
      <SafeAreaView style={styles.screen}>
        <ScreenHeader title="GAME" status={status} onBack={goBack} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      </SafeAreaView>
    );
  }

  async function submit(value, item = null) {
    setBusy(true);
    const res = await gamesApi.addEntry(name, game.id, value, item);
    setBusy(false);
    if (!res.ok) {
      haptic(Haptics.NotificationFeedbackType.Error);
      showToast(`❌ ${res.error}`, 'error');
      return false;
    }
    haptic(Haptics.NotificationFeedbackType.Success);
    if (res.completion) showToast(`🏆 ${game.label} GESCHAFFT! Schau auf den TV!`, 'gold');
    else showToast(res.event.message, 'success');
    return true;
  }

  async function undo() {
    const confirmed = await confirmAction({
      title: 'Letzte Eingabe zurücknehmen?',
      message: `Deine letzte Eingabe bei ${game.label} wird gelöscht.`,
      confirmText: 'Zurücknehmen',
      destructive: true,
    });
    if (!confirmed) return;
    const res = await gamesApi.undoEntry(name, game.id);
    showToast(res.ok ? res.event.message : `❌ ${res.error}`, res.ok ? 'info' : 'error');
  }

  const manual = game.type !== 'minecraft';
  const canInput = connected && !busy;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <ScreenHeader title={`${game.emoji} ${game.label.toUpperCase()}`} subtitle={game.task} status={status} onBack={goBack} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.summary, { borderColor: game.completed ? '#facc15' : game.color }]}>
          {game.completed ? <Text style={styles.completed}>🏆 GESCHAFFT!</Text> : null}
          <Text style={[styles.summaryValue, { color: game.color }]} numberOfLines={1} adjustsFontSizeToFit>
            {game.display}
          </Text>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.min(game.percent, 100)}%`, backgroundColor: game.completed ? '#facc15' : game.color }]} />
          </View>
          {game.leaders.length ? (
            <Text style={styles.leaders} numberOfLines={2}>
              👑 {game.leaders.map((l) => `${l.name} ${leaderValue(game, l.value)}`).join(' · ')}
            </Text>
          ) : null}
        </View>

        {(game.type === 'wins' || game.type === 'streak') && <WinLossPanel game={game} disabled={!canInput} onSubmit={submit} />}
        {(game.type === 'best' || game.type === 'rank' || game.type === 'sum') && (
          <NumberPanel game={game} disabled={!canInput} busy={busy} onSubmit={submit} />
        )}
        {game.type === 'task' && <TaskPanel game={game} name={name} disabled={!canInput} onSubmit={submit} />}
        {game.type === 'trophies' && <TrophiesPanel game={game} disabled={!canInput} onSubmit={submit} />}
        {game.type === 'checklist' && <ChecklistPanel game={game} disabled={!canInput} onSubmit={submit} />}
        {game.type === 'minecraft' && <MinecraftPanel game={game} />}

        {manual && game.history.length ? (
          <>
            <View style={styles.listHead}>
              <SectionTitle>LETZTE EINGABEN</SectionTitle>
              <Pressable onPress={undo} hitSlop={8}>
                <Text style={styles.link}>↩ Meine letzte zurücknehmen</Text>
              </Pressable>
            </View>
            {game.history.map((entry) => (
              <View key={entry.id} style={styles.historyRow}>
                <Text style={styles.historyTime}>{timeFormatter.format(new Date(entry.createdAt))}</Text>
                <Text style={styles.historyName} numberOfLines={1}>
                  {entry.name}
                </Text>
                <Text style={styles.historyValue} numberOfLines={1}>
                  {describeEntry(game, entry)}
                </Text>
              </View>
            ))}
          </>
        ) : null}
      </ScrollView>
      <Toast key={toast?.key} toast={toast} bottom={Math.max(insets.bottom, 16) + 8} />
    </SafeAreaView>
  );
}

function leaderValue(game, value) {
  switch (game.type) {
    case 'wins':
    case 'streak':
      return `(${value} ${value === 1 ? 'Sieg' : 'Siege'})`;
    case 'rank':
      return `(Platz ${value})`;
    case 'task':
      return '✅';
    case 'trophies':
      return `(${value}× Gold)`;
    case 'checklist':
      return `(${value})`;
    case 'minecraft':
      return `(${value})`;
    default:
      return game.unit === 'Runde' ? `(Runde ${value})` : `(${fmt(value)})`;
  }
}

function WinLossPanel({ game, disabled, onSubmit }) {
  return (
    <View style={styles.panel}>
      <Text style={styles.panelHint}>
        {game.type === 'streak'
          ? `Aktuelle Serie ${game.value} · Beste Serie ${game.bestStreak} · ${game.wins} W / ${game.losses} L`
          : `${game.value} ${game.value === 1 ? 'Sieg' : 'Siege'} · ${game.losses} ${game.losses === 1 ? 'Niederlage' : 'Niederlagen'}`}
      </Text>
      <View style={styles.row}>
        <Pressable
          onPress={() => onSubmit(1)}
          disabled={disabled}
          style={({ pressed }) => [styles.bigButton, styles.win, disabled && styles.disabled, pressed && styles.pressed]}
        >
          <Text style={styles.bigEmoji}>🏆</Text>
          <Text style={styles.bigText}>GEWONNEN</Text>
        </Pressable>
        <Pressable
          onPress={() => onSubmit(0)}
          disabled={disabled}
          style={({ pressed }) => [styles.bigButton, styles.loss, disabled && styles.disabled, pressed && styles.pressed]}
        >
          <Text style={styles.bigEmoji}>💀</Text>
          <Text style={styles.bigText}>VERLOREN</Text>
        </Pressable>
      </View>
    </View>
  );
}

function NumberPanel({ game, disabled, busy, onSubmit }) {
  const [text, setText] = useState('');
  // Kommazahlen erlauben (z.B. Hole.io-Prozent 99,5) — Komma oder Punkt
  const allowDecimal = game.type === 'best';
  const digits = allowDecimal
    ? text.replace(/[^0-9.,]/g, '').replace(',', '.').replace(/(\..*)\./g, '$1')
    : text.replace(/\D/g, '');
  const value = digits ? Number(digits) : null;
  const valid = value !== null && Number.isFinite(value) && value >= game.min && value <= game.max;

  async function submit() {
    if (!valid || disabled) return;
    if (await onSubmit(value)) setText('');
  }

  return (
    <View style={styles.panel}>
      <Text style={styles.panelHint}>
        {game.inputLabel} eingeben ({fmt(game.min)}–{fmt(game.max)})
        {game.type === 'sum' ? ' – wird zur Gesamtsumme addiert' : game.type === 'rank' ? ' – der beste Platz zählt' : ' – der beste Wert zählt'}
      </Text>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={game.inputLabel}
        placeholderTextColor={COLORS.muted}
        keyboardType={allowDecimal ? "numbers-and-punctuation" : "number-pad"}
        returnKeyType="done"
        onSubmitEditing={submit}
        style={[styles.input, { borderColor: game.color }]}
        maxLength={12}
      />
      {value !== null && !valid ? <Text style={styles.error}>Bitte eine Zahl zwischen {fmt(game.min)} und {fmt(game.max)}</Text> : null}
      <Pressable
        onPress={submit}
        disabled={!valid || disabled}
        style={({ pressed }) => [styles.submit, { backgroundColor: game.color }, (!valid || disabled) && styles.disabled, pressed && styles.pressed]}
      >
        {busy ? <ActivityIndicator color="#000" /> : <Text style={styles.submitText}>EINTRAGEN{valid ? ` · ${fmt(value)}` : ''}</Text>}
      </Pressable>
    </View>
  );
}

function TaskPanel({ game, name, disabled, onSubmit }) {
  const doneByMe = game.leaders.some((l) => l.name === name);
  async function done() {
    const confirmed = await confirmAction({
      title: `${game.label} geschafft?`,
      message: `${game.task} – als erledigt für ${name} eintragen?`,
      confirmText: 'Ja, geschafft!',
    });
    if (confirmed) onSubmit(1);
  }
  return (
    <View style={styles.panel}>
      <Text style={styles.panelHint}>
        {game.completed ? `Geschafft von ${game.leaders.map((l) => l.name).join(', ')}` : 'Noch hat es niemand geschafft.'}
      </Text>
      <Pressable
        onPress={done}
        disabled={disabled || doneByMe}
        style={({ pressed }) => [styles.bigButton, styles.win, styles.fullWidth, (disabled || doneByMe) && styles.disabled, pressed && styles.pressed]}
      >
        <Text style={styles.bigEmoji}>{doneByMe ? '✅' : game.emoji}</Text>
        <Text style={styles.bigText}>{doneByMe ? 'DU HAST ES GESCHAFFT' : game.completed ? 'ICH AUCH!' : 'ERLEDIGT!'}</Text>
      </Pressable>
    </View>
  );
}

function TrophiesPanel({ game, disabled, onSubmit }) {
  return (
    <View style={styles.panel}>
      <Text style={styles.panelHint}>Pokal pro Cup eintragen – nur Gold zählt für das Ziel.</Text>
      {game.items.map((cup) => (
        <View key={cup.id} style={[styles.cupRow, cup.trophy === 1 && styles.cupGold]}>
          <View style={styles.cupInfo}>
            <Text style={styles.cupTitle}>
              {cup.emoji} {cup.label}
            </Text>
            <Text style={styles.cupSub} numberOfLines={1}>
              {cup.trophy ? `${TROPHIES.find((t) => t.value === cup.trophy).name} von ${cup.by}` : cup.tracks.join(' · ')}
            </Text>
          </View>
          <View style={styles.trophyButtons}>
            {TROPHIES.map((t) => (
              <Pressable
                key={t.value}
                onPress={() => onSubmit(t.value, cup.id)}
                disabled={disabled || cup.trophy === t.value}
                style={[styles.trophyButton, cup.trophy === t.value && t.value !== 0 && styles.trophyActive, disabled && styles.disabled]}
              >
                <Text style={styles.trophyText}>{t.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

function FilterChips({ value, options, onChange, color }) {
  return (
    <View style={styles.chips}>
      {options.map((o) => (
        <Pressable
          key={o.value}
          onPress={() => onChange(o.value)}
          style={[styles.chip, value === o.value && { backgroundColor: color, borderColor: color }]}
        >
          <Text style={[styles.chipText, value === o.value && styles.chipTextActive]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function ChecklistPanel({ game, disabled, onSubmit }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('open');
  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return game.items.filter((s) => {
      if (filter === 'open' && s.done) return false;
      if (filter === 'done' && !s.done) return false;
      return !q || s.title.toLowerCase().includes(q) || s.artist?.toLowerCase().includes(q);
    });
  }, [game.items, query, filter]);

  async function toggle(song) {
    if (song.done) {
      const confirmed = await confirmAction({
        title: 'Wieder als offen markieren?',
        message: `„${song.title}" wurde von ${song.by} getanzt.`,
        confirmText: 'Wieder offen',
        destructive: true,
      });
      if (confirmed) onSubmit(0, song.id);
    } else {
      onSubmit(1, song.id);
    }
  }

  return (
    <View style={styles.panel}>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Song oder Interpret suchen"
        placeholderTextColor={COLORS.muted}
        style={[styles.input, styles.search]}
        autoCorrect={false}
      />
      <FilterChips
        value={filter}
        onChange={setFilter}
        color={game.color}
        options={[
          { value: 'open', label: `Offen (${game.goal - game.value})` },
          { value: 'done', label: `Getanzt (${game.value})` },
          { value: 'all', label: 'Alle' },
        ]}
      />
      {items.map((song) => (
        <Pressable
          key={song.id}
          onPress={() => toggle(song)}
          disabled={disabled}
          style={({ pressed }) => [styles.songRow, song.done && { borderColor: game.color }, pressed && styles.pressed]}
        >
          <Text style={styles.songCheck}>{song.done ? '✅' : '⬜'}</Text>
          <View style={styles.flex}>
            <Text style={styles.songTitle} numberOfLines={1}>
              {song.title}
            </Text>
            <Text style={styles.songArtist} numberOfLines={1}>
              {song.done ? `💃 ${song.by}` : song.artist}
            </Text>
          </View>
        </Pressable>
      ))}
      {items.length === 0 ? <Text style={styles.empty}>Nichts gefunden.</Text> : null}
    </View>
  );
}

function MinecraftPanel({ game }) {
  const [filter, setFilter] = useState('open');
  const [openItem, setOpenItem] = useState(null);
  const sync = game.sync;
  const items = game.items.filter((a) => (filter === 'open' ? !a.done : filter === 'done' ? a.done : true));
  return (
    <View style={styles.panel}>
      <View style={[styles.syncBox, { borderColor: sync?.ok ? COLORS.success : COLORS.danger }]}>
        <Text style={styles.syncTitle}>{sync?.ok ? '● Live mit dem Minecraft-Server verbunden' : '● Keine Verbindung zum Minecraft-Server'}</Text>
        <Text style={styles.syncText}>
          {sync?.ok
            ? `Version ${sync.version ?? 'unbekannt'} · Welt „${sync.world}" · ${sync.players} Spieler · wird automatisch übernommen`
            : sync?.error ?? 'Noch nicht synchronisiert'}
        </Text>
      </View>
      {game.tabs.map((tab) => (
        <View key={tab.tab} style={styles.tabRow}>
          <Text style={styles.tabLabel}>{TAB_LABELS[tab.tab]}</Text>
          <View style={[styles.track, styles.flex]}>
            <View style={[styles.fill, { width: `${tab.total ? (tab.done / tab.total) * 100 : 0}%`, backgroundColor: game.color }]} />
          </View>
          <Text style={styles.tabCount}>
            {tab.done}/{tab.total}
          </Text>
        </View>
      ))}
      <FilterChips
        value={filter}
        onChange={setFilter}
        color={game.color}
        options={[
          { value: 'open', label: `Fehlen (${game.goal - game.value})` },
          { value: 'done', label: `Erreicht (${game.value})` },
          { value: 'all', label: 'Alle' },
        ]}
      />
      {items.map((a) => (
        <Pressable
          key={a.id}
          onPress={() => setOpenItem(openItem?.id === a.id ? null : a)}
          style={[styles.songRow, a.done && { borderColor: game.color }]}
        >
          <Text style={styles.songCheck}>{a.done ? '✅' : a.frame === 'challenge' ? '🟪' : a.frame === 'goal' ? '🟦' : '⬜'}</Text>
          <View style={styles.flex}>
            <Text style={styles.songTitle} numberOfLines={1}>
              {a.title}
              {a.titleEn && a.titleEn !== a.title ? ` · ${a.titleEn}` : ''}
            </Text>
            <Text style={styles.songArtist} numberOfLines={1}>
              {TAB_LABELS[a.tab]}
              {a.done ? ` · ⛏️ ${a.by}${a.at ? ` · ${new Date(a.at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr` : ''}` : ''}
            </Text>
            {openItem?.id === a.id && a.description ? (
              <Text style={[styles.songArtist, { marginTop: 4, color: COLORS.text }]}>
                {a.description}
              </Text>
            ) : null}
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 14, gap: 12 },
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: 10 },
  summary: {
    backgroundColor: COLORS.panel,
    borderRadius: 20,
    borderWidth: 2,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  completed: { color: '#facc15', fontFamily: FONTS.display, fontSize: 14, letterSpacing: 2 },
  summaryValue: { fontFamily: FONTS.display, fontSize: 30 },
  track: { alignSelf: 'stretch', height: 8, borderRadius: 4, backgroundColor: 'rgba(255, 255, 255, 0.08)', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  leaders: { color: COLORS.text, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  panel: { gap: 10 },
  panelHint: { color: COLORS.muted, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  bigButton: { flex: 1, height: 130, borderRadius: 22, alignItems: 'center', justifyContent: 'center', gap: 6 },
  fullWidth: { flex: 0, alignSelf: 'stretch' },
  win: { backgroundColor: '#10b981' },
  loss: { backgroundColor: '#e11d48' },
  bigEmoji: { fontSize: 40 },
  bigText: { fontFamily: FONTS.display, fontSize: 16, color: '#fff', letterSpacing: 1 },
  disabled: { opacity: 0.4 },
  pressed: { transform: [{ scale: 0.97 }] },
  input: {
    backgroundColor: COLORS.panel,
    borderWidth: 2,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
  },
  search: { fontSize: 16, borderColor: COLORS.panelBorder, borderWidth: 1, textAlign: 'left' },
  error: { color: COLORS.danger, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  submit: { height: 58, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  submitText: { fontFamily: FONTS.display, fontSize: 16, color: '#000', letterSpacing: 1 },
  cupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.panel,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.panelBorder,
    padding: 10,
  },
  cupGold: { borderColor: '#facc15', backgroundColor: '#2a2106' },
  cupInfo: { flex: 1 },
  cupTitle: { color: COLORS.text, fontSize: 15, fontWeight: '800' },
  cupSub: { color: COLORS.muted, fontSize: 11, fontWeight: '600', marginTop: 2 },
  trophyButtons: { flexDirection: 'row', gap: 4 },
  trophyButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.panelBorder,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  trophyActive: { borderColor: '#facc15', backgroundColor: 'rgba(250, 204, 21, 0.2)' },
  trophyText: { fontSize: 20, color: COLORS.text },
  chips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { borderRadius: 999, borderWidth: 1, borderColor: COLORS.panelBorder, paddingHorizontal: 12, paddingVertical: 7 },
  chipText: { color: COLORS.text, fontSize: 13, fontWeight: '700' },
  chipTextActive: { color: '#000' },
  songRow: {
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
  songCheck: { fontSize: 20 },
  songTitle: { color: COLORS.text, fontSize: 15, fontWeight: '800' },
  songArtist: { color: COLORS.muted, fontSize: 12, fontWeight: '600', marginTop: 1 },
  empty: { color: COLORS.muted, textAlign: 'center', paddingVertical: 12 },
  syncBox: { borderWidth: 1.5, borderRadius: 14, padding: 12, backgroundColor: COLORS.panel, gap: 4 },
  syncTitle: { color: COLORS.text, fontSize: 14, fontWeight: '800' },
  syncText: { color: COLORS.muted, fontSize: 12, fontWeight: '600' },
  tabRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tabLabel: { color: COLORS.text, fontSize: 13, fontWeight: '700', width: 110 },
  tabCount: { color: COLORS.text, fontFamily: FONTS.displayBold, fontSize: 12, width: 48, textAlign: 'right' },
  listHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 4 },
  link: { color: COLORS.accent2, fontSize: 13, fontWeight: '800' },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  historyTime: { color: COLORS.muted, fontSize: 11, fontWeight: '700', width: 40 },
  historyName: { color: COLORS.text, fontSize: 14, fontWeight: '800', width: 90 },
  historyValue: { color: COLORS.text, fontSize: 14, fontWeight: '600', flex: 1, textAlign: 'right' },
});
