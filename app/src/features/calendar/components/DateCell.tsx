import { clsx } from 'clsx';
import type { CalendarDayInfo } from '../hooks/useCalendar';
import { EXCEPTION_TYPES } from '../hooks/useCalendar';

interface DateCellProps {
  dayInfo: CalendarDayInfo;
  isSelected: boolean;
  isToday: boolean;
  isCurrentMonth: boolean;
  onClick: () => void;
  onRightClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

const SOURCE_COLORS: Record<CalendarDayInfo['resolvedSource'], string> = {
  exception: 'bg-red-100 text-red-700 border-red-200',
  date_schedule: 'bg-blue-100 text-blue-700 border-blue-200',
  template: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  journey: 'bg-green-100 text-green-700 border-green-200',
  default: 'bg-gray-100 text-gray-700 border-gray-200',
};

const SOURCE_LABELS: Record<CalendarDayInfo['resolvedSource'], string> = {
  exception: 'Excepción',
  date_schedule: 'Horario fecha',
  template: 'Plantilla',
  journey: 'Jornada',
  default: 'Defecto',
};

export function DateCell({ dayInfo, isSelected, isToday, isCurrentMonth, onClick, onRightClick }: DateCellProps) {
  const { date, exception, resolvedSource, resolvedTemplate, hasCustomEvents } = dayInfo;

  if (!isCurrentMonth) {
    return (
      <div className="p-2 text-gray-300 h-full" aria-hidden="true">
        <span className="text-sm">{date.getDate()}</span>
      </div>
    );
  }

  const sourceLabel = SOURCE_LABELS[resolvedSource];

  const getExceptionTypeInfo = () => {
    if (!exception) return null;
    return EXCEPTION_TYPES.find(t => t.value === exception.type) || null;
  };

  const exceptionTypeInfo = getExceptionTypeInfo();
  const exceptionLabel = exceptionTypeInfo?.label || exception?.type || 'Excepción';
  const exceptionIcon = exceptionTypeInfo?.icon || '📌';
  const exceptionColor = exceptionTypeInfo?.color || 'bg-gray-100 text-gray-700';

  return (
    <div className="h-full w-full">
      <button
        type="button"
        onClick={onClick}
        onContextMenu={onRightClick}
        className={clsx(
          'w-full h-full p-2 relative rounded-lg border-2 transition-all flex flex-col',
          isSelected ? 'border-primary-500 bg-primary-50 shadow-sm' : 'border-transparent hover:border-gray-300 hover:bg-gray-50',
          isToday && 'ring-2 ring-primary-500',
          !isCurrentMonth && 'opacity-50'
        )}
        aria-label={`${date.getDate()} de ${date.toLocaleDateString('es-ES', { month: 'long' })} - ${sourceLabel}${exception ? ` (${exceptionLabel})` : ''}`}
        aria-pressed={isSelected}
      >
        <div className="flex items-center justify-between mb-1">
          <span className={clsx('text-sm font-medium', isToday ? 'text-primary-600' : 'text-gray-900')}>
            {date.getDate()}
          </span>
          {isToday && (
            <span className="text-xs px-1.5 py-0.5 bg-primary-100 text-primary-700 rounded">Hoy</span>
          )}
        </div>

        <div className="flex-1 flex flex-col justify-center items-start gap-1 min-h-0">
          {exception ? (
            <div className="w-full">
              <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full', exceptionColor)}>
                <span aria-hidden="true">{exceptionIcon}</span>
                <span className="truncate">{exceptionLabel}</span>
              </span>
              {resolvedTemplate && (
                <span className="text-xs text-gray-500 truncate block mt-0.5">{resolvedTemplate.name}</span>
              )}
              {hasCustomEvents && (
                <span className="text-xs text-gray-500 truncate block mt-0.5">Eventos personalizados</span>
              )}
            </div>
          ) : (
            <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full')}>
              {sourceLabel}
            </span>
          )}

          {exception && exception.description && (
            <span className="text-xs text-gray-400 truncate block mt-1" title={exception.description}>
              {exception.description}
            </span>
          )}
        </div>

        {isSelected && (
          <div className="absolute bottom-1 right-1">
            <span className="h-3.5 w-3.5 text-gray-400">⋮</span>
          </div>
        )}
      </button>

      {isSelected && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 z-10">
          <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-2 min-w-[200px] animate-slide-down">
            <div className="text-xs font-medium text-gray-900 mb-1">
              {date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
            <div className="flex flex-wrap gap-1">
              <span className={clsx('px-2 py-0.5 text-xs rounded-full', SOURCE_COLORS[resolvedSource])}>
                {SOURCE_LABELS[resolvedSource]}
              </span>
              {exception && (
                <span className={clsx('px-2 py-0.5 text-xs rounded-full', exceptionColor)}>
                  {exceptionIcon} {exceptionLabel}
                </span>
              )}
            </div>
            {exception?.description && (
              <p className="text-xs text-gray-500 mt-1 truncate" title={exception.description}>
                {exception.description}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}