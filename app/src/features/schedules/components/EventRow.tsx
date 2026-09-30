import { useState, useRef, useEffect } from 'react';
import { GripVertical, Trash2, Copy, Calendar, Bell, Shield, X, Check, MoreVertical } from 'lucide-react';
import { clsx } from 'clsx';
import { Button } from '@shared/ui/Button';
import { Input } from '@shared/ui/Input';
import type { ScheduleEvent, EventType, DayOfWeek } from '@core/schedule-engine';

interface EventRowProps {
  event: ScheduleEvent;
  index: number;
  eventTypeInfo: Map<EventType, { label: string; color: string }>;
  DAYS: readonly string[];
  onUpdate: (id: string, updates: Partial<ScheduleEvent>) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onToggleActive: (id: string) => void;
  disabled?: boolean;
  dragHandleProps?: Record<string, unknown>;
  isDragging?: boolean;
  innerRef?: React.Ref<HTMLDivElement>;
}

const DAY_LABELS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

function formatTime(time: { hours: number; minutes: number }): string {
  return `${time.hours.toString().padStart(2, '0')}:${time.minutes.toString().padStart(2, '0')}`;
}

function parseTime(timeStr: string): { hours: number; minutes: number } | null {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return { hours, minutes };
}

export function EventRow({
  event,
  index,
  eventTypeInfo,
  DAYS,
  onUpdate,
  onDelete,
  onDuplicate,
  onToggleActive,
  disabled,
  dragHandleProps,
  isDragging,
  innerRef,
}: EventRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(event.name);
  const [editTime, setEditTime] = useState(formatTime(event.bellTime));
  const [editDuration, setEditDuration] = useState(event.durationMinutes.toString());
  const [editBellDuration, setEditBellDuration] = useState(event.bellDurationSeconds.toString());
  const [editType, setEditType] = useState<EventType>(event.type);
  const [editActiveDays, setEditActiveDays] = useState<DayOfWeek[]>(event.activeDays);
  const [editIsFixed, setEditIsFixed] = useState(event.isFixed);
  const [showDayPicker, setShowDayPicker] = useState(false);
  const dayPickerRef = useRef<HTMLButtonElement>(null);

  const typeInfo = eventTypeInfo.get(event.type);
  const hasActiveDays = event.activeDays.length > 0;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dayPickerRef.current && !dayPickerRef.current.contains(e.target as Node)) {
        setShowDayPicker(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSave = () => {
    const parsedTime = parseTime(editTime);
    const duration = parseInt(editDuration, 10);
    const bellDuration = parseInt(editBellDuration, 10);

    if (!parsedTime) return;
    if (isNaN(duration) || duration < 0) return;
    if (isNaN(bellDuration) || bellDuration < 1 || bellDuration > 3600) return;

    onUpdate(event.id, {
      name: editName,
      bellTime: parsedTime,
      startTime: parsedTime,
      durationMinutes: duration,
      bellDurationSeconds: bellDuration,
      type: editType,
      activeDays: editActiveDays,
      isFixed: editIsFixed,
      updatedAt: new Date().toISOString(),
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditName(event.name);
    setEditTime(formatTime(event.bellTime));
    setEditDuration(event.durationMinutes.toString());
    setEditBellDuration(event.bellDurationSeconds.toString());
    setEditType(event.type);
    setEditActiveDays(event.activeDays);
    setEditIsFixed(event.isFixed);
    setIsEditing(false);
  };

  const toggleDay = (day: DayOfWeek) => {
    setEditActiveDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort((a, b) => a - b));
  };

  if (isEditing) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 animate-slide-down" role="dialog" aria-label="Editar evento">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-2">
            <Input
              value={editName}
              onChange={e => setEditName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              placeholder="Nombre del evento"
              className="text-sm"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Hora timbre</label>
            <Input
              type="time"
              value={editTime}
              onChange={e => setEditTime(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              className="text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Duración (min)</label>
            <Input
              type="number"
              value={editDuration}
              onChange={e => setEditDuration(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              min="0"
              max="180"
              className="text-sm w-full"
            />
          </div>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Duración timbre (seg)</label>
            <Input
              type="number"
              value={editBellDuration}
              onChange={e => setEditBellDuration(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              min="1"
              max="3600"
              className="text-sm w-full"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Tipo</label>
            <select
              value={editType}
              onChange={e => setEditType(e.target.value as EventType)}
              className="w-full text-sm border border-gray-300 rounded px-2 py-1 bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              {Array.from(eventTypeInfo.entries()).map(([value, info]) => (
                <option key={value} value={value}>{info.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Días activos</label>
            <div className="relative">
              <button
                ref={dayPickerRef}
                type="button"
                onClick={() => setShowDayPicker(!showDayPicker)}
                className="w-full text-sm border border-gray-300 rounded px-2 py-1 bg-white text-left focus:ring-2 focus:ring-primary-500 focus:border-primary-500 flex items-center justify-between"
              >
                <span>{editActiveDays.length > 0 ? editActiveDays.map(d => DAY_LABELS[d]).join(' ') : 'Ninguno'}</span>
                <Calendar className="h-4 w-4 text-gray-400" />
              </button>
              {showDayPicker && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg p-2">
                  <div className="flex gap-1 flex-wrap">
                    {DAYS.map((label, dayIdx) => (
                      <button
                        key={dayIdx}
                        type="button"
                        onClick={() => toggleDay(dayIdx as DayOfWeek)}
                        className={clsx(
                          'px-2 py-1 text-xs rounded transition-colors',
                          editActiveDays.includes(dayIdx as DayOfWeek)
                            ? 'bg-primary-100 text-primary-700'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={editIsFixed}
                onChange={e => setEditIsFixed(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">Horario fijo</span>
            </label>
          </div>
        </div>

        <div className="mt-3 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={handleCancel} disabled={disabled}>
            <X className="h-3.5 w-3.5 mr-1" /> Cancelar
          </Button>
          <Button size="sm" onClick={handleSave} disabled={disabled}>
            <Check className="h-3.5 w-3.5 mr-1" /> Guardar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={innerRef}
      {...dragHandleProps}
      className={clsx(
        'grid grid-cols-[auto_1fr_auto] gap-3 items-center p-3 rounded-lg border transition-all',
        isDragging ? 'bg-blue-50 border-blue-300 shadow-md' : 'bg-gray-50 border-gray-200 hover:border-gray-300',
        disabled && 'opacity-50',
        !hasActiveDays && 'bg-amber-50 border-amber-200'
      )}
      role="row"
      aria-rowindex={index + 1}
    >
      <button
        disabled={disabled}
        className="text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing p-1"
        aria-label="Arrastrar para reordenar"
      >
        <GripVertical className="h-6 w-6" />
      </button>

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-gray-900 truncate">{event.name}</span>
          <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', typeInfo?.color)}>
            {typeInfo?.label}
          </span>
          {event.isFixed && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 flex items-center gap-1">
              <Shield className="h-3 w-3" /> Fijo
            </span>
          )}
          {!hasActiveDays && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Sin días
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span className="flex items-center gap-1 font-mono text-gray-900">
            <Bell className="h-3.5 w-3.5" /> {formatTime(event.bellTime)}
          </span>
          {event.durationMinutes > 0 && (
            <span className="flex items-center gap-1">
              <span className="text-gray-400">|</span> Duración: {event.durationMinutes} min
            </span>
          )}
          <span className="flex items-center gap-1">
            <span className="text-gray-400">|</span> Timbre: {event.bellDurationSeconds}s
          </span>
          {hasActiveDays && (
            <span className="flex items-center gap-1 text-xs">
              <Calendar className="h-3 w-3" />
              {event.activeDays.map(d => DAY_LABELS[d]).join(' ')}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onToggleActive(event.id)}
          disabled={disabled}
          aria-label={hasActiveDays ? 'Desactivar evento' : 'Activar evento'}
          className={clsx(hasActiveDays ? 'text-gray-600' : 'text-amber-600')}
        >
          <Calendar className={clsx('h-4 w-4', hasActiveDays ? 'text-green-500' : '')} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsEditing(true)}
          disabled={disabled}
          aria-label="Editar evento"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDuplicate(event.id)}
          disabled={disabled}
          aria-label="Duplicar evento"
        >
          <Copy className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(event.id)}
          disabled={disabled}
          aria-label="Eliminar evento"
          className="text-danger-600 hover:bg-danger-50"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}