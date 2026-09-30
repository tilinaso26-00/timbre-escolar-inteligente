import type { JourneySchedule, TimeOnly } from './types';
import { compareTime } from './time-utils';

export interface ValidationError {
  code: string;
  message: string;
  eventIds?: string[];
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export function validateSchedule(journey: JourneySchedule): ValidationResult {
  const errors: ValidationError[] = [];

  if (journey.events.length === 0) {
    errors.push({
      code: 'EMPTY_SCHEDULE',
      message: 'El horario no tiene eventos programados',
      severity: 'error'
    });
  }

  const sortedEvents = [...journey.events].sort((a, b) => compareTime(a.bellTime, b.bellTime));

  for (let i = 0; i < sortedEvents.length; i++) {
    const event = sortedEvents[i];

    if (!isTimeValid(event.bellTime)) {
      errors.push({
        code: 'INVALID_TIME',
        message: `Evento "${event.name}": hora de timbre inválida (${formatTime(event.bellTime)})`,
        eventIds: [event.id],
        severity: 'error'
      });
    }

    if (event.durationMinutes < 0) {
      errors.push({
        code: 'NEGATIVE_DURATION',
        message: `Evento "${event.name}": duración negativa (${event.durationMinutes} min)`,
        eventIds: [event.id],
        severity: 'error'
      });
    }

    if (event.bellDurationSeconds <= 0 || event.bellDurationSeconds > 3600) {
      errors.push({
        code: 'INVALID_BELL_DURATION',
        message: `Evento "${event.name}": duración de timbre inválida (${event.bellDurationSeconds} seg)`,
        eventIds: [event.id],
        severity: 'error'
      });
    }

    if (event.activeDays.length === 0) {
      errors.push({
        code: 'NO_ACTIVE_DAYS',
        message: `Evento "${event.name}": no tiene días activos seleccionados`,
        eventIds: [event.id],
        severity: 'warning'
      });
    }

    if (i > 0) {
      const prevEvent = sortedEvents[i - 1];
      if (compareTime(event.bellTime, prevEvent.bellTime) < 0) {
        errors.push({
          code: 'TIME_BEFORE_PREVIOUS',
          message: `Evento "${event.name}": hora anterior al evento previo "${prevEvent.name}"`,
          eventIds: [event.id, prevEvent.id],
          severity: 'error'
        });
      }

      if (compareTime(event.bellTime, prevEvent.bellTime) === 0) {
        errors.push({
          code: 'DUPLICATE_TIME',
          message: `Conflicto: "${event.name}" y "${prevEvent.name}" programados a la misma hora (${formatTime(event.bellTime)})`,
          eventIds: [event.id, prevEvent.id],
          severity: 'error'
        });
      }
    }
  }

  const entryEvent = sortedEvents.find(e => e.type === 'entrada');
  const exitEvent = sortedEvents.find(e => e.type === 'salida');

  if (entryEvent && exitEvent) {
    if (compareTime(exitEvent.bellTime, entryEvent.bellTime) <= 0) {
      errors.push({
        code: 'EXIT_BEFORE_ENTRY',
        message: 'La hora de salida debe ser posterior a la hora de entrada',
        eventIds: [entryEvent.id, exitEvent.id],
        severity: 'error'
      });
    }
  }

  const duplicateIds = sortedEvents
    .map(e => e.id)
    .filter((id, i, arr) => arr.indexOf(id) !== i);

  if (duplicateIds.length > 0) {
    errors.push({
      code: 'DUPLICATE_IDS',
      message: `IDs duplicados: ${duplicateIds.join(', ')}`,
      eventIds: duplicateIds,
      severity: 'error'
    });
  }

  return {
    valid: errors.filter(e => e.severity === 'error').length === 0,
    errors
  };
}

export function validateException(
  exception: { date: string; journey: 'matutina' | 'vespertina' },
  existingExceptions: Array<{ date: string; journey: 'matutina' | 'vespertina' }>
): ValidationResult {
  const errors: ValidationError[] = [];

  const duplicate = existingExceptions.find(
    e => e.date === exception.date && e.journey === exception.journey
  );

  if (duplicate) {
    errors.push({
      code: 'DUPLICATE_EXCEPTION_DATE',
      message: `Ya existe una excepción para ${exception.date} en jornada ${exception.journey}`,
      severity: 'error'
    });
  }

  const date = new Date(exception.date);
  if (isNaN(date.getTime())) {
    errors.push({
      code: 'INVALID_DATE',
      message: 'Fecha inválida',
      severity: 'error'
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

function isTimeValid(time: TimeOnly): boolean {
  return time.hours >= 0 && time.hours <= 23 && time.minutes >= 0 && time.minutes <= 59;
}

function formatTime(time: TimeOnly): string {
  return `${time.hours.toString().padStart(2, '0')}:${time.minutes.toString().padStart(2, '0')}`;
}