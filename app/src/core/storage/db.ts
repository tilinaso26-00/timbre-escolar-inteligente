import Dexie, { Table } from 'dexie';
import type {
  JourneySchedule,
  ScheduleTemplate,
  CalendarException,
  BellEventLog,
  DeviceConfig
} from '@core/schedule-engine';

export class TimbreDB extends Dexie {
  journeys!: Table<JourneySchedule, 'matutina' | 'vespertina'>;
  templates!: Table<ScheduleTemplate, string>;
  exceptions!: Table<CalendarException, string>;
  events!: Table<BellEventLog, string>;
  config!: Table<DeviceConfig, string>;
  syncQueue!: Table<SyncQueueItem, number>;

  constructor() {
    super('TimbreEscolarDB');
    this.version(1).stores({
      journeys: 'journey',
      templates: 'id, journey, name',
      exceptions: 'date, journey, type',
      events: 'timestamp, journey, eventType',
      config: 'deviceId',
      syncQueue: '++id, timestamp, type'
    });
  }
}

export interface SyncQueueItem {
  id?: number;
  type: 'schedule' | 'config' | 'manual_bell' | 'test_bell';
  payload: unknown;
  timestamp: string;
  retries: number;
  status: 'pending' | 'syncing' | 'completed' | 'failed';
}

export const db = new TimbreDB();

export async function initDB(): Promise<void> {
  await db.open();
}

const HISTORY_KEEP_DAYS = 180;
const HISTORY_MAX_ROWS = 5000;

export async function pruneHistory(): Promise<void> {
  const cutoff = new Date(Date.now() - HISTORY_KEEP_DAYS * 86_400_000).toISOString();
  await db.events.where('timestamp').below(cutoff).delete();

  const total = await db.events.count();
  if (total > HISTORY_MAX_ROWS) {
    const excess = total - HISTORY_MAX_ROWS;
    const oldestKeys = await db.events.orderBy('timestamp').limit(excess).primaryKeys();
    await db.events.bulkDelete(oldestKeys);
  }
}

export const journeysRepo = {
  getAll: () => db.journeys.toArray(),
  get: (journey: 'matutina' | 'vespertina') => db.journeys.get(journey),
  put: (journey: JourneySchedule) => db.journeys.put(journey),
  delete: (journey: 'matutina' | 'vespertina') => db.journeys.delete(journey)
};

export const templatesRepo = {
  getAll: () => db.templates.toArray(),
  getByJourney: (journey: 'matutina' | 'vespertina') =>
    db.templates.where('journey').equals(journey).toArray(),
  get: (id: string) => db.templates.get(id),
  put: (template: ScheduleTemplate) => db.templates.put(template),
  delete: (id: string) => db.templates.delete(id)
};

export const exceptionsRepo = {
  getAll: () => db.exceptions.toArray(),
  getByDate: (date: string) =>
    db.exceptions.where('date').equals(date).toArray(),
  getByDateAndJourney: (date: string, journey: 'matutina' | 'vespertina') =>
    db.exceptions.where('date').equals(date).and(e => e.journey === journey).first(),
  put: (exception: CalendarException) => db.exceptions.put(exception),
  delete: (id: string) => db.exceptions.delete(id),
  clearAll: () => db.exceptions.clear()
};

export const eventsRepo = {
  getAll: (limit = 100) =>
    db.events.orderBy('timestamp').reverse().limit(limit).toArray(),
  getByDateRange: (start: string, end: string) =>
    db.events.where('timestamp').between(start, end, true, true).toArray(),
  put: (event: BellEventLog) => db.events.put(event),
  bulkPut: (events: BellEventLog[]) => db.events.bulkPut(events),
  clearAll: () => db.events.clear(),
  clearBefore: (date: string) =>
    db.events.where('timestamp').below(date).delete()
};

export const configRepo = {
  get: () => db.config.toArray(),
  getByDeviceId: (deviceId: string) => db.config.get(deviceId),
  put: (config: DeviceConfig) => db.config.put(config)
};

export const syncQueueRepo = {
  getPending: () =>
    db.syncQueue.where('status').equals('pending').toArray(),
  add: (item: Omit<SyncQueueItem, 'id'>) =>
    db.syncQueue.add(item as SyncQueueItem),
  updateStatus: (id: number, status: SyncQueueItem['status']) =>
    db.syncQueue.update(id, { status }),
  incrementRetries: (id: number) =>
    db.syncQueue.update(id, { retries: 1 }),
  clearCompleted: () =>
    db.syncQueue.where('status').equals('completed').delete()
};