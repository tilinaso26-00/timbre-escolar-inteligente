import { useState, useCallback } from 'react';
import { Download, Filter, Trash2, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { clsx } from 'clsx';
import { Button } from '@shared/ui/Button';
import { Input } from '@shared/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/ui/Card';
import { Modal } from '@shared/ui/Modal';
import { useToast } from '@shared/ui/Toast';
import { useHistory, HistoryFilters } from './hooks/useHistory';
import type { BellEventLog } from '@core/schedule-engine';

const EVENT_TYPE_LABELS: Record<BellEventLog['eventType'], string> = {
  entrada: 'Entrada',
  salida: 'Salida',
  cambio_periodo: 'Cambio período',
  recreo_inicio: 'Inicio recreo',
  recreo_fin: 'Fin recreo',
  actividad_especial: 'Actividad especial',
  manual: 'Manual',
};

const TRIGGERED_BY_LABELS: Record<BellEventLog['triggeredBy'], string> = {
  automatic: 'Automático',
  manual: 'Manual',
  demo: 'Demo',
  test: 'Prueba',
};

const JOURNEY_LABELS = {
  matutina: '🌅 Matutina',
  vespertina: '🌆 Vespertina',
};

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function HistoryPage() {
  const {
    events,
    allEvents,
    loading,
    filters,
    setFilters,
    sortConfig,
    handleSort,
    exportToCSV,
    exportToJSON,
    clearHistory,
    clearBefore,
  } = useHistory();
  const { addToast } = useToast();

  const [showClearModal, setShowClearModal] = useState(false);
  const [clearBeforeDate, setClearBeforeDate] = useState('');

  const handleExportCSV = useCallback(() => {
    exportToCSV();
    addToast({ type: 'success', title: 'Exportado', message: 'Historial descargado como CSV' });
  }, [exportToCSV, addToast]);

  const handleExportJSON = useCallback(() => {
    exportToJSON();
    addToast({ type: 'success', title: 'Exportado', message: 'Historial descargado como JSON' });
  }, [exportToJSON, addToast]);

  const handleClearHistory = useCallback(async () => {
    await clearHistory();
    addToast({ type: 'success', title: 'Historial limpiado', message: 'Todos los eventos han sido eliminados' });
    setShowClearModal(false);
  }, [clearHistory, addToast]);

  const handleClearBefore = useCallback(async () => {
    if (!clearBeforeDate) return;
    await clearBefore(clearBeforeDate);
    addToast({ type: 'success', title: 'Historial limpiado', message: `Eventos anteriores a ${clearBeforeDate} eliminados` });
    setShowClearModal(false);
    setClearBeforeDate('');
  }, [clearBefore, clearBeforeDate, addToast]);

  const hasActiveFilters = filters.dateFrom || filters.dateTo || filters.journey !== 'all' ||
    filters.eventType !== 'all' || filters.triggeredBy !== 'all' || filters.search;

  const getSortIcon = (key: keyof BellEventLog) => {
    if (sortConfig.key !== key) return <ChevronDown className="h-4 w-4 text-gray-400" />;
    return sortConfig.direction === 'asc' ? <ChevronUp className="h-4 w-4 text-primary-500" /> : <ChevronDown className="h-4 w-4 text-primary-500" />;
  };

  const SortableHeader = ({ key, label }: { key: keyof BellEventLog; label: string }) => (
    <button
      onClick={() => handleSort(key)}
      className="flex items-center gap-1 px-3 py-2 text-left text-sm font-medium text-gray-700 hover:text-gray-900"
    >
      {label} {getSortIcon(key)}
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Historial de Timbres</h1>
          <p className="text-gray-500 mt-1">Registro completo de eventos ejecutados con filtros y exportación</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" /> CSV
          </Button>
          <Button variant="outline" onClick={handleExportJSON}>
            <Download className="h-4 w-4 mr-2" /> JSON
          </Button>
          <Button variant="outline" onClick={() => setShowClearModal(true)} className="text-danger-600 border-danger-200 hover:bg-danger-50">
            <Trash2 className="h-4 w-4 mr-2" /> Limpiar
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-sm font-medium text-gray-500">Filtros</CardTitle>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={() => setFilters({ journey: 'all', eventType: 'all', triggeredBy: 'all', search: '' })}>
                <Filter className="h-3.5 w-3.5 mr-1" /> Limpiar filtros
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Buscar</label>
              <Input
                type="text"
                placeholder="Evento, tipo, jornada..."
                value={filters.search || ''}
                onChange={e => setFilters({ ...filters, search: e.target.value })}
                className="text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Desde</label>
              <Input
                type="date"
                value={filters.dateFrom || ''}
                onChange={e => setFilters({ ...filters, dateFrom: e.target.value || undefined })}
                className="text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Hasta</label>
              <Input
                type="date"
                value={filters.dateTo || ''}
                onChange={e => setFilters({ ...filters, dateTo: e.target.value || undefined })}
                className="text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Jornada</label>
              <select
                value={filters.journey}
                onChange={e => setFilters({ ...filters, journey: e.target.value as HistoryFilters['journey'] })}
                className="w-full text-sm border border-gray-300 rounded px-2 py-1 bg-white"
              >
                <option value="all">Todas</option>
                <option value="matutina">🌅 Matutina</option>
                <option value="vespertina">🌆 Vespertina</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Origen</label>
              <select
                value={filters.triggeredBy}
                onChange={e => setFilters({ ...filters, triggeredBy: e.target.value as HistoryFilters['triggeredBy'] })}
                className="w-full text-sm border border-gray-300 rounded px-2 py-1 bg-white"
              >
                <option value="all">Todos</option>
                <option value="automatic">Automático</option>
                <option value="manual">Manual</option>
                <option value="demo">Demo</option>
                <option value="test">Prueba</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-gray-500">
            Eventos ({events.length} de {allEvents.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent mx-auto mb-2" />
              <p className="text-gray-500">Cargando historial...</p>
            </div>
          ) : events.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium text-gray-900 mb-1">No hay eventos</p>
              <p className="text-sm">{hasActiveFilters ? 'Pruebe ajustando los filtros' : 'El historial está vacío'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th><SortableHeader key="timestamp" label="Fecha/Hora" /></th>
                    <th><SortableHeader key="eventName" label="Evento" /></th>
                    <th><SortableHeader key="eventType" label="Tipo" /></th>
                    <th><SortableHeader key="journey" label="Jornada" /></th>
                    <th><SortableHeader key="triggeredBy" label="Origen" /></th>
                    <th className="px-3 py-2 text-left">Ejecutado</th>
                    <th className="px-3 py-2 text-left">Duración</th>
                    <th className="px-3 py-2 text-left">Dispositivo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {events.map(event => (
                    <tr key={event.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-mono text-gray-900 whitespace-nowrap">{formatDateTime(event.timestamp)}</td>
                      <td className="px-3 py-2 text-gray-900">{event.eventName}</td>
                      <td className="px-3 py-2">
                        <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700">
                          {EVENT_TYPE_LABELS[event.eventType] || event.eventType}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700">
                          {JOURNEY_LABELS[event.journey as keyof typeof JOURNEY_LABELS] || event.journey}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700">
                          {TRIGGERED_BY_LABELS[event.triggeredBy] || event.triggeredBy}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className={clsx('px-2 py-0.5 text-xs rounded-full font-medium', event.executed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
                          {event.executed ? '✓ Sí' : '✗ No'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-600 font-mono">{event.durationSeconds}s</td>
                      <td className="px-3 py-2 text-gray-500 text-xs">{event.deviceId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={showClearModal}
        onClose={() => setShowClearModal(false)}
        title="Limpiar historial"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <Trash2 className="h-6 w-6 text-amber-500" />
            <div>
              <p className="font-medium text-gray-900">Esta acción eliminará eventos permanentemente</p>
              <p className="text-sm text-gray-500">No se puede deshacer</p>
            </div>
          </div>
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleClearHistory}
              className="w-full p-3 text-left border border-danger-200 rounded-lg hover:bg-danger-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-danger-500" />
                <span className="font-medium text-danger-600">Eliminar TODO el historial</span>
              </div>
              <p className="text-xs text-gray-500 mt-1 ml-7">{allEvents.length} eventos serán eliminados</p>
            </button>
            <div className="border-t border-gray-200 pt-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">O eliminar solo eventos anteriores a:</label>
              <Input
                type="date"
                value={clearBeforeDate}
                onChange={e => setClearBeforeDate(e.target.value)}
                className="w-full text-sm mb-2"
              />
              <Button variant="outline" onClick={handleClearBefore} disabled={!clearBeforeDate} className="w-full">
                Eliminar anteriores a esta fecha
              </Button>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowClearModal(false)}>Cancelar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}