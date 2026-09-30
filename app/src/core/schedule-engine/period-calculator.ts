import type { ScheduleEvent, JourneySchedule, TimeOnly } from './types';
import { timeToMinutes, minutesToTime, compareTime } from './time-utils';

export interface PeriodCalculationInput {
  journey: JourneySchedule;
  newPeriodMinutes: number;
  changedEventId?: string;
}

export interface PeriodCalculationResult {
  events: ScheduleEvent[];
  warnings: string[];
}

export function recalculatePeriods(input: PeriodCalculationInput): PeriodCalculationResult {
  const { journey, newPeriodMinutes } = input;
  const warnings: string[] = [];
  const resultEvents: ScheduleEvent[] = [];

  const sortedEvents = [...journey.events].sort((a, b) => compareTime(a.bellTime, b.bellTime));

  let currentTime = journey.entryTime;
  let periodIndex = 0;

  for (const event of sortedEvents) {
    if (event.isFixed) {
      resultEvents.push({ ...event });
      currentTime = addMinutesWithRollback(event.bellTime, event.bellDurationSeconds);
      continue;
    }

    if (event.type === 'entrada') {
      resultEvents.push({
        ...event,
        bellTime: journey.entryTime,
        startTime: journey.entryTime,
      });
      currentTime = journey.entryTime;
      continue;
    }

    if (event.type === 'salida') {
      const newExitTime = minutesToTime(
        timeToMinutes(journey.entryTime) +
        calculateTotalDuration(journey, newPeriodMinutes)
      );
      resultEvents.push({
        ...event,
        bellTime: newExitTime,
        startTime: newExitTime,
      });
      continue;
    }

    if (event.type === 'recreo_inicio') {
      const recessStart = calculateRecessStart(journey, newPeriodMinutes, periodIndex);
      resultEvents.push({
        ...event,
        bellTime: recessStart,
        startTime: recessStart,
      });
      currentTime = recessStart;
      continue;
    }

    if (event.type === 'recreo_fin') {
      const recessEnd = addMinutesWithRollback(currentTime, 30);
      resultEvents.push({
        ...event,
        bellTime: recessEnd,
        startTime: recessEnd,
      });
      currentTime = recessEnd;
      continue;
    }

    if (event.type === 'cambio_periodo' || event.type === 'actividad_especial') {
      const nextBellTime = addMinutesWithRollback(currentTime, newPeriodMinutes);
      resultEvents.push({
        ...event,
        bellTime: nextBellTime,
        startTime: nextBellTime,
        durationMinutes: newPeriodMinutes,
      });
      currentTime = nextBellTime;
      periodIndex++;
      continue;
    }

    resultEvents.push({ ...event });
  }

  return { events: resultEvents, warnings };
}

function calculateTotalDuration(journey: JourneySchedule, periodMinutes: number): number {
  let total = 0;
  let periodCount = 0;

  for (const event of journey.events) {
    if (event.isFixed) continue;
    if (event.type === 'entrada' || event.type === 'salida') continue;
    if (event.type === 'recreo_inicio' || event.type === 'recreo_fin') {
      total += 30;
      continue;
    }
    if (event.type === 'cambio_periodo' || event.type === 'actividad_especial') {
      total += periodMinutes;
      periodCount++;
    }
  }

  return total;
}

function calculateRecessStart(journey: JourneySchedule, periodMinutes: number, periodsBeforeRecess: number): TimeOnly {
  let minutes = timeToMinutes(journey.entryTime);
  let count = 0;

  for (const event of journey.events) {
    if (event.isFixed) continue;
    if (event.type === 'recreo_inicio') break;
    if (event.type === 'cambio_periodo' || event.type === 'actividad_especial') {
      if (count >= periodsBeforeRecess) break;
      minutes += periodMinutes;
      count++;
    }
  }

  return minutesToTime(minutes);
}

function addMinutesWithRollback(time: TimeOnly, seconds: number): TimeOnly {
  const minutes = Math.ceil(seconds / 60);
  return minutesToTime(timeToMinutes(time) + minutes);
}