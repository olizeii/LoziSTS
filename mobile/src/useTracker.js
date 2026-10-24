import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { io } from 'socket.io-client';
import { SERVER_URL } from './config';

const ACK_TIMEOUT_MS = 6000;

// Socket.io-Verbindung zum Backend + aktueller Server-State + Dart-Spielstände
export function useTracker() {
  const [state, setState] = useState(null);
  const [games, setGames] = useState({});
  const [status, setStatus] = useState('connecting'); // 'connected' | 'connecting' | 'offline'
  const [lastError, setLastError] = useState(null);
  // Zählt hoch, wenn ein Admin alles zurückgesetzt hat (App springt dann zum Startscreen)
  const [resetCount, setResetCount] = useState(0);
  const socketRef = useRef(null);

  const storeGame = useCallback((game) => {
    if (game) setGames((prev) => ({ ...prev, [game.id]: game }));
  }, []);

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

    const applyState = (next) => {
      setState(next);
      const active = next?.darts?.activeGames ?? [];
      if (active.length) {
        setGames((prev) => {
          const merged = { ...prev };
          for (const game of active) merged[game.id] = game;
          return merged;
        });
      }
    };

    socket.on('connect', () => {
      setStatus('connected');
      setLastError(null);
    });
    socket.on('disconnect', () => setStatus('connecting'));
    socket.on('connect_error', (err) => {
      setStatus('offline');
      setLastError(err.message);
    });
    socket.on('state', applyState);
    socket.on('tick', (payload) => applyState(payload.state));
    socket.on('undo', (payload) => applyState(payload.state));
    socket.on('darts:game', storeGame);
    socket.on('game', (payload) => applyState(payload.state));
    socket.on('admin:reset', () => {
      setGames({});
      setResetCount((n) => n + 1);
    });

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
  }, [storeGame]);

  const emit = useCallback(async (event, payload) => {
    const socket = socketRef.current;
    if (!socket?.connected) return { ok: false, error: 'Keine Verbindung zum Server' };
    try {
      return await socket.timeout(ACK_TIMEOUT_MS).emitWithAck(event, payload);
    } catch {
      return { ok: false, error: 'Server antwortet nicht – nochmal versuchen' };
    }
  }, []);

  // Ergebnis mit Spielstand gleich lokal übernehmen (nicht auf den Broadcast warten)
  const emitGame = useCallback(
    async (event, payload) => {
      const res = await emit(event, payload);
      if (res.ok) storeGame(res.game);
      return res;
    },
    [emit, storeGame],
  );

  const tick = useCallback((name, challengeId) => emit('tick', { name, challengeId }), [emit]);
  const undo = useCallback((name) => emit('undo', { name }), [emit]);
  const adminReset = useCallback((name, token) => emit('admin:reset', { name, token }), [emit]);

  const darts = useMemo(
    () => ({
      submitTurn: (name, { gameId = null, player = null, darts: thrown }) =>
        emitGame('darts:turn', { name, gameId, player, darts: thrown }),
      undoTurn: (name, gameId = null) => emitGame('darts:undo', { name, gameId }),
      createGame: (name, { players, startScore, doubleOut }) =>
        emitGame('darts:createGame', { name, players, startScore, doubleOut }),
      abortGame: (name, gameId) => emitGame('darts:abortGame', { name, gameId }),
      fetchGame: (gameId) => emitGame('darts:game', { gameId }),
      fetchHistory: (name) => emit('darts:history', { name }),
    }),
    [emit, emitGame],
  );

  // Games (Seite 2/3 auf dem TV)
  const gamesApi = useMemo(
    () => ({
      addEntry: (name, gameId, value, item = null) => emit('games:entry', { name, gameId, value, item }),
      undoEntry: (name, gameId) => emit('games:undo', { name, gameId }),
      fetchHistory: (gameId) => emit('games:history', { gameId }),
    }),
    [emit],
  );

  return { state, games, status, lastError, resetCount, tick, undo, adminReset, darts, gamesApi };
}
