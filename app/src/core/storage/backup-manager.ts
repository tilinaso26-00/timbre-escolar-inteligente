import type {
  JourneySchedule,
  ScheduleTemplate,
  CalendarException,
  BellEventLog,
  DeviceConfig
} from '@core/schedule-engine';
import {
  journeysRepo,
  templatesRepo,
  exceptionsRepo,
  eventsRepo,
  configRepo
} from './db';

export interface BackupData {
  version: number;
  exportedAt: string;
  journeys: JourneySchedule[];
  templates: ScheduleTemplate[];
  exceptions: CalendarException[];
  events: BellEventLog[];
  config: DeviceConfig[];
}

export async function exportToJSON(): Promise<string> {
  const [journeys, templates, exceptions, events, config] = await Promise.all([
    journeysRepo.getAll(),
    templatesRepo.getAll(),
    exceptionsRepo.getAll(),
    eventsRepo.getAll(1000),
    configRepo.get()
  ]);

  const backup: BackupData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    journeys,
    templates,
    exceptions,
    events,
    config
  };

  return JSON.stringify(backup, null, 2);
}

export async function exportToCSV(): Promise<{ journeys: string; templates: string; exceptions: string; events: string }> {
  const [journeys, templates, exceptions, events] = await Promise.all([
    journeysRepo.getAll(),
    templatesRepo.getAll(),
    exceptionsRepo.getAll(),
    eventsRepo.getAll(1000)
  ]);

  const escape = (val: unknown) => `"${String(val ?? '').replace(/"/g, '""')}"`;

  const journeysCSV = [
    ['journey', 'name', 'entryTime', 'exitTime', 'defaultPeriodMinutes', 'defaultBellSeconds', 'activeDays', 'eventCount', 'updatedAt'],
    ...journeys.map(j => [
      j.journey,
      j.name,
      `${j.entryTime.hours}:${j.entryTime.minutes.toString().padStart(2, '0')}`,
      `${j.exitTime.hours}:${j.exitTime.minutes.toString().padStart(2, '0')}`,
      j.defaultPeriodMinutes,
      j.defaultBellSeconds,
      j.activeDays.join(','),
      j.events.length,
      j.updatedAt
    ].map(escape)).join(',')
  ].join('\n');

  const templatesCSV = [
    ['id', 'name', 'description', 'journey', 'eventCount', 'createdAt', 'updatedAt'],
    ...templates.map(t => [
      t.id, t.name, t.description ?? '', t.journey, t.events.length, t.createdAt, t.updatedAt
    ].map(escape)).join(',')
  ].join('\n');

  const exceptionsCSV = [
    ['id', 'date', 'journey', 'type', 'scheduleId', 'name', 'description', 'createdAt'],
    ...exceptions.map(e => [
      e.id, e.date, e.journey, e.type, e.scheduleId ?? '', e.name, e.description ?? '', e.createdAt
    ].map(escape)).join(',')
  ].join('\n');

  const eventsCSV = [
    ['id', 'timestamp', 'eventName', 'eventType', 'journey', 'triggeredBy', 'executed', 'durationSeconds', 'deviceId'],
    ...events.map(e => [
      e.id, e.timestamp, e.eventName, e.eventType, e.journey, e.triggeredBy, e.executed, e.durationSeconds, e.deviceId
    ].map(escape)).join(',')
  ].join('\n');

  return { journeys: journeysCSV, templates: templatesCSV, exceptions: exceptionsCSV, events: eventsCSV };
}

export async function importFromJSON(json: string): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = [];

  try {
    const backup: BackupData = JSON.parse(json);

    if (!backup.version || !backup.journeys || !backup.templates) {
      errors.push('Formato de backup inválido');
      return { success: false, errors };
    }

    await Promise.all([
      ...backup.journeys.map(j => journeysRepo.put(j)),
      ...backup.templates.map(t => templatesRepo.put(t)),
      ...backup.exceptions.map(e => exceptionsRepo.put(e)),
      ...backup.config.map(c => configRepo.put(c))
    ]);

    return { success: true, errors: [] };
  } catch (e) {
    errors.push(`Error al importar: ${e instanceof Error ? e.message : 'Error desconocido'}`);
    return { success: false, errors };
  }
}

export function downloadBackup(filename: string, content: string, type = 'application/json'): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function generateBackupFilename(prefix = 'timbre-escolar'): string {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
  const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '');
  return `${prefix}-${dateStr}-${timeStr}.json`;
}