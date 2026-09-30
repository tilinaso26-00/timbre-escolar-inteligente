export const TIMEZONE = 'America/Guatemala';

export type JourneyType = 'matutina' | 'vespertina';
export type EventType =
  | 'entrada'
  | 'salida'
  | 'cambio_periodo'
  | 'recreo_inicio'
  | 'recreo_fin'
  | 'actividad_especial'
  | 'manual';

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface TimeOnly {
  hours: number;
  minutes: number;
}

export interface ScheduleEvent {
  id: string;
  name: string;
  startTime: TimeOnly;
  durationMinutes: number;
  bellTime: TimeOnly;
  bellDurationSeconds: number;
  type: EventType;
  journey: JourneyType;
  activeDays: DayOfWeek[];
  isFixed: boolean;
  periodIndex?: number;
  templateId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface JourneySchedule {
  journey: JourneyType;
  name: string;
  entryTime: TimeOnly;
  exitTime: TimeOnly;
  defaultPeriodMinutes: number;
  defaultBellSeconds: number;
  activeDays: DayOfWeek[];
  events: ScheduleEvent[];
  updatedAt: string;
}

export interface ScheduleTemplate {
  id: string;
  name: string;
  description?: string;
  journey: JourneyType;
  events: Omit<ScheduleEvent, 'id' | 'createdAt' | 'updatedAt'>[];
  createdAt: string;
  updatedAt: string;
}

export interface CalendarException {
  id: string;
  date: string;
  journey: JourneyType;
  type: 'schedule' | 'no_classes' | 'custom';
  scheduleId?: string;
  customEvents?: ScheduleEvent[];
  name: string;
  description?: string;
  createdAt: string;
}

export interface DeviceConfig {
  deviceId: string;
  name: string;
  bellDefaultSeconds: number;
  bellMaxSeconds: number;
  timezone: string;
  ntpServers: string[];
  ntpSyncIntervalMinutes: number;
  wifi: {
    ssid: string;
    password: string;
    fallbackAP: boolean;
    apSSID: string;
    apPassword: string;
  };
  relay: {
    pin: number;
    activeLow: boolean;
    safetyMaxOnMs: number;
  };
  rtc: {
    enabled: boolean;
    i2cAddress: number;
    sdaPin: number;
    sclPin: number;
  };
  firmwareVersion: string;
  updatedAt: string;
}

export interface BellEventLog {
  id: string;
  timestamp: string;
  eventName: string;
  eventType: EventType;
  journey: JourneyType;
  triggeredBy: 'automatic' | 'manual' | 'demo' | 'test';
  executed: boolean;
  actualBellTime?: string;
  durationSeconds: number;
  deviceId: string;
  firmwareVersion: string;
}

export interface SyncPayload {
  version: number;
  hash: string;
  timestamp: string;
  deviceId: string;
  journeys: JourneySchedule[];
  templates: ScheduleTemplate[];
  exceptions: CalendarException[];
  deviceConfig: Partial<DeviceConfig>;
}