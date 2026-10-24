import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { confirmAction } from '../confirm';
import { COLORS, FONTS } from '../theme';

// Verstecktes Admin-Menü: alle Daten auf dem Server löschen (braucht ADMIN_TOKEN des Servers)
export function AdminResetModal({ visible, name, tracker, onClose }) {
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  function close() {
    setToken('');
    setMessage(null);
    setBusy(false);
    onClose();
  }

  async function reset() {
    if (!token.trim() || busy) return;
    const confirmed = await confirmAction({
      title: 'Wirklich ALLES löschen?',
      message: 'Alle Ticks, Darts, Spiele und Meilensteine werden für alle unwiderruflich gelöscht.',
      confirmText: 'Alles löschen',
      destructive: true,
    });
    if (!confirmed) return;

    setBusy(true);
    const res = await tracker.adminReset(name, token.trim());
    setBusy(false);
    if (res.ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      close();
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setMessage(res.error);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.card}>
          <Text style={styles.title}>🔒 ADMIN</Text>
          <Text style={styles.text}>
            Setzt alle Challenges, Darts und Spiele auf 0 – für alle Handys und den TV.
          </Text>
          <TextInput
            value={token}
            onChangeText={(value) => {
              setToken(value);
              setMessage(null);
            }}
            placeholder="Admin-Passwort"
            placeholderTextColor={COLORS.muted}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
            onSubmitEditing={reset}
          />
          {message ? <Text style={styles.error}>{message}</Text> : null}
          <Pressable
            onPress={reset}
            disabled={!token.trim() || busy}
            style={({ pressed }) => [styles.danger, (!token.trim() || busy) && styles.disabled, pressed && styles.pressed]}
          >
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.dangerText}>ALLES ZURÜCKSETZEN</Text>}
          </Pressable>
          <Pressable onPress={close} style={styles.cancel}>
            <Text style={styles.cancelText}>Abbrechen</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.75)', justifyContent: 'center', padding: 24 },
  card: {
    backgroundColor: COLORS.panel,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.danger,
    padding: 20,
    gap: 12,
  },
  title: { fontFamily: FONTS.display, color: COLORS.danger, fontSize: 20, textAlign: 'center', letterSpacing: 2 },
  text: { color: COLORS.text, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  input: {
    backgroundColor: COLORS.bg,
    borderWidth: 1.5,
    borderColor: COLORS.panelBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text,
  },
  error: { color: COLORS.danger, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  danger: {
    height: 54,
    borderRadius: 14,
    backgroundColor: COLORS.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.4 },
  pressed: { transform: [{ scale: 0.98 }] },
  dangerText: { fontFamily: FONTS.display, color: '#fff', fontSize: 14, letterSpacing: 1 },
  cancel: { alignItems: 'center', paddingVertical: 6 },
  cancelText: { color: COLORS.muted, fontSize: 15, fontWeight: '700' },
});
