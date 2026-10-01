import { useEffect, useState } from 'react';
import { useToast } from '@shared/ui/Toast';
import { eventsRepo } from '@core/storage';
import type { BellEventLog, EventType, JourneyType } from '@core/schedule-engine';

export interface DeviceStatus {
  connected: boolean;
  wifi: boolean;
  lastSync: string;
  deviceTime: string;
  nextEvent: {
    name: string;
    at: string;
    inMs: number;
  } | null;
  lastBell: string | null;
  scheduledCount: number;
  relayState: boolean;
}

export interface UseWebSocketReturn {
  socket: WebSocket | null;
  connected: boolean;
  deviceStatus: DeviceStatus | null;
  sendMessage: (event: string, data?: Record<string, unknown>) => void;
  reconnect: () => void;
}

export interface WSNotification {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
}

const AUTH_TOKEN = 'timbre-escolar-2024';
const DEFAULT_WS_URL = 'ws://localhost:81';
const WS_URL_STORAGE_KEY = 'timbre.wsUrl';
const WS_TOKEN_STORAGE_KEY = 'timbre.wsToken';

export function resolveWsUrl(): string {
  try {
    const stored = localStorage.getItem(WS_URL_STORAGE_KEY);
    if (stored) return stored;
  } catch {
    /* localStorage no disponible */
  }
  return (import.meta.env.VITE_WS_URL as string | undefined) || DEFAULT_WS_URL;
}

export function resolveWsToken(): string {
  try {
    const stored = localStorage.getItem(WS_TOKEN_STORAGE_KEY);
    if (stored) return stored;
  } catch {
    /* localStorage no disponible */
  }
  return (import.meta.env.VITE_WS_TOKEN as string | undefined) || AUTH_TOKEN;
}

type Listener = (state: BridgeState) => void;
type NotifyFn = (notification: WSNotification) => void;

interface BridgeState {
  connected: boolean;
  deviceStatus: DeviceStatus | null;
}

const EVENT_TYPES: EventType[] = [
  'entrada',
  'salida',
  'cambio_periodo',
  'recreo_inicio',
  'recreo_fin',
  'actividad_especial',
  'manual',
];

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function normalizeNextEvent(value: unknown): DeviceStatus['nextEvent'] {
  if (typeof value === 'string') {
    const match = value.match(/(\d{1,2}):(\d{2})/);
    if (!match) return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    const target = new Date();
    target.setHours(hours, minutes, 0, 0);
    const inMs = target.getTime() - Date.now();
    if (inMs < 0) return null;
    return { name: value, at: `${pad(hours)}:${pad(minutes)}`, inMs };
  }
  if (value && typeof value === 'object') {
    const raw = value as Record<string, unknown>;
    const name = typeof raw.name === 'string' ? raw.name : null;
    if (!name) return null;
    const at = typeof raw.at === 'string' ? raw.at : '';
    const inMs = typeof raw.inMs === 'number' ? raw.inMs : 0;
    return { name, at, inMs };
  }
  return null;
}

function normalizeLastSync(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && value > 0) {
    const ms = value > 1e12 ? value : value * 1000;
    return new Date(ms).toISOString();
  }
  return '';
}

