import { useState, useEffect } from 'react';
import { X, Check, Trash2, Plus } from 'lucide-react';
import { clsx } from 'clsx';
import { Button } from '@shared/ui/Button';
import { Input } from '@shared/ui/Input';
import { Modal } from '@shared/ui/Modal';
import type { CalendarException, ScheduleTemplate, ScheduleEvent, JourneyType, EventType, DayOfWeek } from '@core/schedule-engine';
import { EXCEPTION_TYPES } from '../hooks/useCalendar';

interface ExceptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
  journey: JourneyType;
  existingException: CalendarException | null;
  templates: ScheduleTemplate[];
  journeySchedule: { activeDays: DayOfWeek[]; defaultBellSeconds: number } | null;
  onSave: (exception: Partial<CalendarException>) => void;
  onDelete?: () => void;
}

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

export function ExceptionModal({
  isOpen,
  onClose,
  date,
  journey,
  existingException,
  templates,
  journeySchedule,
  onSave,
  onDelete,
}: ExceptionModalProps) {
  const [selectedType, setSelectedType] = useState<typeof EXCEPTION_TYPES[number]['value']>('normal');
  const [scheduleId, setScheduleId] = useState<string>('');
  const [customName, setCustomName] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [showCustomEvents, setShowCustomEvents] = useState(false);
  const [customEvents, setCustomEvents] = useState<ScheduleEvent[]>([]);
  const [editingCustomEvent, setEditingCustomEvent] = useState<ScheduleEvent | null>(null);

  useEffect(() => {
    if (isOpen && existingException) {
      setSelectedType(existingException.type === 'schedule' ? (existingException.scheduleId ? 'normal' : 'custom') : existingException.type);
      setScheduleId(existingException.scheduleId || '');
      setCustomName(existingException.name);
      setCustomDescription(existingException.description || '');
      setShowCustomEvents(existingException.type === 'custom');
      setCustomEvents(existingException.customEvents || []);
    } else if (isOpen && !existingException) {
      setSelectedType('normal');
      setScheduleId('');
      setCustomName('');
      setCustomDescription('');
      setShowCustomEvents(false);
      setCustomEvents([]);
    }
  }, [isOpen, existingException]);

  if (!date || !isOpen) return null;

  const handleSave = () => {
    if (selectedType === 'custom' && showCustomEvents && customEvents.length === 0) {
      alert('Debe agregar al menos un evento para horario personalizado');
      return;
    }

    onSave({
      type: selectedType as CalendarException['type'],
      scheduleId: selectedType === 'normal' ? scheduleId : undefined,
      name: customName,
      description: customDescription,
      customEvents: selectedType === 'custom' && showCustomEvents ? customEvents : undefined,
    });
    onClose();
  };

  const handleDelete = () => {
    if (onDelete && confirm('¿Eliminar esta excepción?')) {
      onDelete();
      onClose();
    }
  };

  const handleAddCustomEvent = () => {
    const newEvent: ScheduleEvent = {
      id: `evt-${Date.now()}`,
      name: 'Nuevo evento',
      startTime: { hours: 7, minutes: 0 },
      durationMinutes: journeySchedule?.defaultBellSeconds || 45,
      bellTime: { hours: 7, minutes: 0 },
      bellDurationSeconds: journeySchedule?.defaultBellSeconds || 3,
      type: 'cambio_periodo',
      journey,
      activeDays: journeySchedule?.activeDays || [1, 2, 3, 4, 5],
      isFixed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setCustomEvents(prev => [...prev, newEvent]);
    setEditingCustomEvent(newEvent);
  };

  const handleUpdateCustomEvent = (id: string, updates: Partial<ScheduleEvent>) => {
    setCustomEvents(prev => prev.map(e => e.id === id ? { ...e, ...updates, updatedAt: new Date().toISOString() } : e));
  };

  const handleDeleteCustomEvent = (id: string) => {
    setCustomEvents(prev => prev.filter(e => e.id !== id));
  };

  const journeyTemplates = templates.filter(t => t.journey === journey);

  const dateFormatted = date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Excepción: ${dateFormatted} (${journey === 'matutina' ? 'Matutina' : 'Vespertina'})`}
      size="xl"
    >
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de excepción</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {EXCEPTION_TYPES.map((typeItem) => (
                <button
                  key={typeItem.value}
                  type="button"
                  onClick={() => {
                    setSelectedType(typeItem.value);
                    setShowCustomEvents(typeItem.value === 'custom');
                  }}
                  className={clsx(
                    'p-3 rounded-lg border-2 text-left transition-all',
                    selectedType === typeItem.value
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <div className="text-2xl mb-1">{typeItem.icon}</div>
                  <div className="font-medium text-sm">{typeItem.label}</div>
                  <div className="text-xs text-gray-500">{typeItem.description}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Nombre de la excepción</label>
            <Input
              value={customName}
              onChange={e => setCustomName(e.target.value)}
              placeholder="Ej: Horario corto viernes"
              className="text-sm"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Descripción (opcional)</label>
            <Input
              value={customDescription}
              onChange={e => setCustomDescription(e.target.value)}
              placeholder="Motivo de la excepción..."
              className="text-sm"
            />
          </div>
        </div>

        {selectedType === 'normal' && journeyTemplates.length > 0 && (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">Seleccionar plantilla</label>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {journeyTemplates.map(template => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => setScheduleId(template.id)}
                  className={clsx(
                    'p-3 rounded-lg border-2 text-left transition-all',
                    scheduleId === template.id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <div className="font-medium text-sm">{template.name}</div>
                  <div className="text-xs text-gray-500 mt-1">{template.events.length} eventos</div>
                  {template.description && <div className="text-xs text-gray-400 mt-1 truncate">{template.description}</div>}
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedType === 'custom' && showCustomEvents && (
          <div className="space-y-4 border-t border-gray-200 pt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Eventos personalizados</h3>
              <Button variant="outline" size="sm" onClick={handleAddCustomEvent}>
                <Plus className="h-4 w-4 mr-1" /> Agregar evento
              </Button>
            </div>

            {customEvents.length === 0 ? (
              <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                <div className="h-10 w-10 mx-auto mb-2 opacity-50">📅</div>
                <p>No hay eventos personalizados</p>
                <p className="text-sm mt-1">Agregue eventos para este día específico</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {customEvents.map((event, idx) => (
                  <div
                    key={event.id}
                    className={clsx(
                      'p-3 rounded-lg border flex items-center gap-3',
                      editingCustomEvent?.id === event.id ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                    )}
                  >
                    <span className="text-sm text-gray-500 w-6 text-center">{idx + 1}</span>
                    <div className="flex-1 min-w-0 grid gap-2 sm:grid-cols-4">
                      <Input
                        value={event.name}
                        onChange={e => handleUpdateCustomEvent(event.id, { name: e.target.value })}
                        placeholder="Nombre"
                        className="text-sm"
                      />
                      <Input
                        type="time"
                        value={formatTime(event.bellTime)}
                        onChange={e => {
                          const parsed = parseTime(e.target.value);
                          if (parsed) handleUpdateCustomEvent(event.id, { bellTime: parsed, startTime: parsed });
                        }}
                        className="text-sm"
                      />
                      <Input
                        type="number"
                        value={event.durationMinutes.toString()}
                        onChange={e => handleUpdateCustomEvent(event.id, { durationMinutes: parseInt(e.target.value, 10) || 0 })}
                        min="0"
                        max="180"
                        className="text-sm w-full"
                      />
                      <select
                        value={event.type}
                        onChange={e => handleUpdateCustomEvent(event.id, { type: e.target.value as EventType })}
                        className="text-sm border border-gray-300 rounded px-2 py-1 bg-white"
                      >
                        <option value="entrada">Entrada</option>
                        <option value="salida">Salida</option>
                        <option value="cambio_periodo">Cambio período</option>
                        <option value="recreo_inicio">Inicio recreo</option>
                        <option value="recreo_fin">Fin recreo</option>
                        <option value="actividad_especial">Actividad especial</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setEditingCustomEvent(editingCustomEvent?.id === event.id ? null : event)}>
                        {editingCustomEvent?.id === event.id ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteCustomEvent(event.id)} className="text-danger-600">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          {existingException && onDelete && (
            <Button variant="outline" onClick={handleDelete} className="text-danger-600 border-danger-200 hover:bg-danger-50">
              <Trash2 className="h-4 w-4 mr-1" /> Eliminar
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-1" /> Cancelar
          </Button>
          <Button onClick={handleSave}>
            <Check className="h-4 w-4 mr-1" /> {existingException ? 'Actualizar' : 'Crear'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}