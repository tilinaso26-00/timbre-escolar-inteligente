import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useToast } from '@shared/ui/Toast';
import { useAuth } from './useAuth';

interface DeviceStatus {
  connected: boolean;
  wifi: boolean;
  lastSync: string;
  deviceTime: string;
  nextEvent: { name: string; at: string; inMs: number } | null;
  lastBell: string | null;
  scheduledCount: number;
  relayState: boolean;
}

interface UseWebSocketReturn {
  socket: Socket | null;
  connected: boolean;
  deviceStatus: DeviceStatus | null;
  sendMessage: (event: string, data: unknown) => void;
  reconnect: () => void;
}

declare global {
  interface ImportMetaEnv {
    VITE_WS_URL?: string;
  }
  interface ImportMeta {
    env: ImportMetaEnv;
  }
}

const AUTH_TOKEN = 'timbre-escolar-2024';

export function useWebSocket(url?: string): UseWebSocketReturn {
  const { addToast } = useToast();
  const { token } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus | null>(null);
  const reconnectTimeoutRef = useRef<number>();
  const reconnectAttempts = useRef(0);

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    const socketUrl = url || (import.meta.env.VITE_WS_URL || 'http://localhost:81');
    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: false,
      timeout: 10000,
      auth: { token: token || AUTH_TOKEN }
    });

    socket.on('connect', () => {
      setConnected(true);
      reconnectAttempts.current = 0;
      addToast({ type: 'success', title: 'Conectado', message: 'ESP32 conectado correctamente', duration: 3000 });
    });

    socket.on('disconnect', (reason: string) => {
      setConnected(false);
      addToast({ type: 'warning', title: 'Desconectado', message: `ESP32 desconectado: ${reason}`, duration: 0 });
      scheduleReconnect();
    });

    socket.on('connect_error', () => {
      setConnected(false);
      scheduleReconnect();
    });

    socket.on('status', (status: DeviceStatus) => {
      setDeviceStatus(status);
    });

    socket.on('sync:progress', () => {
      // Could show progress toast
    });

    socket.on('sync:complete', (result: { version: number; hash: string }) => {
      addToast({ type: 'success', title: 'Sincronizado', message: `Horario sincronizado correctamente (v${result.version})` });
    });

    socket.on('sync:error', (error: string) => {
      addToast({ type: 'error', title: 'Error de sincronización', message: error, duration: 0 });
    });

    socket.on('bell:executed', (log: { eventName: string; timestamp: string }) => {
      addToast({ type: 'info', title: 'Timbre ejecutado', message: `${log.eventName} a las ${log.timestamp}` });
    });

    socket.on('bell:scheduled', () => {
      // Real-time next event update
    });

    socket.on('error', (code: string, message: string) => {
      addToast({ type: 'error', title: `Error ${code}`, message, duration: 0 });
    });

    socketRef.current = socket;
  }, [url, addToast, token]);

  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);

    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
    reconnectAttempts.current++;

    reconnectTimeoutRef.current = window.setTimeout(() => {
      connect();
    }, delay);
  }, [connect]);

  const sendMessage = useCallback((event: string, data: unknown) => {
    const payload = { ...data as object, token: token || AUTH_TOKEN };
    socketRef.current?.emit(event, payload);
  }, [token]);

  const reconnect = useCallback(() => {
    reconnectAttempts.current = 0;
    connect();
  }, [connect]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      socketRef.current?.disconnect();
    };
  }, [connect]);

  return {
    socket: socketRef.current,
    connected,
    deviceStatus,
    sendMessage,
    reconnect
  };
}