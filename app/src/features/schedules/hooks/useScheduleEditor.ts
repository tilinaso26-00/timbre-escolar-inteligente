import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { JourneySchedule, ScheduleEvent, TimeOnly, EventType } from '@core/schedule-engine';
import { recalculatePeriods } from '@core/schedule-engine/period-calculator';
import { validateSchedule } from '@core/schedule-engine/validator';
import { generatePreview } from '@core/schedule-engine/preview-generator';

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'] as const;

export interface EditorState {
  journey: JourneySchedule | null;
  events: ScheduleEvent[];
  isDirty: boolean;
  validationErrors: ReturnType<typeof validateSchedule>['errors'];
  preview: ReturnType<typeof generatePreview>;
}

export interface EditorActions {
  setJourney: (journey: JourneySchedule | null) => void;
  addEvent: (event?: Partial<ScheduleEvent>) => void;
  updateEvent: (id: string, updates: Partial<ScheduleEvent>) => void;
  deleteEvent: (id: string) => void;
  duplicateEvent: (id: string) => void;
  moveEvent: (fromIndex: number, toIndex: number) => void;
  toggleEventActive: (id: string) => void;
  adjustPeriods: (deltaMinutes: number) => void;
  setCustomPeriodMinutes: (minutes: number) => void;
  reset: () => void;
  getPayload: () => JourneySchedule | null;
}

const EVENT_TYPES: { value: EventType; label: string; color: string }[] = [
  { value: 'entrada', label: 'Entrada', color: 'bg-green-100 text-green-700' },
  { value: 'salida', label: 'Salida', color: 'bg-red-100 text-red-700' },
  { value: 'cambio_periodo', label: 'Cambio período', color: 'bg-blue-100 text-blue-700' },
  { value: 'recreo_inicio', label: 'Inicio recreo', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'recreo_fin', label: 'Fin recreo', color: 'bg-orange-100 text-orange-700' },
  { value: 'actividad_especial', label: 'Actividad especial', color: 'bg-purple-100 text-purple-700' },
];

type EventTypeInfo = typeof EVENT_TYPES[0];

function timeOnlyToMinutes(t: TimeOnly): number {
  return t.hours * 60 + t.minutes;
}

function minutesToTimeOnly(m: number): TimeOnly {
  return { hours: Math.floor(m / 60), minutes: m % 60 };
}

function createDefaultEvent(journey: JourneySchedule, type: EventType, index: number): ScheduleEvent {
  const now = new Date().toISOString();
  let bellTime: TimeOnly = { hours: 7, minutes: 0 };
  let startTime: TimeOnly = { hours: 7, minutes: 0 };
  const duration = journey.defaultPeriodMinutes;

  if (type === 'entrada') {
    bellTime = journey.entryTime;
    startTime = journey.entryTime;
  } else if (type === 'salida') {
    bellTime = journey.exitTime;
    startTime = journey.exitTime;
  } else {
    const baseMinutes = timeOnlyToMinutes(journey.entryTime);
    const periodsBefore = journey.events.filter(e => e.type === 'cambio_periodo' || e.type === 'actividad_especial').length;
    const recessPassed = journey.events.some(e => e.type === 'recreo_inicio' && e.bellTime.hours * 60 + e.bellTime.minutes < baseMinutes + periodsBefore * journey.defaultPeriodMinutes + 30);
    bellTime = minutesToTimeOnly(baseMinutes + periodsBefore * journey.defaultPeriodMinutes + (recessPassed ? 30 : 0));
    startTime = bellTime;
  }

  return {
    id: uuidv4(),
    name: type === 'entrada' ? 'Entrada' : type === 'salida' ? 'Salida' : type === 'recreo_inicio' ? 'Recreo' : type === 'recreo_fin' ? 'Fin recreo' : 'Período',
    startTime,
    durationMinutes: duration,
    bellTime,
    bellDurationSeconds: journey.defaultBellSeconds,
    type,
    journey: journey.journey,
    activeDays: journey.activeDays,
    isFixed: false,
    periodIndex: type === 'cambio_periodo' || type === 'actividad_especial' ? index : undefined,
    templateId: undefined,
    createdAt: now,
    updatedAt: now,
  };
}

