import { forwardRef, type ForwardRefExoticComponent, type RefAttributes } from 'react';
import { Sunrise, Sunset } from 'lucide-react';
import { clsx } from 'clsx';

interface JourneyTabsProps {
  activeJourney: 'matutina' | 'vespertina';
  onChange: (journey: 'matutina' | 'vespertina') => void;
  disabled?: boolean;
  matutinaHasData?: boolean;
  vespertinaHasData?: boolean;
}

const JourneyTabsComponent = forwardRef<HTMLDivElement, JourneyTabsProps>(
  ({ activeJourney, onChange, disabled, matutinaHasData, vespertinaHasData }, ref) => {
    const journeys = [
      { id: 'matutina' as const, label: 'Jornada Matutina', icon: Sunrise, color: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200', hasData: matutinaHasData },
      { id: 'vespertina' as const, label: 'Jornada Vespertina', icon: Sunset, color: 'bg-blue-100 text-blue-700 hover:bg-blue-200', hasData: vespertinaHasData },
    ];

    return (
      <div ref={ref} className="flex gap-2 p-1 bg-gray-100 rounded-lg" role="tablist" aria-label="Seleccionar jornada">
        {journeys.map(j => (
          <button
            key={j.id}
            role="tab"
            aria-selected={activeJourney === j.id}
            onClick={() => !disabled && onChange(j.id)}
            disabled={disabled}
            className={clsx(
              'flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md font-medium text-sm transition-colors',
              activeJourney === j.id ? 'bg-white shadow-sm' : j.color,
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <j.icon className="h-4 w-4" aria-hidden="true" />
            <span>{j.label}</span>
            {j.hasData && (
              <span className={clsx('px-1.5 py-0.5 text-xs rounded-full', activeJourney === j.id ? 'bg-gray-200' : 'bg-white/50')}>
                ✓
              </span>
            )}
          </button>
        ))}
      </div>
    );
  }
);

JourneyTabsComponent.displayName = 'JourneyTabs';

export const JourneyTabs = JourneyTabsComponent as ForwardRefExoticComponent<JourneyTabsProps & RefAttributes<HTMLDivElement>>;