import { useState } from 'react';
import { Minus, Plus, Edit3, Check, X } from 'lucide-react';
import { clsx } from 'clsx';
import { Button } from '@shared/ui/Button';
import { Input } from '@shared/ui/Input';

interface PeriodAdjusterProps {
  currentMinutes: number;
  onAdjust: (delta: number) => void;
  onSetCustom: (minutes: number) => void;
  disabled?: boolean;
  hasFixedEvents?: boolean;
}

const QUICK_ADJUSTMENTS = [-15, -10, -5, 5, 10, 15];

export function PeriodAdjuster({ currentMinutes, onAdjust, onSetCustom, disabled, hasFixedEvents }: PeriodAdjusterProps) {
  const [showCustom, setShowCustom] = useState(false);
  const [customValue, setCustomValue] = useState('');

  const handleQuickAdjust = (delta: number) => {
    if (!disabled) onAdjust(delta);
  };

  const handleCustomSubmit = () => {
    const minutes = parseInt(customValue, 10);
    if (!isNaN(minutes) && minutes >= 5 && minutes <= 180) {
      onSetCustom(minutes);
      setShowCustom(false);
      setCustomValue('');
    }
  };

  const handleCustomCancel = () => {
    setShowCustom(false);
    setCustomValue('');
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-sm font-medium text-gray-700">Duración de períodos</label>
          <p className="text-sm text-gray-500 mt-0.5">
            Actual: <strong className="text-gray-900">{currentMinutes} minutos</strong>
            {hasFixedEvents && <span className="ml-2 text-xs text-amber-600">(Hay eventos fijos que no cambian)</span>}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowCustom(true)}
          disabled={disabled}
          aria-label="Establecer duración personalizada"
        >
          <Edit3 className="h-4 w-4 mr-1" />
          Personalizado
        </Button>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Ajustes rápidos de duración">
        {QUICK_ADJUSTMENTS.map(delta => (
          <Button
            key={delta}
            variant="outline"
            size="sm"
            onClick={() => handleQuickAdjust(delta)}
            disabled={disabled || currentMinutes + delta < 5}
            className={clsx(
              delta > 0 ? 'text-green-700 border-green-300 hover:bg-green-50' : 'text-red-700 border-red-300 hover:bg-red-50'
            )}
            aria-label={`${delta > 0 ? 'Aumentar' : 'Reducir'} ${Math.abs(delta)} minutos`}
          >
            {delta > 0 ? <Plus className="h-3.5 w-3.5 mr-1" /> : <Minus className="h-3.5 w-3.5 mr-1" />}
            {delta > 0 ? '+' : ''}{delta} min
          </Button>
        ))}
      </div>

      {showCustom && (
        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200 animate-slide-down">
          <Input
            type="number"
            value={customValue}
            onChange={e => setCustomValue(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCustomSubmit()}
            onBlur={handleCustomSubmit}
            placeholder="Minutos (5-180)"
            min={5}
            max={180}
            className="w-24"
            autoFocus
            aria-label="Duración personalizada en minutos"
          />
          <span className="text-gray-500">minutos</span>
          <Button size="sm" variant="primary" onClick={handleCustomSubmit} disabled={disabled}>
            <Check className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" onClick={handleCustomCancel} disabled={disabled}>
            <X className="h-3.5 w-3.5" />
          </Button>
          <p className="text-xs text-gray-500 ml-auto">Mín 5, máx 180 min</p>
        </div>
      )}
    </div>
  );
}