import { Orbitron_700Bold, Orbitron_900Black, useFonts } from '@expo-google-fonts/orbitron';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SERVER_URL } from './src/config';
import { DartFreeScreen } from './src/screens/DartFreeScreen';
import { DartGameScreen } from './src/screens/DartGameScreen';
import { DartHistoryScreen } from './src/screens/DartHistoryScreen';
import { DartNewGameScreen } from './src/screens/DartNewGameScreen';
import { DartsHomeScreen } from './src/screens/DartsHomeScreen';
import { GameScreen } from './src/screens/GameScreen';
import { GamesHomeScreen } from './src/screens/GamesHomeScreen';
import { NameScreen } from './src/screens/NameScreen';
import { TrackerScreen } from './src/screens/TrackerScreen';
import { clearName, loadName, saveName } from './src/storage';
import { COLORS } from './src/theme';
import { useTracker } from './src/useTracker';

const HOME = { name: 'home', params: {} };

export default function App() {
  const [fontsLoaded, fontError] = useFonts({ Orbitron_700Bold, Orbitron_900Black });
  // undefined = wird geladen, null = noch kein Name gespeichert
  const [name, setName] = useState(undefined);
  const [previousName, setPreviousName] = useState('');
  // Einfacher Navigations-Stack: [{ name, params }]
  const [stack, setStack] = useState([HOME]);
  const tracker = useTracker();
  const route = stack[stack.length - 1];

  useEffect(() => {
    loadName()
      .then(setName)
      .catch(() => setName(null));
  }, []);

  const navigate = useCallback((screen, params = {}) => setStack((prev) => [...prev, { name: screen, params }]), []);
  const replace = useCallback(
    (screen, params = {}) => setStack((prev) => [...prev.slice(0, -1), { name: screen, params }]),
    [],
  );
  const goBack = useCallback(() => setStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev)), []);

  // Nach einem Admin-Reset zurück zum Startscreen (offene Spiele gibt es nicht mehr)
  useEffect(() => {
    if (tracker.resetCount > 0) setStack([HOME]);
  }, [tracker.resetCount]);

  // Android-Zurück-Taste
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (stack.length > 1) {
        goBack();
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [stack.length, goBack]);

  const handleSave = useCallback(async (newName) => {
    await saveName(newName);
    setName(newName);
    setStack([HOME]);
  }, []);

  const handleChangeName = useCallback(async () => {
    setPreviousName(name ?? '');
    await clearName();
    setName(null);
  }, [name]);

  const screenProps = { name, tracker, navigate, replace, goBack };

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
  } else if (route.name === 'darts') {
    content = <DartsHomeScreen {...screenProps} />;
  } else if (route.name === 'dartFree') {
    content = <DartFreeScreen {...screenProps} />;
  } else if (route.name === 'dartNewGame') {
    content = <DartNewGameScreen {...screenProps} />;
  } else if (route.name === 'dartGame') {
    content = <DartGameScreen key={route.params.gameId} {...screenProps} gameId={route.params.gameId} />;
  } else if (route.name === 'dartHistory') {
    content = <DartHistoryScreen {...screenProps} />;
  } else if (route.name === 'games') {
    content = <GamesHomeScreen {...screenProps} />;
  } else if (route.name === 'game') {
    content = <GameScreen key={route.params.gameId} {...screenProps} gameId={route.params.gameId} />;
  } else {
    content = (
      <TrackerScreen
        name={name}
        tracker={tracker}
        onChangeName={handleChangeName}
        onOpenDarts={() => navigate('darts')}
        onOpenGames={() => navigate('games')}
      />
    );
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