export function useScheduleEditor(initialJourney?: JourneySchedule | null) {
  const [state, setState] = useState<EditorState>({
    journey: initialJourney || null,
    events: initialJourney?.events || [],
    isDirty: false,
    validationErrors: [],
    preview: [],
  });

  const adoptedRef = useRef<{ id: string; updatedAt: string } | null>(
    initialJourney ? { id: initialJourney.journey, updatedAt: initialJourney.updatedAt } : null
  );

  useEffect(() => {
    if (!initialJourney) return;

    const next = { id: initialJourney.journey, updatedAt: initialJourney.updatedAt };
    const adopted = adoptedRef.current;
    if (adopted && adopted.id === next.id && adopted.updatedAt === next.updatedAt) return;
    adoptedRef.current = next;

    setState(prev => {
      const sameJourney = prev.journey?.journey === next.id;
      if (sameJourney && prev.isDirty) return prev;
      return {
        journey: initialJourney,
        events: initialJourney.events,
        isDirty: false,
        validationErrors: validateSchedule(initialJourney).errors,
        preview: generatePreview(initialJourney),
      };
    });
  }, [initialJourney]);

  const recalcPreview = useCallback((events: ScheduleEvent[], journey: JourneySchedule) => {
    if (!journey) return [];
    return generatePreview({ ...journey, events });
  }, []);

  const recalcValidation = useCallback((journey: JourneySchedule) => {
    if (!journey) return [];
    return validateSchedule(journey).errors;
  }, []);

  const setJourney = useCallback((journey: JourneySchedule | null) => {
    setState(prev => ({
      ...prev,
      journey,
      events: journey?.events || [],
      isDirty: false,
      validationErrors: journey ? recalcValidation(journey) : [],
      preview: journey ? recalcPreview(journey.events, journey) : [],
    }));
  }, [recalcPreview, recalcValidation]);

  const addEvent = useCallback((event?: Partial<ScheduleEvent>) => {
    setState(prev => {
      if (!prev.journey) return prev;
      const newEvent = event ? { ...createDefaultEvent(prev.journey, event.type || 'cambio_periodo', prev.events.length), ...event } : createDefaultEvent(prev.journey, 'cambio_periodo', prev.events.length);
      const newEvents = [...prev.events, newEvent];
      const newJourney = { ...prev.journey, events: newEvents, updatedAt: new Date().toISOString() };
      return {
        ...prev,
        events: newEvents,
        journey: newJourney,
        isDirty: true,
        validationErrors: recalcValidation(newJourney),
        preview: recalcPreview(newEvents, newJourney),
      };
    });
  }, [recalcPreview, recalcValidation]);

  const updateEvent = useCallback((id: string, updates: Partial<ScheduleEvent>) => {
    setState(prev => {
      if (!prev.journey) return prev;
      const newEvents = prev.events.map(e => e.id === id ? { ...e, ...updates, updatedAt: new Date().toISOString() } : e);
      const newJourney = { ...prev.journey, events: newEvents, updatedAt: new Date().toISOString() };
      return {
        ...prev,
        events: newEvents,
        journey: newJourney,
        isDirty: true,
        validationErrors: recalcValidation(newJourney),
        preview: recalcPreview(newEvents, newJourney),
      };
    });
  }, [recalcPreview, recalcValidation]);

  const deleteEvent = useCallback((id: string) => {
    setState(prev => {
      if (!prev.journey) return prev;
      const newEvents = prev.events.filter(e => e.id !== id);
      const newJourney = { ...prev.journey, events: newEvents, updatedAt: new Date().toISOString() };
      return {
        ...prev,
        events: newEvents,
        journey: newJourney,
        isDirty: true,
        validationErrors: recalcValidation(newJourney),
        preview: recalcPreview(newEvents, newJourney),
      };
    });
  }, [recalcPreview, recalcValidation]);

  const duplicateEvent = useCallback((id: string) => {
    setState(prev => {
      if (!prev.journey) return prev;
      const event = prev.events.find(e => e.id === id);
      if (!event) return prev;
      const newEvent = { ...event, id: uuidv4(), name: `${event.name} (copia)`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      const newEvents = [...prev.events, newEvent];
      const newJourney = { ...prev.journey, events: newEvents, updatedAt: new Date().toISOString() };
      return {
        ...prev,
        events: newEvents,
        journey: newJourney,
        isDirty: true,
        validationErrors: recalcValidation(newJourney),
        preview: recalcPreview(newEvents, newJourney),
      };
    });
  }, [recalcPreview, recalcValidation]);

  const moveEvent = useCallback((fromIndex: number, toIndex: number) => {
    setState(prev => {
      if (!prev.journey) return prev;
      const newEvents = [...prev.events];
      const [removed] = newEvents.splice(fromIndex, 1);
      newEvents.splice(toIndex, 0, removed);
      const newJourney = { ...prev.journey, events: newEvents, updatedAt: new Date().toISOString() };
      return {
        ...prev,
        events: newEvents,
        journey: newJourney,
        isDirty: true,
        validationErrors: recalcValidation(newJourney),
        preview: recalcPreview(newEvents, newJourney),
      };
    });
  }, [recalcPreview, recalcValidation]);

  const toggleEventActive = useCallback((id: string) => {
    setState(prev => {
      if (!prev.journey) return prev;
      const event = prev.events.find(e => e.id === id);
      if (!event) return prev;
      const newEvents = prev.events.map(e => e.id === id ? { ...e, activeDays: e.activeDays.length > 0 ? [] : prev.journey!.activeDays, updatedAt: new Date().toISOString() } : e);
      const newJourney = { ...prev.journey, events: newEvents, updatedAt: new Date().toISOString() };
      return {
        ...prev,
        events: newEvents,
        journey: newJourney,
        isDirty: true,
        validationErrors: recalcValidation(newJourney),
        preview: recalcPreview(newEvents, newJourney),
      };
    });
  }, [recalcPreview, recalcValidation]);

  const adjustPeriods = useCallback((deltaMinutes: number) => {
    setState(prev => {
      if (!prev.journey) return prev;
      const newPeriodMinutes = Math.max(5, prev.journey.defaultPeriodMinutes + deltaMinutes);
      const result = recalculatePeriods({ journey: prev.journey, newPeriodMinutes });
      const newJourney = { ...prev.journey, defaultPeriodMinutes: newPeriodMinutes, events: result.events, updatedAt: new Date().toISOString() };
      return {
        ...prev,
        events: result.events,
        journey: newJourney,
        isDirty: true,
        validationErrors: recalcValidation(newJourney),
        preview: recalcPreview(result.events, newJourney),
      };
    });
  }, [recalcPreview, recalcValidation]);

  const setCustomPeriodMinutes = useCallback((minutes: number) => {
    setState(prev => {
      if (!prev.journey) return prev;
      const newPeriodMinutes = Math.max(5, minutes);
      const result = recalculatePeriods({ journey: prev.journey, newPeriodMinutes });
      const newJourney = { ...prev.journey, defaultPeriodMinutes: newPeriodMinutes, events: result.events, updatedAt: new Date().toISOString() };
      return {
        ...prev,
        events: result.events,
        journey: newJourney,
        isDirty: true,
        validationErrors: recalcValidation(newJourney),
        preview: recalcPreview(result.events, newJourney),
      };
    });
  }, [recalcPreview, recalcValidation]);

  const reset = useCallback(() => {
    setState({
      journey: initialJourney || null,
      events: initialJourney?.events || [],
      isDirty: false,
      validationErrors: initialJourney ? recalcValidation(initialJourney) : [],
      preview: initialJourney ? recalcPreview(initialJourney.events, initialJourney) : [],
    });
  }, [initialJourney, recalcPreview, recalcValidation]);

  const getPayload = useCallback((): JourneySchedule | null => {
    if (!state.journey) return null;
    return { ...state.journey, events: state.events };
  }, [state.journey, state.events]);

  const sortedEvents = useMemo(() => {
    return [...state.events].sort((a, b) => {
      const aTime = a.bellTime.hours * 60 + a.bellTime.minutes;
      const bTime = b.bellTime.hours * 60 + b.bellTime.minutes;
      return aTime - bTime;
    });
  }, [state.events]);

  const eventTypeInfo = useMemo(() => {
    const map = new Map<EventType, EventTypeInfo>();
    EVENT_TYPES.forEach(t => map.set(t.value, t));
    return map;
  }, []);

  return {
    ...state,
    sortedEvents,
    eventTypeInfo,
    DAYS,
    setJourney,
    addEvent,
    updateEvent,
    deleteEvent,
    duplicateEvent,
    moveEvent,
    toggleEventActive,
    adjustPeriods,
    setCustomPeriodMinutes,
    reset,
    getPayload,
  };
}