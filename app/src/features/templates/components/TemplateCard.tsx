import { useState } from 'react';
import { Calendar, Clock, Bell, Edit, Trash2, Play, Copy, X, Check } from 'lucide-react';
import { clsx } from 'clsx';
import { Button } from '@shared/ui/Button';
import { Input } from '@shared/ui/Input';
import type { ScheduleTemplate, PreviewEvent } from '@core/schedule-engine';

interface TemplateCardProps {
  template: ScheduleTemplate;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (data: { name: string; description?: string }) => void;
  onCancel: () => void;
  onDelete: () => void;
  onApply: () => void;
  onPreview: () => void;
  onDuplicate: () => void;
  preview: PreviewEvent[];
  journeyLabel: string;
}

export function TemplateCard({
  template,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onApply,
  onPreview,
  onDuplicate,
  preview,
  journeyLabel,
}: TemplateCardProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [editName, setEditName] = useState(template.name);
  const [editDesc, setEditDesc] = useState(template.description || '');

  const handleSave = () => {
    onSave({ name: editName, description: editDesc });
  };

  if (isEditing) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 animate-slide-down">
        <div className="flex items-center gap-3 mb-3">
          <Input
            value={editName}
            onChange={e => setEditName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            placeholder="Nombre"
            className="flex-1 text-sm"
            autoFocus
          />
          <Input
            value={editDesc}
            onChange={e => setEditDesc(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            placeholder="Descripción (opcional)"
            className="w-64 text-sm"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-3.5 w-3.5 mr-1" /> Cancelar
          </Button>
          <Button size="sm" onClick={handleSave}>
            <Check className="h-3.5 w-3.5 mr-1" /> Guardar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 truncate">{template.name}</h3>
            <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', template.journey === 'matutina' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700')}>
              {journeyLabel}
            </span>
          </div>
          {template.description && (
            <p className="text-sm text-gray-500 truncate">{template.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1 ml-2">
          <Button variant="ghost" size="sm" onClick={onPreview} aria-label="Vista previa">
            <Calendar className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onDuplicate} aria-label="Duplicar">
            <Copy className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onEdit} aria-label="Editar">
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete} className="text-danger-600 hover:bg-danger-50" aria-label="Eliminar">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-gray-500 mb-3">
        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {template.events.length} eventos</span>
        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {template.events.filter(e => e.type === 'cambio_periodo' || e.type === 'actividad_especial').length} períodos</span>
        <span className="flex items-center gap-1"><Bell className="h-3 w-3" /> {template.events.filter(e => e.type === 'recreo_inicio' || e.type === 'recreo_fin').length} recreos</span>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onApply} className="flex-1">
          <Play className="h-3.5 w-3.5 mr-1" /> Aplicar a jornada
        </Button>
      </div>

      {showPreview && preview.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200 animate-slide-down">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-700">Vista previa</span>
            <Button variant="ghost" size="sm" onClick={() => setShowPreview(false)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {preview.map((event, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs px-2 py-1 bg-gray-50 rounded">
                <span className="font-mono text-gray-900 w-12">{event.time}</span>
                <span className="text-gray-700 truncate flex-1">{event.name}</span>
                <span className="px-1.5 py-0.5 bg-gray-200 rounded text-gray-600">{event.type}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}