function normalizeStatus(data: Record<string, unknown>): DeviceStatus {
  return {
    connected: Boolean(data.connected ?? true),
    wifi: Boolean(data.wifi),
    lastSync: normalizeLastSync(data.lastSync),
    deviceTime: typeof data.deviceTime === 'string' ? data.deviceTime : '--:--:--',
    nextEvent: normalizeNextEvent(data.nextEvent),
    lastBell: typeof data.lastBell === 'string' ? data.lastBell : null,
    scheduledCount: typeof data.scheduledCount === 'number' ? data.scheduledCount : 0,
    relayState: Boolean(data.relayState),
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

async function persistBellEvent(data: Record<string, unknown>): Promise<void> {
  try {
    const timestamp =
      typeof data.timestamp === 'string' && data.timestamp ? data.timestamp : new Date().toISOString();
    const eventTypeRaw = typeof data.eventType === 'string' ? data.eventType : '';
    const eventType = (EVENT_TYPES as string[]).includes(eventTypeRaw)
      ? (eventTypeRaw as EventType)
      : 'cambio_periodo';
    const journey: JourneyType = data.journey === 'vespertina' ? 'vespertina' : 'matutina';
    const triggeredByRaw = typeof data.triggeredBy === 'string' ? data.triggeredBy : '';
    const triggeredBy: BellEventLog['triggeredBy'] =
      triggeredByRaw === 'manual' || triggeredByRaw === 'demo' || triggeredByRaw === 'test'
        ? triggeredByRaw
        : 'automatic';
    const duration = Number(data.durationSeconds ?? data.durationSec ?? 3);

    const log: BellEventLog = {
      id: `${timestamp}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp,
      eventName: typeof data.eventName === 'string' && data.eventName ? data.eventName : 'Timbre',
      eventType,
      journey,
      triggeredBy,
      executed: data.executed === undefined ? true : Boolean(data.executed),
      actualBellTime:
        typeof data.actualBellTime === 'string' ? data.actualBellTime : undefined,
      durationSeconds: Number.isFinite(duration) && duration > 0 ? duration : 3,
      deviceId: typeof data.deviceId === 'string' && data.deviceId ? data.deviceId : 'ESP32',
      firmwareVersion:
        typeof data.firmwareVersion === 'string' && data.firmwareVersion
          ? data.firmwareVersion
          : '1.0.0',
    };

    await eventsRepo.put(log);
  } catch (error) {
    console.error('Error guardando evento de timbre:', error);
  }
}

interface Bridge {
  start: (url?: string) => void;
  subscribe: (listener: Listener) => () => void;
  registerNotifier: (notifier: NotifyFn) => () => void;
  send: (event: string, data?: Record<string, unknown>) => boolean;
  reconnect: () => void;
  getState: () => BridgeState;
  getSocket: () => WebSocket | null;
}

function createBridge(): Bridge {
  let ws: WebSocket | null = null;
  let url = resolveWsUrl();
  let attempts = 0;
  let retryTimer: number | null = null;
  let timeSyncTimer: number | null = null;
  let notifier: NotifyFn | null = null;
  const listeners = new Set<Listener>();
  const state: BridgeState = { connected: false, deviceStatus: null };

  const emit = (): void => {
    const snapshot: BridgeState = { ...state };
    listeners.forEach(listener => listener(snapshot));
  };

  const notify = (notification: WSNotification): void => {
    if (notifier) notifier(notification);
  };

  const clearRetry = (): void => {
    if (retryTimer !== null) {
      window.clearTimeout(retryTimer);
      retryTimer = null;
    }
  };

  const scheduleRetry = (): void => {
    if (retryTimer !== null || listeners.size === 0) return;
    const delay = Math.min(1000 * 2 ** attempts, 30000);
    attempts += 1;
    retryTimer = window.setTimeout(() => {
      retryTimer = null;
      open();
    }, delay);
  };

  // Hora local "YYYY-MM-DDTHH:MM:SS" (el ESP32 la interpreta como hora del colegio)
  const localTimestamp = (): string => {
    const now = new Date();
    const pad = (value: number): string => String(value).padStart(2, '0');
    return (
      `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
      `T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
    );
  };

  const sendTimeSync = (): void => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(
      JSON.stringify({
        event: 'time:sync',
        data: { timestamp: localTimestamp() },
        token: resolveWsToken(),
      }),
    );
  };

  const stopTimeSync = (): void => {
    if (timeSyncTimer !== null) {
      window.clearInterval(timeSyncTimer);
      timeSyncTimer = null;
    }
  };

  const startTimeSync = (): void => {
    stopTimeSync();
    sendTimeSync();
    timeSyncTimer = window.setInterval(sendTimeSync, 5 * 60 * 1000);
  };

  const handleMessage = (event: MessageEvent): void => {
    let payload: unknown;
    try {
      payload = JSON.parse(String(event.data));
    } catch {
      return;
    }
    const message = asRecord(payload);
    if (typeof message.event !== 'string') return;
    const data = asRecord(message.data);

    switch (message.event) {
      case 'status':
        state.deviceStatus = normalizeStatus(data);
        emit();
        break;
      case 'sync:complete':
        notify({
          type: 'success',
          title: 'Sincronización exitosa',
          message: `Horarios enviados al dispositivo (v${String(data.version ?? '')})`,
        });
        break;
      case 'sync:error':
        notify({
          type: 'error',
          title: 'Error de sincronización',
          message: typeof data.message === 'string' ? data.message : 'No se pudo sincronizar',
        });
        break;
      case 'bell:executed':
        void persistBellEvent(data);
        notify({
          type: 'info',
          title: 'Timbre ejecutado',
          message: typeof data.eventName === 'string' ? data.eventName : undefined,
        });
        break;
      case 'error':
        notify({
          type: 'error',
          title: 'Error del dispositivo',
          message:
            typeof message.message === 'string'
              ? message.message
              : typeof message.code === 'string'
                ? message.code
                : 'Error desconocido',
        });
        break;
      default:
        break;
    }
  };

  const open = (): void => {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    clearRetry();
    try {
      ws = new WebSocket(url);
    } catch {
      scheduleRetry();
      return;
    }

    ws.onopen = () => {
      attempts = 0;
      state.connected = true;
      emit();
      notify({ type: 'success', title: 'Dispositivo conectado' });
      startTimeSync();
    };

    ws.onmessage = handleMessage;

    ws.onclose = () => {
      const wasConnected = state.connected;
      ws = null;
      state.connected = false;
      emit();
      stopTimeSync();
      if (wasConnected) {
        notify({ type: 'warning', title: 'Dispositivo desconectado' });
      }
      scheduleRetry();
    };

    ws.onerror = () => {
      /* onclose se encarga de reconectar */
    };
  };

  return {
    start: (nextUrl?: string) => {
      if (nextUrl && nextUrl !== url) {
        url = nextUrl;
        clearRetry();
        ws?.close();
        ws = null;
        state.connected = false;
        state.deviceStatus = null;
        emit();
      }
      open();
    },
    subscribe: listener => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) clearRetry();
      };
    },
    registerNotifier: nextNotifier => {
      notifier = nextNotifier;
      return () => {
        if (notifier === nextNotifier) notifier = null;
      };
    },
    send: (event, data) => {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        notify({
          type: 'warning',
          title: 'Sin conexión',
          message: 'No hay conexión con el dispositivo',
        });
        return false;
      }
      const body = asRecord(data);
      ws.send(JSON.stringify({ event, data: body, token: resolveWsToken() }));
      return true;
    },
    reconnect: () => {
      attempts = 0;
      clearRetry();
      ws?.close();
      ws = null;
      open();
    },
    getState: () => ({ ...state }),
    getSocket: () => ws,
  };
}

const bridge = createBridge();

export function getWsEndpoint(): { url: string; token: string } {
  return { url: resolveWsUrl(), token: resolveWsToken() };
}

export function configureWsEndpoint(url: string, token: string): void {
  const previousUrl = resolveWsUrl();
  const cleanUrl = url.trim() || DEFAULT_WS_URL;
  const cleanToken = token.trim() || AUTH_TOKEN;
  try {
    localStorage.setItem(WS_URL_STORAGE_KEY, cleanUrl);
  } catch {
    /* localStorage no disponible */
  }
  try {
    localStorage.setItem(WS_TOKEN_STORAGE_KEY, cleanToken);
  } catch {
    /* localStorage no disponible */
  }
  if (cleanUrl === previousUrl) bridge.reconnect();
  else bridge.start(cleanUrl);
}

export function useWebSocket(url?: string): UseWebSocketReturn {
  const { addToast } = useToast();
  const [connected, setConnected] = useState(() => bridge.getState().connected);
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus | null>(
    () => bridge.getState().deviceStatus
  );
  const [socket, setSocket] = useState<WebSocket | null>(() => bridge.getSocket());

  useEffect(() => {
    const unregisterNotifier = bridge.registerNotifier(notification => addToast(notification));
    const unsubscribe = bridge.subscribe(next => {
      setConnected(next.connected);
      setDeviceStatus(next.deviceStatus);
      setSocket(bridge.getSocket());
    });
    bridge.start(url);

    return () => {
      unsubscribe();
      unregisterNotifier();
    };
  }, [addToast, url]);

  const sendMessage = (event: string, data?: Record<string, unknown>): void => {
    bridge.send(event, data);
  };

  const reconnect = (): void => {
    bridge.reconnect();
  };

  return {
    socket,
    connected,
    deviceStatus,
    sendMessage,
    reconnect,
  };
}
