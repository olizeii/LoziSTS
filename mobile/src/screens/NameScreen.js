import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ConnectionBadge } from '../components/ConnectionBadge';
import { MAX_NAME_LENGTH, SERVER_ADDRESS } from '../config';
import { COLORS, FONTS } from '../theme';

function cleanName(raw) {
  return raw.replace(/\s+/g, ' ').trim();
}

export function NameScreen({ initialName = '', status, state, onSave }) {
  const [value, setValue] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const name = cleanName(value);
  const canSave = name.length > 0 && name.length <= MAX_NAME_LENGTH && !saving;

  // Hinweis, falls der Name schon auf einem Leaderboard steht
  const knownNames = useMemo(() => {
    const names = new Set();
    Object.values(state?.leaderboards ?? {}).forEach((board) =>
      board.forEach((entry) => names.add(entry.name.toLowerCase())),
    );
    return names;
  }, [state]);
  const nameTaken = name.length > 0 && name !== initialName && knownNames.has(name.toLowerCase());

  async function submit() {
    if (!canSave) return;
    setSaving(true);
    try {
      await onSave(name);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.badgeRow}>
            <ConnectionBadge status={status} />
          </View>

          <Text style={styles.emoji}>🎮</Text>
          <Text style={styles.title}>LAN-PARTY{'\n'}CHALLENGE</Text>
          <Text style={styles.subtitle}>Wie heißt du? Dein Name erscheint live auf dem TV-Leaderboard.</Text>

          <TextInput
            value={value}
            onChangeText={setValue}
            placeholder="Dein Name"
            placeholderTextColor={COLORS.muted}
            style={styles.input}
            maxLength={MAX_NAME_LENGTH}
            autoFocus
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={submit}
            selectionColor={COLORS.accent}
          />
          <Text style={styles.counter}>
            {name.length}/{MAX_NAME_LENGTH}
          </Text>

          {nameTaken && (
            <Text style={styles.warning}>
              ⚠️ „{name}" hat schon Punkte gesammelt. Bist du das? Sonst nimm bitte einen anderen Namen.
            </Text>
          )}

          <Pressable
            onPress={submit}
            disabled={!canSave}
            style={({ pressed }) => [styles.button, !canSave && styles.buttonDisabled, pressed && styles.buttonPressed]}
          >
            <Text style={styles.buttonText}>{initialName ? 'SPEICHERN' : "LOS GEHT'S"} 🚀</Text>
          </Pressable>

          <Text style={styles.hint}>Tipp: Nutze das ganze Wochenende denselben Namen.</Text>
          <Text style={styles.server}>Server: {SERVER_ADDRESS}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingBottom: 40 },
  badgeRow: { position: 'absolute', top: 12, right: 16 },
  emoji: { fontSize: 64, textAlign: 'center', marginBottom: 12 },
  title: {
    fontFamily: FONTS.display,
    fontSize: 32,
    lineHeight: 40,
    color: COLORS.text,
    textAlign: 'center',
    letterSpacing: 2,
    textShadowColor: COLORS.accent,
    textShadowRadius: 18,
  },
  subtitle: { color: COLORS.muted, fontSize: 16, textAlign: 'center', marginTop: 14, marginBottom: 28, lineHeight: 22 },
  input: {
    backgroundColor: COLORS.panel,
    borderWidth: 2,
    borderColor: COLORS.accent,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  counter: { color: COLORS.muted, fontSize: 12, textAlign: 'right', marginTop: 6 },
  warning: {
    color: COLORS.warning,
    fontSize: 14,
    marginTop: 10,
    lineHeight: 20,
    textAlign: 'center',
  },
  button: {
    marginTop: 24,
    backgroundColor: COLORS.accent,
    borderRadius: 18,
    paddingVertical: 20,
    alignItems: 'center',
    shadowColor: COLORS.accent,
    shadowOpacity: 0.7,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  buttonDisabled: { opacity: 0.35 },
  buttonPressed: { transform: [{ scale: 0.97 }] },
  buttonText: { fontFamily: FONTS.display, fontSize: 18, color: '#fff', letterSpacing: 2 },
  hint: { color: COLORS.muted, fontSize: 13, textAlign: 'center', marginTop: 18 },
  server: { color: 'rgba(139, 147, 184, 0.5)', fontSize: 11, textAlign: 'center', marginTop: 6 },
});
