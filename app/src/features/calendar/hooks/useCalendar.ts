import { useState, useCallback, useMemo } from 'react';
import { addMonths, subMonths, startOfMonth, endOfMonth, format, startOfWeek, endOfWeek, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import type { JourneySchedule, ScheduleTemplate, CalendarException } from '@core/schedule-engine';
import { resolveScheduleForDate } from '@core/schedule-engine/priority-resolver';

export const EXCEPTION_TYPES = [
  { value: 'normal', label: 'Horario normal', description: 'Usa el horario base de la jornada', color: 'bg-green-100 text-green-700', icon: '📅' },
  { value: 'short', label: 'Horario corto', description: 'Períodos reducidos', color: 'bg-blue-100 text-blue-700', icon: '⏱️' },
  { value: 'long', label: 'Horario largo', description: 'Períodos extendidos', color: 'bg-purple-100 text-purple-700', icon: '⏳' },
  { value: 'exam', label: 'Horario de examen', description: 'Solo exámenes', color: 'bg-orange-100 text-orange-700', icon: '📝' },
  { value: 'activities', label: 'Horario de actividades', description: 'Actividades especiales', color: 'bg-pink-100 text-pink-700', icon: '🎭' },
  { value: 'no_classes', label: 'Sin clases', description: 'No suena el timbre', color: 'bg-red-100 text-red-700', icon: '🚫' },
  { value: 'custom', label: 'Personalizado', description: 'Eventos específicos para este día', color: 'bg-gray-100 text-gray-700', icon: '✏️' },
] as const;

export interface CalendarDayInfo {
  date: Date;
  dateStr: string;
  journey: 'matutina' | 'vespertina';
  exception: CalendarException | null;
  resolvedSource: 'exception' | 'date_schedule' | 'template' | 'journey' | 'default';
  resolvedTemplate: ScheduleTemplate | null;
  hasCustomEvents: boolean;
  isNoClasses: boolean;
}

export interface CalendarActions {
  goToMonth: (date: Date) => void;
  nextMonth: () => void;
  prevMonth: () => void;
  selectDate: (date: Date | null) => void;
  setJourney: (journey: 'matutina' | 'vespertina') => void;
  setException: (date: Date, journey: 'matutina' | 'vespertina', exception: Partial<CalendarException>) => void;
  removeException: (date: Date, journey: 'matutina' | 'vespertina') => void;
  getDayInfo: (date: Date, journey: 'matutina' | 'vespertina') => CalendarDayInfo | null;
}

export function useCalendar(
  journeys: JourneySchedule[],
  templates: ScheduleTemplate[],
  exceptions: CalendarException[],
  onSaveException: (exception: CalendarException) => Promise<void>,
  onDeleteException: (id: string) => Promise<void>
) {
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedJourney, setSelectedJourney] = useState<'matutina' | 'vespertina'>('matutina');

  const dayInfoMap = useMemo(() => {
    const map = new Map<string, CalendarDayInfo>();
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    let day = calendarStart;
    while (day <= calendarEnd) {
      const dateStr = format(day, 'yyyy-MM-dd');
      for (const journey of ['matutina', 'vespertina'] as const) {
        const journeyObj = journeys.find(j => j.journey === journey);
        if (!journeyObj) continue;

        const exception = exceptions.find(
          e => e.date === dateStr && e.journey === journey
        );

        let resolvedSource: CalendarDayInfo['resolvedSource'] = 'default';
        let resolvedTemplate: ScheduleTemplate | null = null;
        let hasCustomEvents = false;
        let isNoClasses = false;

        if (exception) {
          if (exception.type === 'no_classes') {
            resolvedSource = 'exception';
            isNoClasses = true;
          } else if (exception.type === 'custom' && exception.customEvents?.length) {
            resolvedSource = 'exception';
            hasCustomEvents = true;
          } else if (exception.type === 'schedule' && exception.scheduleId) {
            resolvedSource = 'exception';
            resolvedTemplate = templates.find(t => t.id === exception.scheduleId) || null;
          }
        } else {
          const resolved = resolveScheduleForDate(dateStr, journey, journeys, templates, exceptions);
          resolvedSource = resolved.source;
          if (resolved.sourceId) {
            resolvedTemplate = templates.find(t => t.id === resolved.sourceId) || null;
          }
        }

        map.set(`${dateStr}-${journey}`, {
          date: day,
          dateStr,
          journey,
          exception: exception ?? null,
          resolvedSource,
          resolvedTemplate,
          hasCustomEvents,
          isNoClasses,
        });
      }
      day = addDays(day, 1);
    }
    return map;
  }, [currentMonth, journeys, templates, exceptions]);

  const goToMonth = useCallback((date: Date) => {
    setCurrentMonth(startOfMonth(date));
  }, []);

  const nextMonth = useCallback(() => {
    setCurrentMonth(m => addMonths(m, 1));
  }, []);

  const prevMonth = useCallback(() => {
    setCurrentMonth(m => subMonths(m, 1));
  }, []);

  const selectDate = useCallback((date: Date | null) => {
    setSelectedDate(date);
  }, []);

  const setJourney = useCallback((journey: 'matutina' | 'vespertina') => {
    setSelectedJourney(journey);
  }, []);

  const setException = useCallback(async (
    date: Date,
    journey: 'matutina' | 'vespertina',
    exceptionData: Partial<CalendarException>
  ) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const existingException = exceptions.find(e => e.date === dateStr && e.journey === journey);
    const now = new Date().toISOString();

    let type: CalendarException['type'] = 'schedule';
    let scheduleId: string | undefined;
    let customEvents: CalendarException['customEvents'];

    switch (exceptionData.type) {
      case 'no_classes':
        type = 'no_classes';
        break;
      case 'custom':
        type = 'custom';
        customEvents = exceptionData.customEvents;
        break;
      default:
        type = 'schedule';
        scheduleId = exceptionData.scheduleId;
    }

    const exception: CalendarException = {
      id: existingException?.id || `exc-${dateStr}-${journey}-${Date.now()}`,
      date: dateStr,
      journey,
      type,
      scheduleId,
      customEvents,
      name: exceptionData.name || EXCEPTION_TYPES.find(t => t.value === exceptionData.type)?.label || 'Excepción',
      description: exceptionData.description,
      createdAt: existingException?.createdAt || now,
    };

    await onSaveException(exception);
  }, [exceptions, onSaveException]);

  const removeException = useCallback(async (date: Date, journey: 'matutina' | 'vespertina') => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const existingException = exceptions.find(e => e.date === dateStr && e.journey === journey);
    if (existingException) {
      await onDeleteException(existingException.id);
    }
  }, [exceptions, onDeleteException]);

  const getDayInfo = useCallback((date: Date, journey: 'matutina' | 'vespertina'): CalendarDayInfo | null => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return dayInfoMap.get(`${dateStr}-${journey}`) || null;
  }, [dayInfoMap]);

  return {
    currentMonth,
    selectedDate,
    selectedJourney,
    dayInfoMap,
    goToMonth,
    nextMonth,
    prevMonth,
    selectDate,
    setJourney,
    setException,
    removeException,
    getDayInfo,
    EXCEPTION_TYPES,
    setCurrentMonth,
  };
}

export function formatMonthYear(date: Date): string {
  return format(date, 'MMMM yyyy', { locale: es });
}

export function formatDay(date: Date): string {
  return format(date, 'd', { locale: es });
}

export function isCurrentMonth(date: Date, currentMonth: Date): boolean {
  return date.getMonth() === currentMonth.getMonth() && date.getFullYear() === currentMonth.getFullYear();
}