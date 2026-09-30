import { Clock, Calendar, Bell, CheckCircle, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';
import type { PreviewEvent } from '@core/schedule-engine/preview-generator';

interface SchedulePreviewProps {
  preview: PreviewEvent[];
  journeyName?: string;
  entryTime?: { hours: number; minutes: number };
  exitTime?: { hours: number; minutes: number };
  activeDays?: number[];
  className?: string;
}

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const TYPE_ICONS: Record<string, React.ReactNode> = {
  Entrada: <span className="text-green-600">🚪</span>,
  Salida: <span className="text-red-600">🚪</span>,
  'Cambio período': <span className="text-blue-600">🔄</span>,
  Recreo: <span className="text-yellow-600">🍎</span>,
  'Fin recreo': <span className="text-orange-600">⏰</span>,
  Actividad: <span className="text-purple-600">📋</span>,
};

function formatTime(hours: number, minutes: number): string {
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

function parseTime(timeStr: string): { hours: number; minutes: number } | null {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  return { hours: parseInt(match[1], 10), minutes: parseInt(match[2], 10) };
}

export function SchedulePreview({ preview, journeyName, entryTime, exitTime, activeDays, className }: SchedulePreviewProps) {
  const daysActive = activeDays?.length || 0;
  const totalEvents = preview.length;
  const firstEvent = preview[0];
  const lastEvent = preview[preview.length - 1];

  const hasConflicts = preview.some((e, i, arr) => i > 0 && e.time === arr[i - 1].time);

  return (
    <div className={clsx('bg-white border border-gray-200 rounded-xl p-4', className)}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{journeyName || 'Vista previa del horario'}</h3>
          <p className="text-sm text-gray-500 mt-1">
            {totalEvents} evento{totalEvents !== 1 ? 's' : ''} programado{totalEvents !== 1 ? 's' : ''}
            {daysActive > 0 && <span className="mx-2">·</span>}
            {daysActive > 0 && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {activeDays?.map(d => DAY_NAMES[d]).join(', ') || 'Ningún día'}
              </span>
            )}
          </p>
        </div>
        {hasConflicts && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
            <AlertCircle className="h-4 w-4" />
            Conflictos detectados
          </div>
        )}
      </div>

      {entryTime && exitTime && (
        <div className="mb-4 flex flex-wrap items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
            <span className="text-green-700 font-medium">Entrada</span>
            <span className="font-mono text-green-900">{formatTime(entryTime.hours, entryTime.minutes)}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg">
            <span className="text-red-700 font-medium">Salida</span>
            <span className="font-mono text-red-900">{formatTime(exitTime.hours, exitTime.minutes)}</span>
          </div>
        </div>
      )}

      <div className="max-h-64 overflow-y-auto space-y-1">
        {preview.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Clock className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>No hay eventos programados</p>
            <p className="text-xs mt-1">Agregue eventos desde el editor</p>
          </div>
        ) : (
          preview.map((event, idx) => {
            const time = parseTime(event.time);
            const isFirst = idx === 0;
            const isLast = idx === preview.length - 1;
            const hasConflict = idx > 0 && event.time === preview[idx - 1].time;

            return (
              <div
                key={`${event.time}-${event.name}-${idx}`}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                  isFirst && 'bg-green-50 border-l-4 border-green-500',
                  isLast && 'bg-red-50 border-l-4 border-red-500',
                  hasConflict && 'bg-amber-50 border-l-4 border-amber-500',
                  'bg-gray-50 hover:bg-gray-100'
                )}
              >
                <div className="flex-shrink-0 w-14 text-right font-mono text-sm text-gray-600">
                  {time ? formatTime(time.hours, time.minutes) : event.time}
                </div>
                <div className="flex-shrink-0 w-8 text-center">{TYPE_ICONS[event.type] || <Bell className="h-4 w-4 mx-auto text-gray-400" />}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{event.name}</p>
                  <p className="text-xs text-gray-500 capitalize">{event.type}</p>
                </div>
                {event.duration && (
                  <div className="flex-shrink-0 px-2 py-0.5 bg-gray-200 rounded text-xs text-gray-600 font-mono">
                    {event.duration}
                  </div>
                )}
                {hasConflict && (
                  <span className="flex-shrink-0 px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-medium">
                    ⚠ Conflicto
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>

      {preview.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>Horario listo para sincronizar</span>
          </div>
          <span className="font-mono text-gray-400">
            {firstEvent && lastEvent && `Duración total: ${firstEvent.time} - ${lastEvent.time}`}
          </span>
        </div>
      )}
    </div>
  );
}