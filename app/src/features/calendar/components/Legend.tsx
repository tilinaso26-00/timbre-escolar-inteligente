import { clsx } from 'clsx';

interface LegendItem {
  color: string;
  label: string;
  icon?: React.ReactNode;
  description?: string;
}

interface LegendProps {
  items: readonly LegendItem[];
  title?: string;
  className?: string;
}

export function Legend({ items, title, className }: LegendProps) {
  return (
    <div className={clsx('flex flex-wrap items-center gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200', className)}>
      {title && <span className="text-sm font-medium text-gray-700 mr-2">{title}</span>}
      <div className="flex flex-wrap items-center gap-3">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center gap-1.5" title={item.description}>
            <span className={clsx('w-3 h-3 rounded', item.color)} />
            <span className="text-xs text-gray-700">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export const CALENDAR_LEGEND_ITEMS = [
  { color: 'bg-green-100', label: 'Normal', description: 'Horario base de la jornada' },
  { color: 'bg-blue-100', label: 'Corto', description: 'Períodos reducidos' },
  { color: 'bg-purple-100', label: 'Largo', description: 'Períodos extendidos' },
  { color: 'bg-orange-100', label: 'Examen', description: 'Solo exámenes' },
  { color: 'bg-pink-100', label: 'Actividades', description: 'Actividades especiales' },
  { color: 'bg-red-100', label: 'Sin clases', description: 'No suena el timbre' },
  { color: 'bg-gray-100', label: 'Personalizado', description: 'Eventos específicos' },
  { color: 'bg-yellow-100', label: 'Plantilla día', description: 'Según plantilla semanal' },
  { color: 'bg-slate-100', label: 'Por defecto', description: 'Horario base sin excepciones' },
] as const;