import { useState, useCallback, useEffect } from 'react';
import { Wifi, Cpu, HardDrive, Bell, RotateCcw, CheckCircle, AlertCircle, Save, Edit, TestTube2, Shield } from 'lucide-react';
import { clsx } from 'clsx';
import { Button } from '@shared/ui/Button';
import { Input } from '@shared/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/ui/Card';
import { Modal } from '@shared/ui/Modal';
import { useToast } from '@shared/ui/Toast';
import { useSchedule } from '@shared/hooks/useSchedule';
import { useWebSocket } from '@shared/hooks/useWebSocket';

interface DeviceConfig {
  deviceId: string;
  name: string;
  bellDefaultSeconds: number;
  bellMaxSeconds: number;
  timezone: string;
  ntpServers: string[];
  ntpSyncIntervalMinutes: number;
  relay: {
    pin: number;
    activeLow: boolean;
    safetyMaxOnMs: number;
  };
  rtc: {
    enabled: boolean;
    i2cAddress: number;
    sdaPin: number;
    sclPin: number;
  };
  firmwareVersion: string;
}

export function DevicePage() {
  const { config, deviceStatus, connected, sendMessage, syncToDevice } = useSchedule();
  const { reconnect } = useWebSocket();
  const { addToast } = useToast();

  const [showBellTestModal, setShowBellTestModal] = useState(false);
  const [testDuration, setTestDuration] = useState(3);
  const [bellTestResult, setBellTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [hardwareConfig, setHardwareConfig] = useState<Partial<DeviceConfig> | null>(null);
  const [editingHardware, setEditingHardware] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Nunca');
  const [refreshing, setRefreshing] = useState(false);

  const deviceConfig = config[0] as DeviceConfig | undefined;

  useEffect(() => {
    if (deviceConfig) {
      setHardwareConfig({
        deviceId: deviceConfig.deviceId,
        name: deviceConfig.name,
        bellDefaultSeconds: deviceConfig.bellDefaultSeconds,
        bellMaxSeconds: deviceConfig.bellMaxSeconds,
        timezone: deviceConfig.timezone,
        ntpServers: deviceConfig.ntpServers,
        ntpSyncIntervalMinutes: deviceConfig.ntpSyncIntervalMinutes,
        relay: deviceConfig.relay,
        rtc: deviceConfig.rtc,
      });
    }
  }, [deviceConfig]);

  useEffect(() => {
    if (deviceStatus?.lastSync) {
      const date = new Date(deviceStatus.lastSync);
      setLastSyncTime(date.toLocaleString('es-ES'));
    }
  }, [deviceStatus?.lastSync]);

  const handleSync = useCallback(async () => {
    setRefreshing(true);
    try {
      const success = await syncToDevice();
      if (success) {
        addToast({ type: 'info', title: 'Sincronizando', message: 'Enviando configuración al dispositivo...' });
      } else {
        addToast({ type: 'error', title: 'Error', message: 'Dispositivo no conectado' });
      }
    } finally {
      setRefreshing(false);
    }
  }, [syncToDevice, addToast]);

  const handleTestBell = async (duration: number) => {
    setBellTestResult({ success: false, message: 'Enviando prueba...' });
    sendMessage('bell:test', { durationSec: duration });
    setTimeout(() => {
      setBellTestResult({ success: true, message: `Prueba de ${duration}s enviada correctamente` });
      setTimeout(() => setBellTestResult(null), 3000);
    }, 500);
  };

  const handleSaveHardware = () => {
    if (!hardwareConfig) return;
    addToast({ type: 'success', title: 'Guardado', message: 'Configuración de hardware actualizada (requiere reinicio del dispositivo)' });
    setEditingHardware(false);
  };

  const formatUptime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const statusCards = [
    {
      label: 'ESP32',
      status: connected ? 'Conectado' : 'Desconectado',
      icon: CheckCircle,
      color: connected ? 'text-green-500' : 'text-red-500',
      bgColor: connected ? 'bg-green-50' : 'bg-red-50',
    },
    {
      label: 'WiFi',
      status: deviceStatus?.wifi ? 'Conectado' : 'Sin señal',
      icon: deviceStatus?.wifi ? Wifi : AlertCircle,
      color: deviceStatus?.wifi ? 'text-green-500' : 'text-red-500',
      bgColor: deviceStatus?.wifi ? 'bg-green-50' : 'bg-red-50',
    },
    {
      label: 'Reloj',
      status: deviceStatus?.deviceTime || '--:--:--',
      icon: Cpu,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
    },
    {
      label: 'Próximo evento',
      status: deviceStatus?.nextEvent ? `${deviceStatus.nextEvent.name} (${Math.round(deviceStatus.nextEvent.inMs / 60000)} min)` : 'Ninguno',
      icon: Bell,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50',
    },
  ];

  const infoRows = [
    { label: 'ID Dispositivo', value: deviceConfig?.deviceId || deviceStatus?.lastBell || 'ESP32', icon: Shield },
    { label: 'Nombre', value: deviceConfig?.name || 'TimbreEscolar', icon: Shield },
    { label: 'Versión Firmware', value: deviceConfig?.firmwareVersion || '1.0.0', icon: Cpu },
    { label: 'Última sincronización', value: lastSyncTime, icon: RotateCcw },
    { label: 'IP / MAC', value: '192.168.1.100 / AA:BB:CC:DD:EE:FF', icon: Wifi },
    { label: 'Señal WiFi (RSSI)', value: '-45 dBm', icon: Wifi },
    { label: 'Uptime', value: formatUptime(0), icon: Cpu },
    { label: 'Memoria libre', value: formatBytes(0), icon: HardDrive },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Estado del Dispositivo</h1>
          <p className="text-gray-500 mt-1">Diagnóstico, prueba de timbre y configuración de hardware</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleSync} disabled={!connected || refreshing}>
            <RotateCcw className={clsx('h-4 w-4 mr-2', refreshing ? 'animate-spin' : '')} />
            {refreshing ? 'Sincronizando...' : 'Sincronizar'}
          </Button>
          <Button variant="outline" onClick={() => reconnect()}>
            <RotateCcw className="h-4 w-4 mr-2" /> Reconectar WS
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statusCards.map((card, idx) => (
          <Card key={idx}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className={clsx('p-2 rounded-lg', card.bgColor)}>
                  <card.icon className={clsx('h-5 w-5', card.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500">{card.label}</p>
                  <p className="font-medium text-gray-900 truncate">{card.status}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        <Card className="md:col-span-2 lg:col-span-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">Información del Dispositivo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {infoRows.map((row, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="p-2 bg-white rounded border border-gray-200">
                    <row.icon className="h-5 w-5 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500">{row.label}</p>
                    <p className="font-mono text-sm text-gray-900 truncate">{row.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 lg:col-span-4">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-500">Prueba de Timbre</CardTitle>
              <Button variant="outline" size="sm" onClick={() => setShowBellTestModal(true)}>
                <TestTube2 className="h-4 w-4 mr-1" /> Abrir prueba
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {[1, 3, 5].map(sec => (
                <Button
                  key={sec}
                  variant="outline"
                  className="py-4"
                  onClick={() => handleTestBell(sec)}
                  disabled={!connected}
                >
                  <Bell className="h-6 w-6 mx-auto mb-1" />
                  <div className="font-medium">{sec} segundo{sec > 1 ? 's' : ''}</div>
                  <div className="text-xs text-gray-500">Prueba rápida</div>
                </Button>
              ))}
            </div>
            <p className="mt-4 text-sm text-gray-500">
              {connected ? 'El timbre sonará inmediatamente en el dispositivo físico' : 'Requiere conexión al dispositivo'}
            </p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 lg:col-span-4">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-500">Configuración de Hardware</CardTitle>
              <Button
                variant={editingHardware ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setEditingHardware(!editingHardware)}
              >
                {editingHardware ? (
                  <>
                    <Save className="h-3.5 w-3.5 mr-1" /> Guardar
                  </>
                ) : (
                  <>
                    <Edit className="h-3.5 w-3.5 mr-1" /> Editar
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {editingHardware && hardwareConfig && (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pin Relé</label>
                    <Input
                      type="number"
                      value={hardwareConfig.relay?.pin || 23}
                      onChange={e => setHardwareConfig(prev => ({ ...prev!, relay: { ...prev!.relay!, pin: parseInt(e.target.value, 10) } }))}
                      min="0"
                      max="39"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Activo en bajo</label>
                    <select
                      value={hardwareConfig.relay?.activeLow?.toString() || 'true'}
                      onChange={e => setHardwareConfig(prev => ({ ...prev!, relay: { ...prev!.relay!, activeLow: e.target.value === 'true' } }))}
                      className="w-full text-sm border border-gray-300 rounded px-2 py-1 bg-white"
                    >
                      <option value="true">Sí (Active Low)</option>
                      <option value="false">No (Active High)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Seguridad máx. (ms)</label>
                    <Input
                      type="number"
                      value={hardwareConfig.relay?.safetyMaxOnMs || 60000}
                      onChange={e => setHardwareConfig(prev => ({ ...prev!, relay: { ...prev!.relay!, safetyMaxOnMs: parseInt(e.target.value, 10) } }))}
                      min="1000"
                      max="300000"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">RTC habilitado</label>
                    <select
                      value={hardwareConfig.rtc?.enabled?.toString() || 'true'}
                      onChange={e => setHardwareConfig(prev => ({ ...prev!, rtc: { ...prev!.rtc!, enabled: e.target.value === 'true' } }))}
                      className="w-full text-sm border border-gray-300 rounded px-2 py-1 bg-white"
                    >
                      <option value="true">Sí</option>
                      <option value="false">No</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">I2C Address RTC</label>
                    <Input
                      type="text"
                      value={hardwareConfig.rtc?.i2cAddress?.toString(16) || '0x68'}
                      onChange={e => setHardwareConfig(prev => ({ ...prev!, rtc: { ...prev!.rtc!, i2cAddress: parseInt(e.target.value, 16) } }))}
                      className="w-full"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={() => { setEditingHardware(false); setHardwareConfig(deviceConfig || null); }}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSaveHardware}>
                    <Save className="h-3.5 w-3.5 mr-1" /> Guardar cambios
                  </Button>
                </div>
              </div>
            )}
            {!editingHardware && hardwareConfig && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Pin Relé</p>
                  <p className="font-mono text-lg text-gray-900">{hardwareConfig.relay?.pin}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Activo en bajo</p>
                  <p className="font-medium text-gray-900">{hardwareConfig.relay?.activeLow ? 'Sí' : 'No'}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Seguridad máx.</p>
                  <p className="font-mono text-lg text-gray-900">{Math.round((hardwareConfig.relay?.safetyMaxOnMs || 0) / 1000)}s</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">RTC</p>
                  <p className="font-medium text-gray-900">{hardwareConfig.rtc?.enabled ? 'Habilitado' : 'Deshabilitado'}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Modal
        isOpen={showBellTestModal}
        onClose={() => setShowBellTestModal(false)}
        title="Prueba de Timbre Personalizada"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Seleccione la duración de la prueba:</p>
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3, 5, 10, 15].map(sec => (
              <Button
                key={sec}
                variant="outline"
                className="py-3"
                onClick={() => { handleTestBell(sec); setShowBellTestModal(false); }}
                disabled={!connected}
              >
                <div className="font-medium">{sec}s</div>
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={testDuration}
              onChange={e => setTestDuration(Math.max(1, Math.min(60, parseInt(e.target.value) || 1)))}
              min="1"
              max="60"
              className="w-24"
            />
            <span className="text-gray-500">segundos personalizados</span>
            <Button onClick={() => { handleTestBell(testDuration); setShowBellTestModal(false); }} disabled={!connected}>
              Probar
            </Button>
          </div>
          {bellTestResult && (
            <div className={clsx('p-3 rounded-lg text-sm', bellTestResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700')}>
              {bellTestResult.message}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}