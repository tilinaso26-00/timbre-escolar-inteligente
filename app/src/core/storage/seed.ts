import { db } from './db';
import type {
  DayOfWeek,
  EventType,
  JourneySchedule,
  JourneyType,
  ScheduleEvent,
  ScheduleTemplate,
  TimeOnly,
} from '@core/schedule-engine';

const SCHOOL_DAYS: DayOfWeek[] = [1, 2, 3, 4, 5];
const BELL_SECONDS = 3;

type SeedRow = [name: string, type: EventType, start: string, bell: string, duration: number];

const MATUTINA_ROWS: SeedRow[] = [
  ['Entrada', 'entrada', '07:00', '07:00', 0],
  ['Fin 1er período', 'cambio_periodo', '07:00', '07:45', 45],
  ['Inicio recreo', 'recreo_inicio', '07:45', '07:46', 14],
  ['Fin recreo', 'recreo_fin', '08:00', '08:00', 0],
  ['Fin 2do período', 'cambio_periodo', '08:00', '08:45', 45],
  ['Inicio recreo', 'recreo_inicio', '08:45', '08:46', 14],
  ['Fin recreo', 'recreo_fin', '09:00', '09:00', 0],
  ['Fin 3er período', 'cambio_periodo', '09:00', '09:45', 45],
  ['Inicio recreo', 'recreo_inicio', '09:45', '09:46', 14],
  ['Fin recreo', 'recreo_fin', '10:00', '10:00', 0],
  ['Fin 4to período', 'cambio_periodo', '10:00', '10:45', 45],
  ['Inicio recreo', 'recreo_inicio', '10:45', '10:46', 14],
  ['Fin recreo', 'recreo_fin', '11:00', '11:00', 0],
  ['Fin 5to período', 'cambio_periodo', '11:00', '11:45', 45],
  ['Salida', 'salida', '11:45', '12:00', 15],
];

const VESPERTINA_ROWS: SeedRow[] = [
  ['Entrada', 'entrada', '12:45', '13:00', 15],
  ['Fin 1er período', 'cambio_periodo', '13:00', '13:45', 45],
  ['Inicio recreo', 'recreo_inicio', '13:45', '13:46', 14],
  ['Fin recreo', 'recreo_fin', '14:00', '14:00', 0],
  ['Fin 2do período', 'cambio_periodo', '14:00', '14:45', 45],
  ['Inicio recreo', 'recreo_inicio', '14:45', '14:46', 14],
  ['Fin recreo', 'recreo_fin', '15:00', '15:00', 0],
  ['Fin 3er período', 'cambio_periodo', '15:00', '15:45', 45],
  ['Inicio recreo', 'recreo_inicio', '15:45', '15:46', 14],
  ['Fin recreo', 'recreo_fin', '16:00', '16:00', 0],
  ['Fin 4to período', 'cambio_periodo', '16:00', '16:45', 45],
  ['Fin 5to período', 'cambio_periodo', '16:45', '17:30', 45],
  ['Salida', 'salida', '17:30', '17:45', 15],
];

const SHORT_ROWS: SeedRow[] = [
  ['Entrada', 'entrada', '07:00', '07:00', 0],
  ['Fin 1er período', 'cambio_periodo', '07:00', '08:00', 60],
  ['Inicio recreo', 'recreo_inicio', '08:00', '08:01', 14],
  ['Fin recreo', 'recreo_fin', '08:15', '08:15', 0],
  ['Fin 2do período', 'cambio_periodo', '08:15', '09:15', 60],
  ['Inicio recreo', 'recreo_inicio', '09:15', '09:16', 14],
  ['Fin recreo', 'recreo_fin', '09:30', '09:30', 0],
  ['Fin 3er período', 'cambio_periodo', '09:30', '10:30', 60],
  ['Salida', 'salida', '10:30', '11:00', 30],
];

function toTime(value: string): TimeOnly {
  const [hours, minutes] = value.split(':').map(Number);
  return { hours, minutes };
}

function createEvents(journey: JourneyType, rows: SeedRow[]): ScheduleEvent[] {
  const now = new Date().toISOString();
  return rows.map(([name, type, start, bell, duration], index) => ({
    id: `seed-${journey}-${index + 1}`,
    name,
    type,
    journey,
    startTime: toTime(start),
    bellTime: toTime(bell),
    durationMinutes: duration,
    bellDurationSeconds: BELL_SECONDS,
    activeDays: SCHOOL_DAYS,
    isFixed: false,
    periodIndex: index,
    createdAt: now,
    updatedAt: now,
  }));
}

function createJourney(
  journey: JourneyType,
  name: string,
  entry: string,
  exit: string,
  rows: SeedRow[]
): JourneySchedule {
  return {
    journey,
    name,
    entryTime: toTime(entry),
    exitTime: toTime(exit),
    defaultPeriodMinutes: 45,
    defaultBellSeconds: BELL_SECONDS,
    activeDays: SCHOOL_DAYS,
    events: createEvents(journey, rows),
    updatedAt: new Date().toISOString(),
  };
}

function createTemplate(
  id: string,
  name: string,
  description: string,
  journey: JourneyType,
  rows: SeedRow[]
): ScheduleTemplate {
  const now = new Date().toISOString();
  return {
    id,
    name,
    description,
    journey,
    events: createEvents(journey, rows).map(({ id: _id, createdAt: _c, updatedAt: _u, ...rest }) => rest),
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Siempre hay horarios de ejemplo en la primera ejecución para poder
 * probar la app sin hardware y sin crear todo a mano.
 */
export async function seedIfEmpty(): Promise<boolean> {
  const count = await db.journeys.count();
  if (count > 0) return false;

  const matutina = createJourney('matutina', 'Jornada Matutina', '07:00', '12:00', MATUTINA_ROWS);
  const vespertina = createJourney('vespertina', 'Jornada Vespertina', '13:00', '17:45', VESPERTINA_ROWS);

  await db.journeys.bulkPut([matutina, vespertina]);
  await db.templates.bulkPut([
    createTemplate('seed-normal', 'Horario Normal', 'Jornada completa con 5 períodos', 'matutina', MATUTINA_ROWS),
    createTemplate('seed-corto', 'Horario Corto', 'Días de examen: 3 períodos', 'matutina', SHORT_ROWS),
    createTemplate('seed-normal-ve', 'Horario Normal', 'Jornada completa con 5 períodos', 'vespertina', VESPERTINA_ROWS),
  ]);

  console.log('Semilla: horarios de ejemplo creados');
  return true;
}
