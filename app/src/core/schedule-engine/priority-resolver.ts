import type { JourneySchedule, ScheduleTemplate, CalendarException, ScheduleEvent } from './types';

export interface ResolvedSchedule {
  journey: 'matutina' | 'vespertina';
  date: string;
  events: ScheduleEvent[];
  source: 'exception' | 'date_schedule' | 'template' | 'journey' | 'default';
  sourceId?: string;
}

const nowISO = () => new Date().toISOString();

export function resolveScheduleForDate(
  date: string,
  journey: 'matutina' | 'vespertina',
  journeys: JourneySchedule[],
  templates: ScheduleTemplate[],
  exceptions: CalendarException[]
): ResolvedSchedule {
  const [year, month, day] = date.split('-').map(Number);
  const dayOfWeek = new Date(
    Number.isFinite(year) ? year : 1970,
    Number.isFinite(month) ? month - 1 : 0,
    Number.isFinite(day) ? day : 1
  ).getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;

  const specificException = exceptions.find(
    e => e.date === date && e.journey === journey
  );

  if (specificException) {
    if (specificException.type === 'no_classes') {
      return {
        journey,
        date,
        events: [],
        source: 'exception',
        sourceId: specificException.id
      };
    }

    if (specificException.type === 'custom' && specificException.customEvents) {
      return {
        journey,
        date,
        events: specificException.customEvents,
        source: 'exception',
        sourceId: specificException.id
      };
    }

    if (specificException.type === 'schedule' && specificException.scheduleId) {
      const template = templates.find(t => t.id === specificException.scheduleId);
      if (template) {
        return {
          journey,
          date,
          events: template.events.map((e, i) => ({ ...e, id: `evt-${date}-${i}`, createdAt: nowISO(), updatedAt: nowISO() })),
          source: 'exception',
          sourceId: specificException.id
        };
      }
    }
  }

  const dateSchedule = exceptions.find(
    e => e.date === date && e.journey === journey && e.type === 'schedule'
  );

  if (dateSchedule?.scheduleId) {
    const template = templates.find(t => t.id === dateSchedule.scheduleId);
    if (template) {
      return {
        journey,
        date,
        events: template.events.map((e, i) => ({ ...e, id: `evt-${date}-${i}`, createdAt: nowISO(), updatedAt: nowISO() })),
        source: 'date_schedule',
        sourceId: dateSchedule.id
      };
    }
  }

  const journeySchedule = journeys.find(j => j.journey === journey);
  if (journeySchedule && journeySchedule.events.length > 0) {
    return {
      journey,
      date,
      events: journeySchedule.events,
      source: 'journey'
    };
  }

  const dayTemplate = templates.find(
    t => t.journey === journey && t.events.some(e => e.activeDays.includes(dayOfWeek))
  );

  if (dayTemplate) {
    return {
      journey,
      date,
      events: dayTemplate.events.map((e, i) => ({ ...e, id: `evt-${date}-${i}`, createdAt: nowISO(), updatedAt: nowISO() })),
      source: 'template',
      sourceId: dayTemplate.id
    };
  }

  if (journeySchedule) {
    return {
      journey,
      date,
      events: journeySchedule.events,
      source: 'journey'
    };
  }

  return {
    journey,
    date,
    events: [],
    source: 'default'
  };
}

export function getActiveScheduleForNow(
  journeys: JourneySchedule[],
  templates: ScheduleTemplate[],
  exceptions: CalendarException[]
): ResolvedSchedule[] {
  const now = new Date();
  const dateStr = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');
  const results: ResolvedSchedule[] = [];

  for (const journey of journeys) {
    results.push(resolveScheduleForDate(dateStr, journey.journey, journeys, templates, exceptions));
  }

  return results;
}