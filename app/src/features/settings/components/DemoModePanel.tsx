import { Bell, Zap, FastForward, Pause, Play, RotateCcw } from 'lucide-react';
import { clsx } from 'clsx';
import { Button } from '@shared/ui/Button';
import { Input } from '@shared/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/ui/Card';
import { useToast } from '@shared/ui/Toast';
import { useDemoMode, DemoEvent } from '@shared/hooks/useDemoMode';

const DEMO_EVENTS: DemoEvent[] = [
  { name: 'Entrada', type: 'entrada', journey: 'matutina' },
  { name: 'Cambio Período 1', type: 'cambio_periodo', journey: 'matutina' },
  { name: 'Cambio Período 2', type: 'cambio_periodo', journey: 'matutina' },
  { name: 'Recreo', type: 'recreo_inicio', journey: 'matutina' },
  { name: 'Fin Recreo', type: 'recreo_fin', journey: 'matutina' },
  { name: 'Cambio Período 3', type: 'cambio_periodo', journey: 'matutina' },
  { name: 'Cambio Período 4', type: 'cambio_periodo', journey: 'matutina' },
  { name: 'Salida', type: 'salida', journey: 'matutina' },
];

function getSpeedPresets() {
  return [
    { value: 1, label: 'Tiempo real (1x)' },
    { value: 60, label: '1s = 1min (estándar)' },
    { value: 120, label: '1s = 2min' },
    { value: 240, label: '1s = 4min' },
    { value: 720, label: '1s = 12min' },
    { value: 1440, label: '1s = 24min (máx)' },
  ];
}

export function DemoModePanel() {
  const {
    running,
    speed,
    formatSimulatedTime,
    getProgress,
    startDemo,
    stopDemo,
    setSpeed,
    triggerNextEvent,
    forceBell,
    resetDemo,
  } = useDemoMode();
  const { addToast } = useToast();

  const progress = getProgress();
  const currentEventIndex = Math.min(DEMO_EVENTS.length - 1, Math.max(0, Math.floor(progress / 100 * DEMO_EVENTS.length)));
  const nextEvent = running && currentEventIndex < DEMO_EVENTS.length ? DEMO_EVENTS[currentEventIndex] : null;

  const handleSpeedChange = (newSpeed: number) => { setSpeed(newSpeed); };
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => { handleSpeedChange(parseInt(e.target.value)); };
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 1;
    handleSpeedChange(Math.max(1, Math.min(1440, value)));
  };
  const handleTriggerEvent = (eventName: string) => {
    const event = DEMO_EVENTS.find(e => e.name === eventName);
    if (event) { triggerNextEvent(); }
  };
  const handleForceBell = () => { forceBell(); };
  const handleReset = () => {
    if (confirm('¿Reiniciar la simulación al inicio (7:00 AM)?')) {
      resetDemo();
      addToast({ type: 'info', title: 'Demo reiniciada', message: 'Simulación vuelta a 7:00 AM' });
    }
  };

  const nextEventContent = running && nextEvent ? (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg"><Bell className="h-5 w-5 text-blue-600" /></div>
          <div>
            <p className="font-medium text-gray-900">Próximo evento: {nextEvent.name}</p>
            <p className="text-sm text-gray-500">Tipo: {nextEvent.type.replace('_', ' ')}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => triggerNextEvent()}>
          <FastForward className="h-3.5 w-3.5 mr-1" /> Ejecutar ahora
        </Button>
      </div>
    </div>
  ) : null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-gray-500">Modo Demostración</CardTitle>
            <Button variant={running ? 'danger' : 'primary'} size="sm" onClick={running ? stopDemo : startDemo}>
              {running ? <><Pause className="h-3.5 w-3.5 mr-1" /> Detener</> : <><Play className="h-3.5 w-3.5 mr-1" /> Iniciar</>}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={clsx('p-3 rounded-full', running ? 'bg-green-100' : 'bg-gray-100')}>
                  {running ? <Play className="h-6 w-6 text-green-600 animate-pulse" /> : <Pause className="h-6 w-6 text-gray-400" />}
                </div>
                <div>
                  <p className="font-medium text-gray-900">Estado: {running ? 'Ejecutándose' : 'Detenido'}</p>
                  <p className="text-sm text-gray-500">Hora simulada: {formatSimulatedTime()}{running && <span className="ml-2 text-primary-600 font-mono">⏱ {Math.round(progress)}% completado</span>}</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 mt-2 pt-4 border-t border-gray-200">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Velocidad de simulación</label>
                  <div className="flex items-center gap-2">
                    <input type="range" min="1" max="1440" value={speed} onChange={handleSliderChange} className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-500" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">1s real =</span>
                  <Input type="number" value={speed} onChange={handleInputChange} min="1" max="1440" className="w-20" />
                  <span className="text-sm text-gray-500">min simulados</span>
                  <select value={speed} onChange={e => handleSpeedChange(parseInt(e.target.value))} className="ml-2 text-sm border border-gray-300 rounded px-2 py-1 bg-white">
                    {getSpeedPresets().map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {nextEventContent}

          <div className="grid gap-3 md:grid-cols-3">
            {DEMO_EVENTS.map(event => (
              <Button key={event.name} variant="outline" disabled={!running} onClick={() => handleTriggerEvent(event.name)}>
                <Bell className="h-4 w-4 mr-1" /> {event.name}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button variant="outline" onClick={handleForceBell} disabled={!running}>
              <Zap className="h-3.5 w-3.5 mr-1" /> Forzar timbre
            </Button>
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reiniciar (7:00 AM)
            </Button>
          </div>

          <p className="text-xs text-gray-500">Ejemplos: 1 = tiempo real, 60 = 1s = 1min (estándar), 1440 = 1s = 24min (máx)</p>
        </CardContent>
      </Card>
    </div>
  );
}