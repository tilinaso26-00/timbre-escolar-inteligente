import type { ScheduleEvent, JourneySchedule } from './types';
import { formatTime } from './time-utils';

export interface PreviewEvent {
  name: string;
  time: string;
  type: string;
  duration?: string;
}

export function generatePreview(journey: JourneySchedule): PreviewEvent[] {
  return journey.events
    .filter(e => e.activeDays.length > 0)
    .sort((a, b) => a.bellTime.hours - b.bellTime.hours || a.bellTime.minutes - b.bellTime.minutes)
    .map(event => ({
      name: event.name,
      time: formatTime(event.bellTime),
      type: getEventTypeLabel(event.type),
      duration: event.durationMinutes > 0 ? `${event.durationMinutes} min` : undefined
    }));
}

export function generatePreviewFromEvents(events: ScheduleEvent[]): PreviewEvent[] {
  return events
    .filter(e => e.activeDays.length > 0)
    .sort((a, b) => a.bellTime.hours - b.bellTime.hours || a.bellTime.minutes - b.bellTime.minutes)
    .map(event => ({
      name: event.name,
      time: formatTime(event.bellTime),
      type: getEventTypeLabel(event.type),
      duration: event.durationMinutes > 0 ? `${event.durationMinutes} min` : undefined
    }));
}

export function formatPreviewText(journey: JourneySchedule): string {
  const preview = generatePreview(journey);
  return preview.map(e => `${e.time} — ${e.name}${e.duration ? ` (${e.duration})` : ''}`).join('\n');
}

function getEventTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    entrada: 'Entrada',
    salida: 'Salida',
    cambio_periodo: 'Cambio período',
    recreo_inicio: 'Recreo',
    recreo_fin: 'Fin recreo',
    actividad_especial: 'Actividad',
    manual: 'Manual'
  };
  return labels[type] || type;
}