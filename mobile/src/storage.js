import AsyncStorage from '@react-native-async-storage/async-storage';

const NAME_KEY = 'lan-tracker:name';

export async function loadName() {
  const value = await AsyncStorage.getItem(NAME_KEY);
  return value?.trim() || null;
}

export async function saveName(name) {
  await AsyncStorage.setItem(NAME_KEY, name);
}

export async function clearName() {
  await AsyncStorage.removeItem(NAME_KEY);
}
