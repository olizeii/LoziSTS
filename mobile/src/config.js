// Werte kommen aus mobile/.env (müssen als process.env.EXPO_PUBLIC_… direkt angesprochen werden)
const SERVER_IP = process.env.EXPO_PUBLIC_SERVER_IP?.trim();
const SERVER_PORT = process.env.EXPO_PUBLIC_SERVER_PORT?.trim() || '3000';

export const SERVER_ADDRESS = SERVER_IP ? `${SERVER_IP}:${SERVER_PORT}` : null;
export const SERVER_URL = SERVER_ADDRESS ? `http://${SERVER_ADDRESS}` : null;

export const MAX_NAME_LENGTH = 24;
