import { useEffect, useState } from 'react';
import { useToast } from '@shared/ui/Toast';
import { eventsRepo, importDeviceHistory, normalizeBellEvent } from '@core/storage';
import type { BellEventLog } from '@core/schedule-engine';

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
  mode?: string;
  apSSID?: string;
  apIP?: string;
  ip?: string;
  rssi?: number;
  staConnected?: boolean;
  historyCount?: number;
  uptime?: number;
  freeHeap?: number;
}

export interface UseWebSocketReturn {
  socket: WebSocket | null;
  connected: boolean;
  deviceStatus: DeviceStatus | null;
  endpoint: string;
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
const WS_URL_AUTO_KEY = 'timbre.wsUrlAuto';
const WS_TOKEN_STORAGE_KEY = 'timbre.wsToken';

// Orden en que la app busca el timbre:
// 1) red propia del ESP32 (IP directa — mDNS casi nunca funciona en Windows)
// 2) nombre mDNS (por si el host lo soporta)
// 3) PC local
const DISCOVERY_CANDIDATES = [
  'ws://192.168.4.1:81',
  'ws://TimbreEscolar.local:81',
  DEFAULT_WS_URL,
];
const CONNECT_TIMEOUT_MS = 3500;
const HISTORY_CHUNK_SIZE = 25;
const HISTORY_MAX_CHUNKS = 20;

function storedWsUrl(): string | null {
  try {
    const stored = localStorage.getItem(WS_URL_STORAGE_KEY);
    if (stored) return stored;
  } catch {
    /* localStorage no disponible */
  }
  const envUrl = import.meta.env.VITE_WS_URL as string | undefined;
  return envUrl || null;
}

function buildCandidates(): string[] {
  const manual = storedWsUrl();
  if (manual) return [manual];

  // Los candidatos fijos SIEMPRE van primero (192.168.4.1 antes que mDNS).
  // La URL auto-guardada solo se agrega al final como hint, nunca priorizada:
  // una versión vieja pudo haber guardado mDNS y quedarse en un loop muerto.
  const ordered: string[] = [...DISCOVERY_CANDIDATES];
  try {
    const auto = localStorage.getItem(WS_URL_AUTO_KEY);
    if (auto && !ordered.includes(auto)) ordered.push(auto);
  } catch {
    /* localStorage no disponible */
  }
  return ordered;
}

export function resolveWsUrl(): string {
  const candidates = buildCandidates();
  return candidates[0] || DEFAULT_WS_URL;
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

let moduleNotifier: NotifyFn | null = null;

function notifyToast(notification: WSNotification): void {
  if (moduleNotifier) moduleNotifier(notification);
}

interface BridgeState {
  connected: boolean;
  deviceStatus: DeviceStatus | null;
  endpoint: string;
}

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
    mode: typeof data.mode === 'string' ? data.mode : undefined,
    apSSID: typeof data.apSSID === 'string' ? data.apSSID : undefined,
    apIP: typeof data.apIP === 'string' ? data.apIP : undefined,
    ip: typeof data.ip === 'string' ? data.ip : undefined,
    rssi: typeof data.rssi === 'number' ? data.rssi : undefined,
    staConnected:
      typeof data.staConnected === 'boolean' ? data.staConnected : Boolean(data.wifi),
    historyCount: typeof data.historyCount === 'number' ? data.historyCount : undefined,
    uptime: typeof data.uptime === 'number' ? data.uptime : undefined,
    freeHeap: typeof data.freeHeap === 'number' ? data.freeHeap : undefined,
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

async function persistBellEvent(data: Record<string, unknown>): Promise<void> {
  try {
    const log: BellEventLog = normalizeBellEvent(data);
    await eventsRepo.put(log);
  } catch (error) {
    console.error('Error guardando evento de timbre:', error);
    notifyToast({
      type: 'error',
      title: 'No se pudo guardar el timbre',
      message: 'El historial local falló al guardar el evento.',
    });
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
  let candidates = buildCandidates();
  let candidateIdx = 0;
  let url = candidates[0] || DEFAULT_WS_URL;
  let attempts = 0;
  let retryTimer: number | null = null;
  let connectTimer: number | null = null;
  let timeSyncTimer: number | null = null;
  let historyBuffer: unknown[] = [];
  let historyOffset = 0;
  let historyChunks = 0;
  const listeners = new Set<Listener>();
  const state: BridgeState = { connected: false, deviceStatus: null, endpoint: url };

  const emit = (): void => {
    const snapshot: BridgeState = { ...state };
    listeners.forEach(listener => listener(snapshot));
  };

  const notify = (notification: WSNotification): void => {
    notifyToast(notification);
  };

  const clearRetry = (): void => {
    if (retryTimer !== null) {
      window.clearTimeout(retryTimer);
      retryTimer = null;
    }
  };

  const clearConnectTimer = (): void => {
    if (connectTimer !== null) {
      window.clearTimeout(connectTimer);
      connectTimer = null;
    }
  };

  const resetCandidates = (): void => {
    candidates = buildCandidates();
    candidateIdx = 0;
    url = candidates[0] || DEFAULT_WS_URL;
    state.endpoint = url;
  };

  // Devuelve true si queda otro sitio por probar (mDNS -> red propia -> PC)
  const advanceCandidate = (): boolean => {
    if (candidateIdx < candidates.length - 1) {
      candidateIdx += 1;
      url = candidates[candidateIdx];
      state.endpoint = url;
      return true;
    }
    return false;
  };

  const scheduleRetry = (): void => {
    if (retryTimer !== null || listeners.size === 0) return;
    resetCandidates();
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

  // --- Historial guardado en el ESP32 (se baja en chunks de 25) ---
  const requestHistory = (): void => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    historyChunks += 1;
    ws.send(
      JSON.stringify({
        event: 'history:request',
        data: { offset: historyOffset, limit: HISTORY_CHUNK_SIZE },
        token: resolveWsToken(),
      }),
    );
  };

  const startHistoryImport = (): void => {
    historyBuffer = [];
    historyOffset = 0;
    historyChunks = 0;
    requestHistory();
  };

  const finishHistoryImport = async (): Promise<void> => {
    const items = historyBuffer;
    historyBuffer = [];
    if (items.length === 0) return;
    try {
      const { received, added } = await importDeviceHistory(items);
      if (added > 0) {
        notify({
          type: 'success',
          title: 'Historial importado',
          message: `${added} evento${added === 1 ? '' : 's'} nuevo${added === 1 ? '' : 's'} del timbre (de ${received})`,
        });
      }
    } catch (error) {
      console.error('Error importando historial del dispositivo:', error);
      notify({
        type: 'error',
        title: 'No se pudo importar el historial',
        message: 'El historial del timbre no se pudo copiar a esta PC.',
      });
    }
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
      case 'history:events': {
        const items = Array.isArray(data.items) ? (data.items as unknown[]) : [];
        const total = typeof data.total === 'number' ? data.total : 0;
        const done = typeof data.done === 'boolean' ? data.done : undefined;
        historyBuffer.push(...items);
        historyOffset += items.length;
        // El firmware marca done=true en el último chunk; total es el respaldo
        const reachedTotal = total > 0 && historyOffset >= total;
        const hasMore =
          items.length > 0 &&
          done !== true &&
          !reachedTotal &&
          historyChunks < HISTORY_MAX_CHUNKS;
        if (hasMore) requestHistory();
        else void finishHistoryImport();
        break;
      }
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

  const closeCurrent = (): void => {
    clearConnectTimer();
    const socket = ws;
    ws = null;
    if (socket) {
      socket.onopen = null;
      socket.onmessage = null;
      socket.onclose = null;
      socket.onerror = null;
      try {
        socket.close();
      } catch {
        /* noop */
      }
    }
  };

  const open = (): void => {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    clearRetry();
    clearConnectTimer();
    state.endpoint = url;
    try {
      ws = new WebSocket(url);
    } catch {
      if (advanceCandidate()) open();
      else scheduleRetry();
      return;
    }

    const socket = ws;

    // Si en 2.5 s no abre, lo descartamos y probamos el siguiente candidato
    connectTimer = window.setTimeout(() => {
      connectTimer = null;
      if (ws === socket && socket.readyState === WebSocket.CONNECTING) {
        try {
          socket.close();
        } catch {
          /* noop */
        }
      }
    }, CONNECT_TIMEOUT_MS);

    socket.onopen = () => {
      clearConnectTimer();
      attempts = 0;
      state.connected = true;
      state.endpoint = url;
      if (!storedWsUrl()) {
        try {
          localStorage.setItem(WS_URL_AUTO_KEY, url);
        } catch {
          /* localStorage no disponible */
        }
      }
      emit();
      notify({
        type: 'success',
        title: 'Dispositivo conectado',
        message: url,
      });
      startTimeSync();
      startHistoryImport();
    };

    socket.onmessage = handleMessage;

    socket.onclose = () => {
      clearConnectTimer();
      const wasConnected = state.connected;
      if (ws === socket) ws = null;
      state.connected = false;
      emit();
      stopTimeSync();

      if (wasConnected) {
        notify({ type: 'warning', title: 'Dispositivo desconectado' });
        scheduleRetry();
      } else if (advanceCandidate()) {
        open();
      } else {
        scheduleRetry();
      }
    };

    socket.onerror = () => {
      /* onclose se encarga de reconectar */
    };
  };

  return {
    start: (nextUrl?: string) => {
      if (nextUrl && nextUrl !== url) {
        closeCurrent();
        candidates = [nextUrl];
        candidateIdx = 0;
        url = nextUrl;
        clearRetry();
        state.connected = false;
        state.deviceStatus = null;
        state.endpoint = url;
        emit();
      }
      open();
    },
    subscribe: listener => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          clearRetry();
          clearConnectTimer();
        }
      };
    },
    registerNotifier: nextNotifier => {
      moduleNotifier = nextNotifier;
      return () => {
        if (moduleNotifier === nextNotifier) moduleNotifier = null;
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
      // "Buscar timbre": vuelve a recorrer mDNS -> red propia -> PC local
      attempts = 0;
      clearRetry();
      closeCurrent();
      resetCandidates();
      state.connected = false;
      emit();
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
  const cleanUrl = url.trim();
  const cleanToken = token.trim() || AUTH_TOKEN;
  try {
    if (cleanUrl) {
      localStorage.setItem(WS_URL_STORAGE_KEY, cleanUrl);
    } else {
      // Vacío = volver a autodescubrir el timbre
      localStorage.removeItem(WS_URL_STORAGE_KEY);
      localStorage.removeItem(WS_URL_AUTO_KEY);
    }
  } catch {
    /* localStorage no disponible */
  }
  try {
    localStorage.setItem(WS_TOKEN_STORAGE_KEY, cleanToken);
  } catch {
    /* localStorage no disponible */
  }
  bridge.reconnect();
}

export function useWebSocket(url?: string): UseWebSocketReturn {
  const { addToast } = useToast();
  const [connected, setConnected] = useState(() => bridge.getState().connected);
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus | null>(
    () => bridge.getState().deviceStatus
  );
  const [socket, setSocket] = useState<WebSocket | null>(() => bridge.getSocket());
  const [endpoint, setEndpoint] = useState<string>(() => bridge.getState().endpoint);

  useEffect(() => {
    const unregisterNotifier = bridge.registerNotifier(notification => addToast(notification));
    const unsubscribe = bridge.subscribe(next => {
      setConnected(next.connected);
      setDeviceStatus(next.deviceStatus);
      setSocket(bridge.getSocket());
      setEndpoint(next.endpoint);
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
    endpoint,
    sendMessage,
    reconnect,
  };
}
