import { Platform } from 'react-native';

// Werte kommen aus mobile/.env (müssen als process.env.EXPO_PUBLIC_… direkt angesprochen werden)
const SERVER_IP = process.env.EXPO_PUBLIC_SERVER_IP?.trim();
const SERVER_PORT = process.env.EXPO_PUBLIC_SERVER_PORT?.trim() || '3000';

// Browser-Version (http://<server>:3000/app): ohne .env-Eintrag einfach den Server nehmen, von dem die Seite kommt
const WEB_ORIGIN = Platform.OS === 'web' && !SERVER_IP ? window.location.origin : null;

export const SERVER_ADDRESS = SERVER_IP ? `${SERVER_IP}:${SERVER_PORT}` : WEB_ORIGIN?.replace(/^https?:\/\//, '') ?? null;
export const SERVER_URL = SERVER_IP ? `http://${SERVER_IP}:${SERVER_PORT}` : WEB_ORIGIN;

export const MAX_NAME_LENGTH = 24;
