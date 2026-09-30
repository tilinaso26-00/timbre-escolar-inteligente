import { useEffect, useState } from 'react';
import { toZonedTime, format } from 'date-fns-tz';
import { es } from 'date-fns/locale';
import { Bell, Clock, RotateCcw, Settings } from 'lucide-react';
import { useSchedule } from '@shared/hooks/useSchedule';
import { useToast } from '@shared/ui/Toast';
import { Button } from '@shared/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/ui/Card';
import { ConfirmModal } from '@shared/ui/Modal';
import { clsx } from 'clsx';

const TIMEZONE = 'America/Guatemala';

const JOURNEY_LABELS = {
  matutina: { label: 'Jornada Matutina', icon: '🌅', color: 'bg-yellow-100 text-yellow-700' },
  vespertina: { label: 'Jornada Vespertina', icon: '🌆', color: 'bg-blue-100 text-blue-700' }
} as const;

export function Dashboard() {
  const {
    connected,
    deviceStatus,
    activeJourney,
    setActiveJourney,
    currentTime,
    nextEvent,
    journeys,
    ringManualBell,
    syncToDevice,
    refresh
  } = useSchedule();
  const { addToast } = useToast();

  const [showManualBellModal, setShowManualBellModal] = useState(false);
  const [manualBellDuration, setManualBellDuration] = useState(3);
  const [ringing, setRinging] = useState(false);
  const [lastBell, setLastBell] = useState<{ name: string; time: string; type: string } | null>(null);
  const [liveTime, setLiveTime] = useState(new Date());
  const [countdown, setCountdown] = useState<string>('--:--:--');

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (nextEvent) {
      const updateCountdown = () => {
        const now = toZonedTime(new Date(), TIMEZONE);
        const diffMs = nextEvent.inMs - (now.getTime() - currentTime.getTime());
        if (diffMs <= 0) {
          setCountdown('00:00:00');
        } else {
          const hours = Math.floor(diffMs / 3600000);
          const minutes = Math.floor((diffMs % 3600000) / 60000);
          const seconds = Math.floor((diffMs % 60000) / 1000);
          setCountdown(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        }
      };
      updateCountdown();
      const interval = setInterval(updateCountdown, 1000);
      return () => clearInterval(interval);
    } else {
      setCountdown('--:--:--');
    }
  }, [nextEvent, currentTime]);

  const handleManualBell = async () => {
    setRinging(true);
    try {
      await ringManualBell(manualBellDuration);
      const now = toZonedTime(new Date(), TIMEZONE);
      setLastBell({ name: 'Timbre Manual', time: format(now, 'HH:mm:ss', { locale: es }), type: 'manual' });
      addToast({ type: 'success', title: 'Timbre activado', message: `Timbre manual sonó por ${manualBellDuration} segundo(s)` });
    } catch {
      addToast({ type: 'error', title: 'Error', message: 'No se pudo activar el timbre' });
    } finally {
      setRinging(false);
      setShowManualBellModal(false);
    }
  };

  const handleSync = async () => {
    const success = await syncToDevice();
    if (success) {
      addToast({ type: 'info', title: 'Sincronizando', message: 'Enviando horario al dispositivo...' });
    } else {
      addToast({ type: 'error', title: 'Error', message: 'Dispositivo no conectado' });
    }
  };

  const formatLiveTime = (date: Date) => {
    const zoned = toZonedTime(date, TIMEZONE);
    return format(zoned, 'HH:mm:ss', { locale: es });
  };

  const formatLiveDate = (date: Date) => {
    const zoned = toZonedTime(date, TIMEZONE);
    return format(zoned, 'EEEE, d \'de\' MMMM \'de\' yyyy', { locale: es });
  };

  const journeyInfo = JOURNEY_LABELS[activeJourney];
  const activeJourneyData = journeys.find(j => j.journey === activeJourney);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Centro de Control</h1>
          <p className="text-gray-500 mt-1">Timbre Escolar Inteligente - Monitoreo en tiempo real</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleSync} disabled={!connected}>
            <RotateCcw className="h-4 w-4 mr-2" /> Sincronizar
          </Button>
          <Button onClick={refresh}>
            <RotateCcw className="h-4 w-4 mr-2" /> Actualizar
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-500">Estado del Sistema</CardTitle>
              <div className={clsx('flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium', connected ? 'bg-success-50 text-success-700' : 'bg-danger-50 text-danger-700')}>
                <span className={clsx('h-1.5 w-1.5 rounded-full', connected ? 'bg-success-500' : 'bg-danger-500')} />
                {connected ? 'Conectado' : 'Desconectado'}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">ESP32</span>
                <span className={clsx('font-medium', connected ? 'text-success-600' : 'text-danger-600')}>
                  {connected ? '● Conectado' : '● Desconectado'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">WiFi</span>
                <span className={clsx('font-medium', deviceStatus?.wifi ? 'text-success-600' : 'text-danger-600')}>
                  {deviceStatus?.wifi ? '● Conectado' : '● Sin señal'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Última sync</span>
                <span className="font-medium text-gray-900">
                  {deviceStatus?.lastSync ? format(toZonedTime(new Date(deviceStatus.lastSync), TIMEZONE), 'HH:mm:ss', { locale: es }) : 'Nunca'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Reloj dispositivo</span>
                <span className="font-medium text-gray-900 font-mono">{deviceStatus?.deviceTime || '--:--:--'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Jornada Activa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className={clsx('flex items-center gap-3 px-4 py-3 rounded-lg', journeyInfo.color)}>
                <span className="text-2xl">{journeyInfo.icon}</span>
                <div>
                  <p className="font-semibold text-gray-900">{journeyInfo.label}</p>
                  <p className="text-sm text-gray-600">
                    {activeJourneyData ? `${formatTime(activeJourneyData.entryTime)} - ${formatTime(activeJourneyData.exitTime)}` : 'Sin horario'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {(['matutina', 'vespertina'] as const).map(j => (
                  <Button
                    key={j}
                    variant={activeJourney === j ? 'primary' : 'outline'}
                    size="sm"
                    className="flex-1"
                    onClick={() => setActiveJourney(j)}
                  >
                    {JOURNEY_LABELS[j].icon} {JOURNEY_LABELS[j].label.split(' ')[1]}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Fecha y Hora</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <p className="text-3xl font-bold font-mono text-gray-900">{formatLiveTime(liveTime)}</p>
              <p className="text-sm text-gray-500 mt-1">{formatLiveDate(liveTime)}</p>
              <p className="text-xs text-gray-400 mt-1">Zona horaria: Guatemala (UTC-6)</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Próximo Timbre</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              {nextEvent ? (
                <>
                  <p className="text-lg font-semibold text-gray-900 mb-1">{nextEvent.name}</p>
                  <p className="text-sm text-gray-500 mb-3">Programado para las {nextEvent.at}</p>
                  <div className="text-2xl font-bold font-mono text-primary-600">{countdown}</div>
                  <p className="text-xs text-gray-400 mt-1">Faltan</p>
                </>
              ) : (
                <div className="text-gray-500 py-8">
                  <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No hay eventos programados</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-500">Último Timbre Ejecutado</CardTitle>
              <Bell className="h-5 w-5 text-gray-400" />
            </div>
          </CardHeader>
          <CardContent>
            {lastBell ? (
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                  <Bell className="h-6 w-6 text-primary-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{lastBell.name}</p>
                  <p className="text-sm text-gray-500">{lastBell.time} · {lastBell.type === 'manual' ? 'Manual' : 'Automático'}</p>
                </div>
                <span className={clsx('px-3 py-1 rounded-full text-xs font-medium', lastBell.type === 'manual' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700')}>
                  {lastBell.type === 'manual' ? 'Manual' : 'Automático'}
                </span>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No hay timbres registrados aún</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Timbre Manual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm text-gray-600 text-center">Activación inmediata de emergencia</p>
              <div className="grid grid-cols-5 gap-1">
                {[1, 2, 3, 5, 10].map(sec => (
                  <button
                    key={sec}
                    onClick={() => setManualBellDuration(sec)}
                    className={clsx(
                      'py-2 px-2 rounded-lg text-sm font-medium transition-colors',
                      manualBellDuration === sec
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    )}
                  >
                    {sec}s
                  </button>
                ))}
              </div>
              <Button
                variant="danger"
                size="lg"
                fullWidth
                onClick={() => setShowManualBellModal(true)}
                disabled={ringing || !connected}
                loading={ringing}
              >
                <Bell className="h-5 w-5 mr-2" />
                {ringing ? 'Sonando...' : 'HACER SONAR TIMBRE'}
              </Button>
              {!connected && (
                <p className="text-xs text-danger-600 text-center">Requiere conexión al dispositivo</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-gray-500">Accesos Rápidos</CardTitle>
            <Settings className="h-5 w-5 text-gray-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <QuickActionCard icon="📅" title="Horarios" desc="Editar matutina/vespertina" href="/horarios" />
            <QuickActionCard icon="🗓️" title="Calendario" desc="Días especiales, feriados" href="/calendario" />
            <QuickActionCard icon="📋" title="Plantillas" desc="Normal, Corto, Examen..." href="/plantillas" />
            <QuickActionCard icon="📊" title="Historial" desc="Registro completo de timbres" href="/historial" />
            <QuickActionCard icon="📱" title="Dispositivo" desc="Estado, prueba, config" href="/dispositivo" />
            <QuickActionCard icon="⚙️" title="Configuración" desc="Usuario, red, respaldos" href="/configuracion" />
          </div>
        </CardContent>
      </Card>

      <ConfirmModal
        isOpen={showManualBellModal}
        onClose={() => setShowManualBellModal(false)}
        onConfirm={handleManualBell}
        title="Confirmar timbre manual"
        message={`¿Desea activar el timbre manualmente por ${manualBellDuration} segundo(s)? Esta acción sonará el timbre físico inmediatamente.`}
        confirmText="HACER SONAR"
        cancelText="Cancelar"
        variant="danger"
        loading={ringing}
      />
    </div>
  );
}

function QuickActionCard({ icon, title, desc, href }: { icon: string; title: string; desc: string; href: string }) {
  return (
    <a href={href} className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 hover:border-gray-300 transition-colors">
      <span className="text-2xl">{icon}</span>
      <div className="min-w-0">
        <p className="font-medium text-gray-900 truncate">{title}</p>
        <p className="text-sm text-gray-500 truncate">{desc}</p>
      </div>
    </a>
  );
}

function formatTime(time: { hours: number; minutes: number }): string {
  return `${time.hours.toString().padStart(2, '0')}:${time.minutes.toString().padStart(2, '0')}`;
}