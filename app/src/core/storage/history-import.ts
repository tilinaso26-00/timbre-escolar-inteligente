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
    parsed.push(normalizeBellEvent(item as Record<string, unknown>));
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
