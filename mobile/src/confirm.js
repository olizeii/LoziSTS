import { Alert, Platform } from 'react-native';

// Ja/Nein-Abfrage, die auch in der Browser-Vorschau funktioniert (Alert.alert ist dort wirkungslos)
export function confirmAction({ title, message, confirmText, destructive = false }) {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: 'Abbrechen', style: 'cancel', onPress: () => resolve(false) },
        { text: confirmText, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}
