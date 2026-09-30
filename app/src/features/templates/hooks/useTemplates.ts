import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { ScheduleTemplate, JourneySchedule, ScheduleEvent, PreviewEvent } from '@core/schedule-engine';
import { generatePreviewFromEvents } from '@core/schedule-engine/preview-generator';

export interface TemplatesState {
  templates: ScheduleTemplate[];
  isEditing: string | null;
  editData: Partial<ScheduleTemplate> | null;
}

export interface TemplatesActions {
  createFromJourney: (journey: JourneySchedule, name: string, description?: string) => void;
  createEmpty: (journey: 'matutina' | 'vespertina', name: string, description?: string) => void;
  editTemplate: (id: string) => void;
  saveEdit: (id: string, data: Partial<ScheduleTemplate>) => void;
  cancelEdit: () => void;
  deleteTemplate: (id: string) => void;
  applyTemplate: (id: string, targetJourney: JourneySchedule) => JourneySchedule;
  getPreview: (id: string) => ReturnType<typeof generatePreviewFromEvents>;
}

export function useTemplates(initialTemplates: ScheduleTemplate[] = []) {
  const [state, setState] = useState<TemplatesState>({
    templates: initialTemplates,
    isEditing: null,
    editData: null,
  });

  const createFromJourney = useCallback((journey: JourneySchedule, name: string, description?: string) => {
    const newTemplate: ScheduleTemplate = {
      id: uuidv4(),
      name,
      description,
      journey: journey.journey,
      events: journey.events.map(e => ({
        name: e.name,
        startTime: e.startTime,
        durationMinutes: e.durationMinutes,
        bellTime: e.bellTime,
        bellDurationSeconds: e.bellDurationSeconds,
        type: e.type,
        journey: e.journey,
        activeDays: e.activeDays,
        isFixed: e.isFixed,
        periodIndex: e.periodIndex,
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setState(prev => ({ ...prev, templates: [...prev.templates, newTemplate] }));
  }, []);

  const createEmpty = useCallback((journey: 'matutina' | 'vespertina', name: string, description?: string) => {
    const newTemplate: ScheduleTemplate = {
      id: uuidv4(),
      name,
      description,
      journey,
      events: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setState(prev => ({ ...prev, templates: [...prev.templates, newTemplate] }));
  }, []);

  const editTemplate = useCallback((id: string) => {
    const template = state.templates.find(t => t.id === id);
    if (template) {
      setState(prev => ({
        ...prev,
        isEditing: id,
        editData: { name: template.name, description: template.description },
      }));
    }
  }, [state.templates]);

  const saveEdit = useCallback((id: string, data: Partial<ScheduleTemplate>) => {
    setState(prev => ({
      ...prev,
      templates: prev.templates.map(t => t.id === id ? { ...t, ...data, updatedAt: new Date().toISOString() } : t),
      isEditing: null,
      editData: null,
    }));
  }, []);

  const cancelEdit = useCallback(() => {
    setState(prev => ({ ...prev, isEditing: null, editData: null }));
  }, []);

  const deleteTemplate = useCallback((id: string) => {
    setState(prev => ({ ...prev, templates: prev.templates.filter(t => t.id !== id) }));
  }, []);

  const applyTemplate = useCallback((id: string, targetJourney: JourneySchedule): JourneySchedule => {
    const template = state.templates.find(t => t.id === id);
    if (!template) return targetJourney;
    return {
      ...targetJourney,
      events: template.events.map(e => ({
        ...e,
        id: uuidv4(),
        journey: targetJourney.journey,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })),
      updatedAt: new Date().toISOString(),
    };
  }, [state.templates]);

  const getPreview = useCallback((id: string): PreviewEvent[] => {
    const template = state.templates.find(t => t.id === id);
    if (!template) return [];
    return generatePreviewFromEvents(template.events as ScheduleEvent[]);
  }, [state.templates]);

  return {
    ...state,
    createFromJourney,
    createEmpty,
    editTemplate,
    saveEdit,
    cancelEdit,
    deleteTemplate,
    applyTemplate,
    getPreview,
  };
}