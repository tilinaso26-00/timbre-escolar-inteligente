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

// v1 = seed de ejemplo original. v2 = horarios reales del colegio
// (matutina con 3 recreos escalonados y vespertina con los 3 provisionales).
const SEED_VERSION = 2;
const SEED_VERSION_KEY = 'timbre.seedVersion';

type SeedRow = [name: string, type: EventType, start: string, bell: string, duration: number];

// Matutina: Lun-Vie, entrada 07:00, salida 12:30.
// 8 períodos de 30 min (240) + 3 recreos de 30 min (90) = 330 min.
// Timbres: 07:00 07:30 08:00 08:30 09:00 09:30 10:00 10:30 11:00 11:30 12:00 12:30
const MATUTINA_ROWS: SeedRow[] = [
  ['Entrada', 'entrada', '07:00', '07:00', 0],
  ['Fin 1er período', 'cambio_periodo', '07:00', '07:30', 30],
  ['Fin 2do período', 'cambio_periodo', '07:30', '08:00', 30],
  ['Fin 3er período', 'cambio_periodo', '08:00', '08:30', 30],
  ['Inicio recreo (primaria pequeños)', 'recreo_inicio', '08:30', '09:00', 30],
  ['Cambio de recreo (primaria grandes)', 'recreo_inicio', '09:00', '09:30', 30],
  ['Cambio de recreo (básico)', 'recreo_inicio', '09:30', '10:00', 30],
  ['Fin de recreos', 'recreo_fin', '10:00', '10:30', 30],
  ['Fin 5to período', 'cambio_periodo', '10:30', '11:00', 30],
  ['Fin 6to período', 'cambio_periodo', '11:00', '11:30', 30],
  ['Fin 7mo período', 'cambio_periodo', '11:30', '12:00', 30],
  ['Salida', 'salida', '12:00', '12:30', 30],
];

// Vespertina oficial: Lun-Vie, entrada 13:00, recreo 15:00-15:25, salida 17:50.
// Timbres: 13:00 13:30 14:00 14:30 15:00 15:25 15:55 16:25 16:55 17:25 17:50
const VESPERTINA_ROWS: SeedRow[] = [
  ['Entrada', 'entrada', '13:00', '13:00', 0],
  ['Fin 1er período', 'cambio_periodo', '13:00', '13:30', 30],
  ['Fin 2do período', 'cambio_periodo', '13:30', '14:00', 30],
  ['Fin 3er período', 'cambio_periodo', '14:00', '14:30', 30],
  ['Inicio recreo', 'recreo_inicio', '14:30', '15:00', 30],
  ['Fin recreo', 'recreo_fin', '15:00', '15:25', 25],
  ['Fin 4to período', 'cambio_periodo', '15:25', '15:55', 30],
  ['Fin 5to período', 'cambio_periodo', '15:55', '16:25', 30],
  ['Fin 6to período', 'cambio_periodo', '16:25', '16:55', 30],
  ['Fin 7mo período', 'cambio_periodo', '16:55', '17:25', 30],
  ['Salida', 'salida', '17:25', '17:50', 25],
];

// Provicional A: períodos de 20 min antes del recreo y de 30 min después. Salida 17:50.
// Timbres: 13:00 13:20 13:40 14:00 14:20 14:40 15:00 15:25 15:55 16:25 16:55 17:25 17:50
const PROV_A_ROWS: SeedRow[] = [
  ['Entrada', 'entrada', '13:00', '13:00', 0],
  ['Fin 1er período', 'cambio_periodo', '13:00', '13:20', 20],
  ['Fin 2do período', 'cambio_periodo', '13:20', '13:40', 20],
  ['Fin 3er período', 'cambio_periodo', '13:40', '14:00', 20],
  ['Fin 4to período', 'cambio_periodo', '14:00', '14:20', 20],
  ['Fin 5to período', 'cambio_periodo', '14:20', '14:40', 20],
  ['Inicio recreo', 'recreo_inicio', '14:40', '15:00', 20],
  ['Fin recreo', 'recreo_fin', '15:00', '15:25', 25],
  ['Fin 6to período', 'cambio_periodo', '15:25', '15:55', 30],
  ['Fin 7mo período', 'cambio_periodo', '15:55', '16:25', 30],
  ['Fin 8vo período', 'cambio_periodo', '16:25', '16:55', 30],
  ['Fin 9no período', 'cambio_periodo', '16:55', '17:25', 30],
  ['Salida', 'salida', '17:25', '17:50', 25],
];

// Provicional B: períodos de 30 min antes del recreo y de 20 min después. Salida 17:50.
// Timbres: 13:00 13:30 14:00 14:30 15:00 15:25 15:45 16:05 16:25 16:45 17:05 17:25 17:50
const PROV_B_ROWS: SeedRow[] = [
  ['Entrada', 'entrada', '13:00', '13:00', 0],
  ['Fin 1er período', 'cambio_periodo', '13:00', '13:30', 30],
  ['Fin 2do período', 'cambio_periodo', '13:30', '14:00', 30],
  ['Fin 3er período', 'cambio_periodo', '14:00', '14:30', 30],
  ['Inicio recreo', 'recreo_inicio', '14:30', '15:00', 30],
  ['Fin recreo', 'recreo_fin', '15:00', '15:25', 25],
  ['Fin 4to período', 'cambio_periodo', '15:25', '15:45', 20],
  ['Fin 5to período', 'cambio_periodo', '15:45', '16:05', 20],
  ['Fin 6to período', 'cambio_periodo', '16:05', '16:25', 20],
  ['Fin 7mo período', 'cambio_periodo', '16:25', '16:45', 20],
  ['Fin 8vo período', 'cambio_periodo', '16:45', '17:05', 20],
  ['Fin 9no período', 'cambio_periodo', '17:05', '17:25', 20],
  ['Salida', 'salida', '17:25', '17:50', 25],
];

