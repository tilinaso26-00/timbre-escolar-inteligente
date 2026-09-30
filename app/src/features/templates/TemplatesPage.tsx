import { useState, useCallback } from 'react';
import { Plus, Upload, FileText } from 'lucide-react';
import { clsx } from 'clsx';
import { Button } from '@shared/ui/Button';
import { Input } from '@shared/ui/Input';
import { Modal } from '@shared/ui/Modal';
import { useToast } from '@shared/ui/Toast';
import { useSchedule } from '@shared/hooks/useSchedule';
import { useTemplates } from './hooks/useTemplates';
import { TemplateCard } from './components/TemplateCard';
import type { ScheduleTemplate } from '@core/schedule-engine';

const JOURNEY_LABELS = {
  matutina: { label: 'Jornada Matutina', icon: '🌅' },
  vespertina: { label: 'Jornada Vespertina', icon: '🌆' },
} as const;

export function TemplatesPage() {
  const { journeys, templates, saveTemplate, deleteTemplate, saveJourney, setActiveJourney } = useSchedule();
  const { addToast } = useToast();
  const [localActiveJourney, setLocalActiveJourney] = useState<'matutina' | 'vespertina'>('matutina');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDesc, setNewTemplateDesc] = useState('');
  const [createFromCurrent, setCreateFromCurrent] = useState(false);

  const journeyData = journeys.find(j => j.journey === localActiveJourney);
  const journeyTemplates = templates.filter(t => t.journey === localActiveJourney);

  const templateHook = useTemplates(journeyTemplates);

  const handleJourneyChange = useCallback((journey: 'matutina' | 'vespertina') => {
    setLocalActiveJourney(journey);
    setActiveJourney(journey);
  }, [setActiveJourney]);

  const handleCreateTemplate = () => {
    if (!newTemplateName.trim()) {
      addToast({ type: 'error', title: 'Error', message: 'El nombre es obligatorio' });
      return;
    }

    if (createFromCurrent && journeyData) {
      templateHook.createFromJourney(journeyData, newTemplateName, newTemplateDesc);
      addToast({ type: 'success', title: 'Plantilla creada', message: `Basada en horario actual de ${JOURNEY_LABELS[localActiveJourney].label}` });
    } else {
      templateHook.createEmpty(localActiveJourney, newTemplateName, newTemplateDesc);
      addToast({ type: 'success', title: 'Plantilla creada', message: 'Plantilla vacía creada' });
    }

    setShowCreateModal(false);
    setNewTemplateName('');
    setNewTemplateDesc('');
  };

  const handleImportTemplate = () => {
    try {
      const data = JSON.parse(importJson);
      if (data.id && data.name && data.journey && data.events) {
        const template = {
          ...data,
          id: data.id || `tpl-${Date.now()}`,
          journey: data.journey === localActiveJourney ? data.journey : localActiveJourney,
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        saveTemplate(template);
        setShowImportModal(false);
        setImportJson('');
        addToast({ type: 'success', title: 'Importado', message: 'Plantilla importada correctamente' });
      } else {
        addToast({ type: 'error', title: 'Formato inválido', message: 'El JSON debe tener id, name, journey y events' });
      }
    } catch {
      addToast({ type: 'error', title: 'Error', message: 'JSON inválido' });
    }
  };

  const handleApplyTemplate = (template: ScheduleTemplate) => {
    if (!journeyData) return;
    const updatedJourney = templateHook.applyTemplate(template.id, journeyData);
    saveJourney(updatedJourney);
    addToast({ type: 'success', title: 'Aplicado', message: `Plantilla "${template.name}" aplicada a ${JOURNEY_LABELS[localActiveJourney].label}` });
  };

  const handleDeleteTemplate = (id: string) => {
    if (confirm('¿Eliminar esta plantilla?')) {
      templateHook.deleteTemplate(id);
      deleteTemplate(id);
      addToast({ type: 'success', title: 'Eliminado', message: 'Plantilla eliminada' });
    }
  };

  const handleEditTemplate = (id: string, data: { name: string; description?: string }) => {
    templateHook.saveEdit(id, data);
    const template = templateHook.templates.find(t => t.id === id);
    if (template) {
      saveTemplate(template);
      addToast({ type: 'success', title: 'Actualizado', message: 'Plantilla actualizada' });
    }
  };

  const matutinaHasData = journeys.some(j => j.journey === 'matutina' && j.events.length > 0);
  const vespertinaHasData = journeys.some(j => j.journey === 'vespertina' && j.events.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Plantillas de Horarios</h1>
          <p className="text-gray-500 mt-1">Guarde, reutilice y comparta horarios (Normal, Corto, Examen, Actividades, etc.)</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setShowImportModal(true)}>
            <Upload className="h-4 w-4 mr-2" /> Importar JSON
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" /> Nueva plantilla
          </Button>
        </div>
      </div>

      <div className="flex gap-2 p-1 bg-gray-100 rounded-lg" role="tablist" aria-label="Seleccionar jornada">
        {(['matutina', 'vespertina'] as const).map(j => (
          <button
            key={j}
            role="tab"
            aria-selected={localActiveJourney === j}
            onClick={() => handleJourneyChange(j)}
            className={clsx(
              'flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md font-medium text-sm transition-colors',
              localActiveJourney === j ? 'bg-white shadow-sm' : j === 'matutina' ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
            )}
          >
            <span>{JOURNEY_LABELS[j].icon}</span>
            <span>{JOURNEY_LABELS[j].label.split(' ')[1]}</span>
            {({ matutina: matutinaHasData, vespertina: vespertinaHasData }[j]) && (
              <span className={clsx('px-1.5 py-0.5 text-xs rounded-full', localActiveJourney === j ? 'bg-gray-200' : 'bg-white/50')}>
                ✓
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {journeyTemplates.length === 0 ? (
          <div className="md:col-span-2 lg:col-span-3 text-center py-12">
            <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No hay plantillas</h3>
            <p className="text-gray-500 mb-4">Cree su primera plantilla para {JOURNEY_LABELS[localActiveJourney].label.toLowerCase()}</p>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" /> Crear plantilla
            </Button>
          </div>
        ) : (
          journeyTemplates.map(template => {
            const preview = templateHook.getPreview(template.id);
            return (
              <TemplateCard
                key={template.id}
                template={template}
                isEditing={templateHook.isEditing === template.id}
                journeyLabel={JOURNEY_LABELS[localActiveJourney].label}
                preview={preview}
                onEdit={() => templateHook.editTemplate(template.id)}
                onSave={data => handleEditTemplate(template.id, data)}
                onCancel={templateHook.cancelEdit}
                onDelete={() => handleDeleteTemplate(template.id)}
                onApply={() => handleApplyTemplate(template)}
                onPreview={() => templateHook.editTemplate(template.id)}
                onDuplicate={() => {
                  const duplicated = { ...template, id: `tpl-${Date.now()}`, name: `${template.name} (copia)`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
                  saveTemplate(duplicated);
                }}
              />
            );
          })
        )}
      </div>

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Nueva plantilla"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
            <Input
              value={newTemplateName}
              onChange={e => setNewTemplateName(e.target.value)}
              placeholder="Ej: Horario corto viernes"
              className="w-full"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción (opcional)</label>
            <Input
              value={newTemplateDesc}
              onChange={e => setNewTemplateDesc(e.target.value)}
              placeholder="Ej: Períodos de 35 min, recreo 20 min"
              className="w-full"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="createFromCurrent"
              checked={createFromCurrent}
              onChange={e => setCreateFromCurrent(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              disabled={!journeyData || journeyData.events.length === 0}
            />
            <label htmlFor="createFromCurrent" className="text-sm text-gray-700 cursor-pointer">
              Basar en horario actual de {JOURNEY_LABELS[localActiveJourney].label}
              {!journeyData || journeyData.events.length === 0 && <span className="text-gray-400 ml-1">(no hay horario)</span>}
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancelar</Button>
            <Button onClick={handleCreateTemplate}>Crear plantilla</Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Importar plantilla desde JSON"
        size="md"
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-600">Pegue el JSON de la plantilla exportada:</p>
          <textarea
            value={importJson}
            onChange={e => setImportJson(e.target.value)}
            rows={8}
            className="w-full p-3 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder='{ "id": "...", "name": "Horario corto", "journey": "matutina", "events": [...] }'
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowImportModal(false)}>Cancelar</Button>
            <Button onClick={handleImportTemplate}>Importar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}