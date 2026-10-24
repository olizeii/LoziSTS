import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { io } from 'socket.io-client';
import { SERVER_URL } from './config';

const ACK_TIMEOUT_MS = 6000;

// Socket.io-Verbindung zum Backend + aktueller Server-State
export function useTracker() {
  const [state, setState] = useState(null);
  const [status, setStatus] = useState('connecting'); // 'connected' | 'connecting' | 'offline'
  const [lastError, setLastError] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!SERVER_URL) return undefined;

    const socket = io(SERVER_URL, {
      transports: ['websocket'],
      query: { client: 'mobile' },
      reconnectionDelay: 1000,
      reconnectionDelayMax: 4000,
      timeout: 6000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setStatus('connected');
      setLastError(null);
    });
    socket.on('disconnect', () => setStatus('connecting'));
    socket.on('connect_error', (err) => {
      setStatus('offline');
      setLastError(err.message);
    });
    socket.on('state', (next) => setState(next));
    socket.on('tick', (payload) => setState(payload.state));
    socket.on('undo', (payload) => setState(payload.state));

    // Nach dem Aufwecken des Handys sofort neu verbinden statt auf den Backoff zu warten
    const subscription = AppState.addEventListener('change', (appState) => {
      if (appState === 'active' && !socket.connected) socket.connect();
    });

    return () => {
      subscription.remove();
      socket.removeAllListeners();
      socket.close();
      socketRef.current = null;
    };
  }, []);

  const emit = useCallback(async (event, payload) => {
    const socket = socketRef.current;
    if (!socket?.connected) return { ok: false, error: 'Keine Verbindung zum Server' };
    try {
      return await socket.timeout(ACK_TIMEOUT_MS).emitWithAck(event, payload);
    } catch {
      return { ok: false, error: 'Server antwortet nicht – nochmal versuchen' };
    }
  }, []);

  const tick = useCallback((name, challengeId) => emit('tick', { name, challengeId }), [emit]);
  const undo = useCallback((name) => emit('undo', { name }), [emit]);

  return { state, status, lastError, tick, undo };
}