// Provicional C: todos los períodos de 20 min. Salida 17:50.
// Timbres: 13:00 13:20 13:40 14:00 14:20 14:40 15:00 15:25 15:45 16:05 16:25 16:45 17:05 17:25 17:50
const PROV_C_ROWS: SeedRow[] = [
  ['Entrada', 'entrada', '13:00', '13:00', 0],
  ['Fin 1er período', 'cambio_periodo', '13:00', '13:20', 20],
  ['Fin 2do período', 'cambio_periodo', '13:20', '13:40', 20],
  ['Fin 3er período', 'cambio_periodo', '13:40', '14:00', 20],
  ['Fin 4to período', 'cambio_periodo', '14:00', '14:20', 20],
  ['Fin 5to período', 'cambio_periodo', '14:20', '14:40', 20],
  ['Inicio recreo', 'recreo_inicio', '14:40', '15:00', 20],
  ['Fin recreo', 'recreo_fin', '15:00', '15:25', 25],
  ['Fin 6to período', 'cambio_periodo', '15:25', '15:45', 20],
  ['Fin 7mo período', 'cambio_periodo', '15:45', '16:05', 20],
  ['Fin 8vo período', 'cambio_periodo', '16:05', '16:25', 20],
  ['Fin 9no período', 'cambio_periodo', '16:25', '16:45', 20],
  ['Fin 10mo período', 'cambio_periodo', '16:45', '17:05', 20],
  ['Fin 11mo período', 'cambio_periodo', '17:05', '17:25', 20],
  ['Salida', 'salida', '17:25', '17:50', 25],
];

// Días de examen: 3 períodos de 60 min, salida 11:00.
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
  periodMinutes: number,
  rows: SeedRow[]
): JourneySchedule {
  return {
    journey,
    name,
    entryTime: toTime(entry),
    exitTime: toTime(exit),
    defaultPeriodMinutes: periodMinutes,
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

interface SeedData {
  journeys: JourneySchedule[];
  templates: ScheduleTemplate[];
}

function buildSeedData(): SeedData {
  return {
    journeys: [
      createJourney('matutina', 'Jornada Matutina', '07:00', '12:30', 30, MATUTINA_ROWS),
      createJourney('vespertina', 'Jornada Vespertina', '13:00', '17:50', 30, VESPERTINA_ROWS),
    ],
    templates: [
      createTemplate('seed-normal', 'Matutina Normal', 'Lun a Vie: 8 períodos de 30 min con 3 recreos escalonados, salida 12:30', 'matutina', MATUTINA_ROWS),
      createTemplate('seed-corto', 'Horario Corto', 'Días de examen: 3 períodos de 60 min, salida 11:00', 'matutina', SHORT_ROWS),
      createTemplate('seed-normal-ve', 'Vespertina Normal', 'Lun a Vie: recreo 15:00 a 15:25, salida 17:50', 'vespertina', VESPERTINA_ROWS),
      createTemplate('seed-prov-a', 'Provicional A', 'Antes del recreo períodos de 20 min, después de 30 min. Salida 17:50', 'vespertina', PROV_A_ROWS),
      createTemplate('seed-prov-b', 'Provicional B', 'Antes del recreo períodos de 30 min, después de 20 min. Salida 17:50', 'vespertina', PROV_B_ROWS),
      createTemplate('seed-prov-c', 'Provicional C', 'Todos los períodos de 20 min. Salida 17:50', 'vespertina', PROV_C_ROWS),
    ],
  };
}

// Plantillas del seed original (v1): se reemplazan en la migración a v2.
const LEGACY_SEED_TEMPLATE_IDS = ['seed-normal', 'seed-corto', 'seed-normal-ve'];

function readSeedVersion(): number {
  try {
    return Number(localStorage.getItem(SEED_VERSION_KEY) ?? '0') || 0;
  } catch {
    return 0;
  }
}

function writeSeedVersion(version: number): void {
  try {
    localStorage.setItem(SEED_VERSION_KEY, String(version));
  } catch {
    // sin localStorage seguimos funcionando (re-seedará en la próxima ejecución)
  }
}

let seedRun: Promise<boolean> | null = null;

/**
 * - Primera ejecución: crea los horarios de ejemplo del colegio.
 * - Migración (SEED_VERSION): reemplaza los horarios/plantillas de ejemplo por
 *   los reales. Solo toca las 2 jornadas estándar y los ids `seed-*`; todo lo
 *   creado por el usuario se conserva.
 */
export function seedIfEmpty(): Promise<boolean> {
  if (!seedRun) {
    seedRun = runSeed().catch(error => {
      console.error('Error en seed:', error);
      seedRun = null;
      return false;
    });
  }
  return seedRun;
}

async function runSeed(): Promise<boolean> {
  const version = readSeedVersion();
  const count = await db.journeys.count();
  const { journeys, templates } = buildSeedData();

  if (count === 0) {
    await db.journeys.bulkPut(journeys);
    await db.templates.bulkPut(templates);
    writeSeedVersion(SEED_VERSION);
    return true;
  }

  if (version >= SEED_VERSION) return false;

  await db.journeys.bulkPut(journeys);
  await db.templates.where('id').anyOf(LEGACY_SEED_TEMPLATE_IDS).delete();
  await db.templates.bulkPut(templates);
  writeSeedVersion(SEED_VERSION);
  console.info('Seed migrado a v' + SEED_VERSION + ': horarios reales del colegio');
  return true;
}
