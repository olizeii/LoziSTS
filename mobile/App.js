import { Orbitron_700Bold, Orbitron_900Black, useFonts } from '@expo-google-fonts/orbitron';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SERVER_URL } from './src/config';
import { NameScreen } from './src/screens/NameScreen';
import { TrackerScreen } from './src/screens/TrackerScreen';
import { clearName, loadName, saveName } from './src/storage';
import { COLORS } from './src/theme';
import { useTracker } from './src/useTracker';

export default function App() {
  const [fontsLoaded, fontError] = useFonts({ Orbitron_700Bold, Orbitron_900Black });
  // undefined = wird geladen, null = noch kein Name gespeichert
  const [name, setName] = useState(undefined);
  const [previousName, setPreviousName] = useState('');
  const tracker = useTracker();

  useEffect(() => {
    loadName()
      .then(setName)
      .catch(() => setName(null));
  }, []);

  const handleSave = useCallback(async (newName) => {
    await saveName(newName);
    setName(newName);
  }, []);

  const handleChangeName = useCallback(async () => {
    setPreviousName(name ?? '');
    await clearName();
    setName(null);
  }, [name]);

  let content;
  if (!SERVER_URL) {
    content = (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>⚠️ Server-IP fehlt</Text>
        <Text style={styles.errorText}>
          Lege in mobile/.env den Eintrag EXPO_PUBLIC_SERVER_IP=10.0.0.210 an und lade die App neu.
        </Text>
      </View>
    );
  } else if ((!fontsLoaded && !fontError) || name === undefined) {
    content = (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  } else if (!name) {
    content = (
      <NameScreen initialName={previousName} status={tracker.status} state={tracker.state} onSave={handleSave} />
    );
  } else {
    content = <TrackerScreen name={name} tracker={tracker} onChangeName={handleChangeName} />;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <View style={styles.root}>{content}</View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  errorTitle: { color: COLORS.danger, fontSize: 22, fontWeight: '800' },
  errorText: { color: COLORS.text, fontSize: 16, textAlign: 'center', lineHeight: 22 },
});
