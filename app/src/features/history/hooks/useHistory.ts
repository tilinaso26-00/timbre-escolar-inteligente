import { useState, useEffect, useCallback, useMemo } from 'react';
import { liveQuery } from 'dexie';
import type { BellEventLog } from '@core/schedule-engine';
import { eventsRepo } from '@core/storage';

export interface HistoryFilters {
  dateFrom?: string;
  dateTo?: string;
  journey?: 'matutina' | 'vespertina' | 'all';
  eventType?: BellEventLog['eventType'] | 'all';
  triggeredBy?: BellEventLog['triggeredBy'] | 'all';
  search?: string;
}

export function useHistory() {
  const [events, setEvents] = useState<BellEventLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<HistoryFilters>({
    journey: 'all',
    eventType: 'all',
    triggeredBy: 'all',
  });
  const [sortConfig, setSortConfig] = useState<{ key: keyof BellEventLog; direction: 'asc' | 'desc' }>({
    key: 'timestamp',
    direction: 'desc',
  });

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await eventsRepo.getAll(1000);
      setEvents(data);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const sub = liveQuery(() => eventsRepo.getAll(1000)).subscribe({
      next: data => {
        setEvents(data);
        setLoading(false);
      },
      error: error => {
        console.error('Error loading history:', error);
        setLoading(false);
      },
    });
    return () => sub.unsubscribe();
  }, []);

  const filteredEvents = useMemo(() => {
    const dateFromIso = filters.dateFrom
      ? new Date(`${filters.dateFrom}T00:00:00`).toISOString()
      : null;
    const dateToIso = filters.dateTo
      ? new Date(`${filters.dateTo}T23:59:59.999`).toISOString()
      : null;

    return events
      .filter(e => {
        if (dateFromIso && e.timestamp < dateFromIso) return false;
        if (dateToIso && e.timestamp > dateToIso) return false;
        if (filters.journey !== 'all' && e.journey !== filters.journey) return false;
        if (filters.eventType !== 'all' && e.eventType !== filters.eventType) return false;
        if (filters.triggeredBy !== 'all' && e.triggeredBy !== filters.triggeredBy) return false;
        if (filters.search) {
          const search = filters.search.toLowerCase();
          if (!e.eventName.toLowerCase().includes(search) &&
              !e.eventType.toLowerCase().includes(search) &&
              !e.journey.toLowerCase().includes(search)) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return sortConfig.direction === 'asc' ? -1 : 1;
        if (bVal == null) return sortConfig.direction === 'asc' ? 1 : -1;
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
  }, [events, filters, sortConfig]);

  const handleSort = useCallback((key: keyof BellEventLog) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  const exportToCSV = useCallback(() => {
    const headers = ['ID', 'Fecha/Hora', 'Evento', 'Tipo', 'Jornada', 'Origen', 'Ejecutado', 'Duración (s)', 'Dispositivo'];
    const rows = filteredEvents.map(e => [
      e.id,
      e.timestamp,
      e.eventName,
      e.eventType,
      e.journey,
      e.triggeredBy,
      e.executed ? 'Sí' : 'No',
      e.durationSeconds.toString(),
      e.deviceId,
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `historial-timbres-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredEvents]);

  const exportToJSON = useCallback(() => {
    const json = JSON.stringify(filteredEvents, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `historial-timbres-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredEvents]);

  const clearHistory = useCallback(async () => {
    if (confirm('¿Eliminar TODO el historial? Esta acción no se puede deshacer.')) {
      await eventsRepo.clearAll();
      setEvents([]);
    }
  }, []);

  const clearBefore = useCallback(async (date: string) => {
    if (confirm(`¿Eliminar historial anterior a ${date}?`)) {
      await eventsRepo.clearBefore(date);
      setEvents(prev => prev.filter(e => e.timestamp >= date));
    }
  }, []);

  return {
    events: filteredEvents,
    allEvents: events,
    loading,
    filters,
    setFilters,
    sortConfig,
    handleSort,
    loadEvents,
    exportToCSV,
    exportToJSON,
    clearHistory,
    clearBefore,
  };
}