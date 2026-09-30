import { useState, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Plus, Save, RotateCcw, Eye, Download, Upload, FileText } from 'lucide-react';
import { clsx } from 'clsx';
import { Button } from '@shared/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/ui/Card';
import { Modal } from '@shared/ui/Modal';
import { useToast } from '@shared/ui/Toast';
import { useSchedule } from '@shared/hooks/useSchedule';
import { useScheduleEditor } from './hooks/useScheduleEditor';
import type { JourneySchedule } from '@core/schedule-engine';
import { JourneyTabs } from './components/JourneyTabs';
import { PeriodAdjuster } from './components/PeriodAdjuster';
import { SchedulePreview } from './components/SchedulePreview';
import { EventRow } from './components/EventRow';
import { ValidationBanner } from './components/ValidationBanner';

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'] as const;

export function ScheduleEditor() {
  const { journeys, saveJourney, setActiveJourney: setGlobalActiveJourney } = useSchedule();
  const { addToast } = useToast();
  const [localActiveJourney, setLocalActiveJourney] = useState<'matutina' | 'vespertina'>('matutina');
  const [showPreview, setShowPreview] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importJson, setImportJson] = useState('');

  const activeJourney = localActiveJourney;
  const journeyData = journeys.find(j => j.journey === activeJourney);

  const editor = useScheduleEditor(journeyData || null);

  const handleJourneyChange = useCallback((journey: 'matutina' | 'vespertina') => {
    setLocalActiveJourney(journey);
    setGlobalActiveJourney(journey);
  }, [setGlobalActiveJourney]);

  const handleDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return;
    if (result.source.index === result.destination.index) return;
    editor.moveEvent(result.source.index, result.destination.index);
  }, [editor]);

  const handleSave = async () => {
    const payload = editor.getPayload();
    if (!payload) return;
    try {
      await saveJourney(payload);
      editor.reset();
      addToast({ type: 'success', title: 'Horario guardado', message: 'Cambios sincronizados con la base de datos' });
    } catch {
      addToast({ type: 'error', title: 'Error', message: 'No se pudo guardar el horario' });
    }
  };

  const handleExport = () => {
    const payload = editor.getPayload();
    if (!payload) return;
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `horario-${activeJourney}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast({ type: 'success', title: 'Exportado', message: 'Archivo JSON descargado' });
  };

  const handleImport = () => {
    try {
      const data = JSON.parse(importJson) as Partial<JourneySchedule> | null;
      if (data && data.journey && data.events) {
        editor.setJourney(data as JourneySchedule);
        setShowImportModal(false);
        setImportJson('');
        addToast({ type: 'success', title: 'Importado', message: 'Horario cargado desde JSON' });
      } else {
        addToast({ type: 'error', title: 'Formato inválido', message: 'El JSON debe tener journey y events' });
      }
    } catch {
      addToast({ type: 'error', title: 'Error', message: 'JSON inválido' });
    }
  };

  const hasFixedEvents = editor.events.some(e => e.isFixed);
  const hasEntry = editor.events.some(e => e.type === 'entrada');
  const hasExit = editor.events.some(e => e.type === 'salida');

  const matutinaHasData = journeys.some(j => j.journey === 'matutina' && j.events.length > 0);
  const vespertinaHasData = journeys.some(j => j.journey === 'vespertina' && j.events.length > 0);

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Editor de Horarios</h1>
            <p className="text-gray-500 mt-1">Configure eventos, ajuste períodos y valide antes de sincronizar</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleExport} disabled={editor.events.length === 0}>
              <Download className="h-4 w-4 mr-2" /> Exportar JSON
            </Button>
            <Button variant="outline" onClick={() => setShowImportModal(true)}>
              <Upload className="h-4 w-4 mr-2" /> Importar JSON
            </Button>
            <Button variant="outline" onClick={() => editor.reset()} disabled={!editor.isDirty}>
              <RotateCcw className="h-4 w-4 mr-2" /> Deshacer cambios
            </Button>
            <Button onClick={handleSave} disabled={!editor.isDirty || editor.validationErrors.some(e => e.severity === 'error')}>
              <Save className="h-4 w-4 mr-2" /> Guardar horario
            </Button>
          </div>
        </div>

        <JourneyTabs
          activeJourney={activeJourney}
          onChange={handleJourneyChange}
          matutinaHasData={matutinaHasData}
          vespertinaHasData={vespertinaHasData}
        />

        <ValidationBanner
          errors={editor.validationErrors}
          onDismiss={code => {
            if (code === 'all') {
              // Could filter out dismissed errors
            }
          }}
          dismissible={false}
        />

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-gray-500">Eventos programados</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => editor.addEvent({ type: 'entrada' })} disabled={hasEntry}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Entrada
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => editor.addEvent({ type: 'recreo_inicio' })}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Recreo
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => editor.addEvent({ type: 'cambio_periodo' })}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Período
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => editor.addEvent({ type: 'actividad_especial' })}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Actividad
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => editor.addEvent({ type: 'salida' })} disabled={hasExit}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Salida
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Droppable droppableId="events">
                  {(provided, _snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="divide-y divide-gray-200"
                    >
                      {editor.sortedEvents.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                          <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>No hay eventos programados</p>
                          <p className="text-sm mt-1">Use los botones arriba para agregar eventos</p>
                        </div>
                      ) : (
                        editor.sortedEvents.map((event, index) => (
                          <Draggable key={event.id} draggableId={event.id} index={index}>
                            {(provided, snapshot) => (
                              <EventRow
                                event={event}
                                index={index}
                                eventTypeInfo={editor.eventTypeInfo}
                                DAYS={DAYS}
                                onUpdate={editor.updateEvent}
                                onDelete={editor.deleteEvent}
                                onDuplicate={editor.duplicateEvent}
                                onToggleActive={editor.toggleEventActive}
                                dragHandleProps={(provided.dragHandleProps || {}) as Record<string, unknown>}
                                isDragging={snapshot.isDragging}
                                disabled={false}
                                innerRef={provided.innerRef}
                              />
                            )}
                          </Draggable>
                        ))
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-500">Ajuste de períodos dinámicos</CardTitle>
              </CardHeader>
              <CardContent>
                <PeriodAdjuster
                  currentMinutes={journeyData?.defaultPeriodMinutes || 45}
                  onAdjust={editor.adjustPeriods}
                  onSetCustom={editor.setCustomPeriodMinutes}
                  hasFixedEvents={hasFixedEvents}
                />
                <p className="mt-3 text-sm text-gray-500">
                  Los eventos marcados como <strong className="text-gray-700">"Horario fijo"</strong> no se modifican.
                  Los períodos de tipo "Cambio período" y "Actividad especial" se recalculan automáticamente.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-gray-500">Vista previa</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)}>
                    <Eye className={`h-4 w-4 mr-1 ${showPreview ? 'rotate-180' : ''}`} />
                    {showPreview ? 'Ocultar' : 'Mostrar'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {showPreview && (
                  <SchedulePreview
                    preview={editor.preview}
                    journeyName={journeyData?.name || (activeJourney === 'matutina' ? 'Jornada Matutina' : 'Jornada Vespertina')}
                    entryTime={journeyData?.entryTime}
                    exitTime={journeyData?.exitTime}
                    activeDays={journeyData?.activeDays}
                  />
                )}
                {!showPreview && (
                  <div className="p-8 text-center text-gray-500">
                    <Eye className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Haga clic en "Mostrar" para ver la vista previa</p>
                    <p className="text-sm mt-1">{editor.preview.length} eventos en la vista previa</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-500">Información de la jornada</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">Entrada</p>
                    <p className="font-mono text-lg text-gray-900">
                      {journeyData ? `${journeyData.entryTime.hours.toString().padStart(2, '0')}:${journeyData.entryTime.minutes.toString().padStart(2, '0')}` : '--:--'}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">Salida</p>
                    <p className="font-mono text-lg text-gray-900">
                      {journeyData ? `${journeyData.exitTime.hours.toString().padStart(2, '0')}:${journeyData.exitTime.minutes.toString().padStart(2, '0')}` : '--:--'}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">Período base</p>
                    <p className="font-mono text-lg text-gray-900">{journeyData?.defaultPeriodMinutes || 45} min</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">Timbre por defecto</p>
                    <p className="font-mono text-lg text-gray-900">{journeyData?.defaultBellSeconds || 3}s</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {DAYS.map((label, idx) => (
                    <span
                      key={idx}
                      className={clsx(
                        'px-2 py-1 text-xs rounded font-medium',
                        journeyData?.activeDays.includes(idx as 0 | 1 | 2 | 3 | 4 | 5 | 6)
                          ? 'bg-primary-100 text-primary-700'
                          : 'bg-gray-100 text-gray-500'
                      )}
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Modal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          title="Importar horario desde JSON"
          size="md"
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Pegue el JSON exportado previamente:</p>
            <textarea
              value={importJson}
              onChange={e => setImportJson(e.target.value)}
              rows={10}
              className="w-full p-3 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder='{ "journey": "matutina", "name": "Matutina", "entryTime": {"hours": 7, "minutes": 0}, "exitTime": {"hours": 12, "minutes": 0}, "defaultPeriodMinutes": 45, "defaultBellSeconds": 3, "activeDays": [1,2,3,4,5], "events": [...] }'
            />
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleImport}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors"
              >
                Importar
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </DragDropContext>
  );
}