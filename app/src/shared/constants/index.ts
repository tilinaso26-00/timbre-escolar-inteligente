export const EVENT_TYPES = [
  { value: 'entrada', label: 'Entrada', color: 'bg-green-100 text-green-700', icon: '🚪' },
  { value: 'salida', label: 'Salida', color: 'bg-red-100 text-red-700', icon: '🚪' },
  { value: 'cambio_periodo', label: 'Cambio de período', color: 'bg-blue-100 text-blue-700', icon: '📚' },
  { value: 'recreo_inicio', label: 'Inicio de recreo', color: 'bg-yellow-100 text-yellow-700', icon: '☕' },
  { value: 'recreo_fin', label: 'Fin de recreo', color: 'bg-orange-100 text-orange-700', icon: '🔔' },
  { value: 'actividad_especial', label: 'Actividad especial', color: 'bg-purple-100 text-purple-700', icon: '🎭' },
  { value: 'manual', label: 'Manual', color: 'bg-gray-100 text-gray-700', icon: '👆' }
] as const;

export const JOURNEY_NAMES = {
  matutina: 'Jornada Matutina',
  vespertina: 'Jornada Vespertina'
} as const;

export const DAYS_OF_WEEK = [
  { value: 0, label: 'Domingo', short: 'Do' },
  { value: 1, label: 'Lunes', short: 'Lu' },
  { value: 2, label: 'Martes', short: 'Ma' },
  { value: 3, label: 'Miércoles', short: 'Mi' },
  { value: 4, label: 'Jueves', short: 'Ju' },
  { value: 5, label: 'Viernes', short: 'Vi' },
  { value: 6, label: 'Sábado', short: 'Sa' }
] as const;

export const SCHEDULE_TYPES = [
  { value: 'normal', label: 'Horario Normal', color: 'bg-blue-100 text-blue-700' },
  { value: 'corto', label: 'Horario Corto', color: 'bg-green-100 text-green-700' },
  { value: 'largo', label: 'Horario Largo', color: 'bg-purple-100 text-purple-700' },
  { value: 'examen', label: 'Horario de Examen', color: 'bg-red-100 text-red-700' },
  { value: 'especial', label: 'Horario Especial', color: 'bg-orange-100 text-orange-700' },
  { value: 'actividades', label: 'Horario de Actividades', color: 'bg-pink-100 text-pink-700' },
  { value: 'personalizado', label: 'Horario Personalizado', color: 'bg-gray-100 text-gray-700' }
] as const;

export const EXCEPTION_TYPES = [
  { value: 'schedule', label: 'Horario especial', description: 'Usar una plantilla específica para este día' },
  { value: 'no_classes', label: 'Sin clases', description: 'El timbre no sonará automáticamente' },
  { value: 'custom', label: 'Horario personalizado', description: 'Definir eventos específicos para este día' }
] as const;

export const BELL_DURATIONS = [
  { value: 1, label: '1 segundo' },
  { value: 2, label: '2 segundos' },
  { value: 3, label: '3 segundos (predeterminado)' },
  { value: 5, label: '5 segundos' },
  { value: 10, label: '10 segundos' }
] as const;

export const PERIOD_ADJUSTMENTS = [
  { value: -15, label: '-15 min' },
  { value: -10, label: '-10 min' },
  { value: -5, label: '-5 min' },
  { value: 5, label: '+5 min' },
  { value: 10, label: '+10 min' },
  { value: 15, label: '+15 min' }
] as const;

export const DEMO_SPEEDS = [
  { value: 1, label: 'Tiempo real (1x)' },
  { value: 5, label: '5x (1s = 5min)' },
  { value: 10, label: '10x (1s = 10min)' },
  { value: 60, label: '60x (1s = 1h)' }
] as const;