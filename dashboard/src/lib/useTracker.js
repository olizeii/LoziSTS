import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { SERVER_URL } from '../config.js';

// Hält die Socket.io-Verbindung und den kompletten Server-State.
// onTick/onUndo werden nur für Live-Events aufgerufen (nicht beim initialen Laden).
export function useTracker({ onTick, onUndo }) {
  const [state, setState] = useState(null);
  const [connected, setConnected] = useState(false);
  const handlers = useRef({ onTick, onUndo });
  handlers.current = { onTick, onUndo };

  useEffect(() => {
    const socket = io(SERVER_URL, {
      query: { client: 'dashboard' },
      transports: ['websocket', 'polling'],
      reconnectionDelay: 1000,
      reconnectionDelayMax: 3000,
    });

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('state', (next) => setState(next));
    socket.on('tick', (payload) => {
      setState(payload.state);
      handlers.current.onTick?.(payload);
    });
    socket.on('undo', (payload) => {
      setState(payload.state);
      handlers.current.onUndo?.(payload);
    });

    return () => {
      socket.removeAllListeners();
      socket.close();
    };
  }, []);

  return { state, connected };
}
