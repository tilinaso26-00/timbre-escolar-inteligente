import { useState, useEffect, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { useWebSocket } from './useWebSocket';
import { useToast } from '@shared/ui/Toast';
import { httpBell, httpPost } from '@shared/lib/deviceHttp';
import {
  journeysRepo,
  templatesRepo,
  exceptionsRepo,
  eventsRepo,
  configRepo
} from '@core/storage';
import { seedIfEmpty } from '@core/storage/seed';
import type { JourneySchedule, ScheduleTemplate, CalendarException, BellEventLog, DeviceConfig, DayOfWeek } from '@core/schedule-engine';
import { resolveScheduleForDate, getActiveScheduleForNow } from '@core/schedule-engine/priority-resolver';

const TIMEZONE = 'America/Guatemala';

export function useSchedule() {
  const { connected, deviceStatus, sendMessage } = useWebSocket();
  const { addToast } = useToast();

  const [journeys, setJourneys] = useState<JourneySchedule[]>([]);
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);
  const [exceptions, setExceptions] = useState<CalendarException[]>([]);
  const [events, setEvents] = useState<BellEventLog[]>([]);
  const [config, setConfig] = useState<DeviceConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeJourney, setActiveJourney] = useState<'matutina' | 'vespertina'>('matutina');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [nextEvent, setNextEvent] = useState<{ name: string; at: string; inMs: number } | null>(null);

  const loadAllData = useCallback(async () => {
    try {
      await seedIfEmpty();
      const [j, t, e, ev, c] = await Promise.all([
        journeysRepo.getAll(),
        templatesRepo.getAll(),
        exceptionsRepo.getAll(),
        eventsRepo.getAll(50),
        configRepo.get()
      ]);
      setJourneys(j);
      setTemplates(t);
      setExceptions(e);
      setEvents(ev);
      setConfig(c);
    } catch (error) {
      console.error('Error loading data:', error);
      addToast({
        type: 'error',
        title: 'No se pudieron cargar los datos',
        message: 'Revisa el almacenamiento local e intenta de nuevo.',
      });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const updateNextEvent = useCallback(() => {
    const now = toZonedTime(new Date(), TIMEZONE);
    const currentTimeOnly = { hours: now.getHours(), minutes: now.getMinutes() };
    const today = now.getDay() as DayOfWeek;

    const activeJourneySchedule = journeys.find(j => j.journey === activeJourney);
    if (!activeJourneySchedule) {
      setNextEvent(null);
      return;
    }

    const resolved = resolveScheduleForDate(
      format(now, 'yyyy-MM-dd'),
      activeJourney,
      journeys,
      templates,
      exceptions
    );

    const todayEvents = resolved.events.filter(e => e.activeDays.includes(today));
    const upcoming = todayEvents
      .filter(e => e.bellTime.hours > currentTimeOnly.hours || (e.bellTime.hours === currentTimeOnly.hours && e.bellTime.minutes > currentTimeOnly.minutes))
      .sort((a, b) => a.bellTime.hours - b.bellTime.hours || a.bellTime.minutes - b.bellTime.minutes)[0];

    if (upcoming) {
      const eventTime = new Date(now);
      eventTime.setHours(upcoming.bellTime.hours, upcoming.bellTime.minutes, 0, 0);
      const diffMs = eventTime.getTime() - now.getTime();
      setNextEvent({ name: upcoming.name, at: `${upcoming.bellTime.hours.toString().padStart(2, '0')}:${upcoming.bellTime.minutes.toString().padStart(2, '0')}`, inMs: diffMs });
    } else {
      setNextEvent(null);
    }
  }, [journeys, templates, exceptions, activeJourney]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
      updateNextEvent();
    }, 1000);
    return () => clearInterval(interval);
  }, [updateNextEvent]);

  const saveJourney = async (journey: JourneySchedule) => {
    await journeysRepo.put(journey);
    setJourneys(prev =>
      prev.some(j => j.journey === journey.journey)
        ? prev.map(j => (j.journey === journey.journey ? journey : j))
        : [...prev, journey]
    );
  };

  const saveTemplate = async (template: ScheduleTemplate) => {
    await templatesRepo.put(template);
    setTemplates(prev => [...prev.filter(t => t.id !== template.id), template]);
  };

  const deleteTemplate = async (id: string) => {
    await templatesRepo.delete(id);
    setTemplates(prev => prev.filter(t => t.id !== id));
  };

  const saveException = async (exception: CalendarException) => {
    await exceptionsRepo.put(exception);
    setExceptions(prev => [...prev.filter(e => e.id !== exception.id), exception]);
  };

  const deleteException = async (id: string) => {
    await exceptionsRepo.delete(id);
    setExceptions(prev => prev.filter(e => e.id !== id));
  };

  const syncToDevice = async () => {
    if (!connected) return false;

    const payload = {
      version: Date.now(),
      hash: '',
      timestamp: new Date().toISOString(),
      deviceId: config[0]?.deviceId || 'ESP32',
      journeys,
      templates,
      exceptions,
      deviceConfig: config[0] || {}
    };

    // WebSocket primero; si no conecta, el ESP32 acepta el mismo sync por HTTP.
    if (sendMessage('sync:request', payload)) return true;

    const res = await httpPost<{ status?: string }>('/api/schedule', payload);
    return res !== null && res.status === 'ok';
  };

  // Siempre usar la última versión de syncToDevice (se recrea en cada render)
  const syncFnRef = useRef(syncToDevice);
  syncFnRef.current = syncToDevice;

  // Primer contacto con el dispositivo: se envía el horario solo, para que los
  // timbres programados funcionen sin apretar "Sincronizar". El ESP32 ignora el
  // sync si el contenido no cambió (dedupe por hash), así que esto no satura la flash.
  const autoSyncedRef = useRef(false);
  useEffect(() => {
    if (!connected || loading || autoSyncedRef.current) return;
    let cancelled = false;

    const attempt = async () => {
      if (cancelled || autoSyncedRef.current) return;
      const ok = await syncFnRef.current();
      if (ok && !cancelled) {
        autoSyncedRef.current = true;
        console.info('[sync] Horario enviado al dispositivo automáticamente');
      }
    };

    void attempt();
    const id = window.setInterval(attempt, 8000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [connected, loading]);

  const ringManualBell = async (durationSeconds: number) => {
    const wsOk = sendMessage('bell:manual', { durationSec: durationSeconds });
    if (!wsOk) await httpBell(durationSeconds, false);
  };

  const testBell = async (durationSeconds: number) => {
    const wsOk = sendMessage('bell:test', { durationSec: durationSeconds });
    if (!wsOk) await httpBell(durationSeconds, true);
  };

  const getResolvedScheduleForDate = useCallback((date: string, journey: 'matutina' | 'vespertina') => {
    return resolveScheduleForDate(date, journey, journeys, templates, exceptions);
  }, [journeys, templates, exceptions]);

  const getActiveSchedules = useCallback(() => {
    return getActiveScheduleForNow(journeys, templates, exceptions);
  }, [journeys, templates, exceptions]);

  return {
    loading,
    journeys,
    templates,
    exceptions,
    events,
    config,
    activeJourney,
    setActiveJourney,
    currentTime,
    nextEvent,
    connected,
    deviceStatus,
    saveJourney,
    saveTemplate,
    deleteTemplate,
    saveException,
    deleteException,
    syncToDevice,
    ringManualBell,
    testBell,
    sendMessage,
    getResolvedScheduleForDate,
    getActiveSchedules,
    refresh: loadAllData
  };
}