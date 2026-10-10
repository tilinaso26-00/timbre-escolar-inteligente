import { db } from './db';
import type { BellEventLog, EventType, JourneyType } from '@core/schedule-engine';

const EVENT_TYPES: EventType[] = [
  'entrada',
  'salida',
  'cambio_periodo',
  'recreo_inicio',
  'recreo_fin',
  'actividad_especial',
  'manual',
];

// Clave estable del evento: el mismo timbre del ESP32 nunca se duplica
// (venga en vivo por WebSocket o desde el historial del dispositivo).
export function bellEventKey(event: Pick<BellEventLog, 'deviceId' | 'timestamp' | 'eventName' | 'triggeredBy'>): string {
  return `${event.deviceId}|${event.timestamp}|${event.eventName}|${event.triggeredBy}`;
}

export function normalizeBellEvent(data: Record<string, unknown>): BellEventLog {
  const timestamp =
    typeof data.timestamp === 'string' && data.timestamp ? data.timestamp : new Date().toISOString();
  // El ESP32 guarda history.type / history.origin; el evento en vivo
  // (bell:executed) trae eventType / triggeredBy. Se aceptan ambos nombres.
  const eventTypeRaw =
    typeof data.eventType === 'string' && data.eventType
      ? data.eventType
      : typeof data.type === 'string'
        ? data.type
        : '';
  const eventType = (EVENT_TYPES as string[]).includes(eventTypeRaw)
    ? (eventTypeRaw as EventType)
    : 'cambio_periodo';
  const journey: JourneyType = data.journey === 'vespertina' ? 'vespertina' : 'matutina';
  const triggeredByRaw =
    typeof data.triggeredBy === 'string' && data.triggeredBy
      ? data.triggeredBy
      : typeof data.origin === 'string'
        ? data.origin
        : '';
  const triggeredBy: BellEventLog['triggeredBy'] =
    triggeredByRaw === 'manual' || triggeredByRaw === 'demo' || triggeredByRaw === 'test'
      ? triggeredByRaw
      : 'automatic';
  const duration = Number(data.durationSeconds ?? data.durationSec ?? 3);

  const event: BellEventLog = {
    id: '',
    timestamp,
    eventName:
      typeof data.eventName === 'string' && data.eventName ? data.eventName : 'Timbre',
    eventType,
    journey,
    triggeredBy,
    executed: data.executed === undefined ? true : Boolean(data.executed),
    actualBellTime:
      typeof data.actualBellTime === 'string' && data.actualBellTime
        ? data.actualBellTime
        : undefined,
    durationSeconds: Number.isFinite(duration) && duration > 0 ? duration : 3,
    deviceId: typeof data.deviceId === 'string' && data.deviceId ? data.deviceId : 'ESP32',
    firmwareVersion:
      typeof data.firmwareVersion === 'string' && data.firmwareVersion
        ? data.firmwareVersion
        : '1.0.0',
  };

  if (!event.actualBellTime && timestamp.includes('T')) {
    event.actualBellTime = timestamp.slice(timestamp.indexOf('T') + 1, 19);
  }

  event.id = bellEventKey(event);
  return event;
}

// "2026-10-09T07:00:00" (con o sin milisegundos); descarta "" y "----/--/--..."
const TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

export function isValidDeviceTimestamp(value: unknown): value is string {
  return typeof value === 'string' && TIMESTAMP_RE.test(value);
}

export interface HistoryImportResult {
  received: number;
  added: number;
}

// Importa eventos guardados en el ESP32; ignora los que ya existen
export async function importDeviceHistory(items: unknown[]): Promise<HistoryImportResult> {
  const received = items.length;
  if (received === 0) return { received: 0, added: 0 };

  const parsed: BellEventLog[] = [];
  for (const item of items) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const record = item as Record<string, unknown>;
    // Sin hora fiable del dispositivo no se puede deduplicar contra el evento
    // en vivo (la app ya lo guardó con su propia hora al recibirlo)
    if (!isValidDeviceTimestamp(record.timestamp)) continue;
    parsed.push(normalizeBellEvent(record));
  }
  if (parsed.length === 0) return { received, added: 0 };

  const timestamps = Array.from(new Set(parsed.map(e => e.timestamp)));
  const existing = await db.events.where('timestamp').anyOf(timestamps).toArray();
  const existingKeys = new Set(existing.map(e => bellEventKey(e)));
  const toInsert = parsed.filter(e => !existingKeys.has(bellEventKey(e)));

  if (toInsert.length > 0) {
    await db.events.bulkPut(toInsert);
  }
  return { received, added: toInsert.length };
}
