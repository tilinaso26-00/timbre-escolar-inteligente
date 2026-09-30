import { AlertCircle, AlertTriangle, X } from 'lucide-react';
import { clsx } from 'clsx';
import type { ValidationError } from '@core/schedule-engine/validator';

interface ValidationBannerProps {
  errors: ValidationError[];
  onDismiss?: (code: string) => void;
  dismissible?: boolean;
}

const SEVERITY_CONFIG = {
  error: { icon: AlertCircle, bg: 'bg-danger-50', border: 'border-danger-200', text: 'text-danger-700', iconColor: 'text-danger-500' },
  warning: { icon: AlertTriangle, bg: 'bg-warning-50', border: 'border-warning-200', text: 'text-warning-700', iconColor: 'text-warning-500' },
} as const;

export function ValidationBanner({ errors, onDismiss, dismissible = false }: ValidationBannerProps) {
  if (errors.length === 0) return null;

  const errorCount = errors.filter(e => e.severity === 'error').length;
  const warningCount = errors.filter(e => e.severity === 'warning').length;

  return (
    <div className="mb-4" role="alert" aria-live="polite">
      <div className={clsx('rounded-lg border p-4', errorCount > 0 ? 'bg-danger-50 border-danger-200' : 'bg-warning-50 border-warning-200')}>
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-semibold text-gray-900">
                {errorCount > 0 ? `${errorCount} error${errorCount > 1 ? 'es' : ''}` : ''}
                {errorCount > 0 && warningCount > 0 && ', '}
                {warningCount > 0 ? `${warningCount} advertencia${warningCount > 1 ? 's' : ''}` : ''}
              </span>
              {dismissible && onDismiss && (
                <button
                  onClick={() => onDismiss?.('all')}
                  className="ml-auto text-gray-400 hover:text-gray-600"
                  aria-label="Descartar todas"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <ul className="space-y-1" role="list">
              {errors.map((error, idx) => {
                const Icon = SEVERITY_CONFIG[error.severity].icon;
                return (
                  <li key={`${error.code}-${idx}`} className={clsx('flex items-start gap-2 text-sm', SEVERITY_CONFIG[error.severity].text)}>
                    <Icon className={clsx('h-4 w-4 flex-shrink-0 mt-0.5', SEVERITY_CONFIG[error.severity].iconColor)} aria-hidden="true" />
                    <span className="flex-1">{error.message}</span>
                    {dismissible && onDismiss && (
                      <button
                        onClick={() => onDismiss(error.code)}
                        className="flex-shrink-0 text-gray-400 hover:text-gray-600"
                        aria-label={`Descartar: ${error.message}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}