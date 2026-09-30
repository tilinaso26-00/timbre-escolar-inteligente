import { useState } from 'react';
import { User, Wifi, HardDrive, Play, Shield as ShieldIcon, Lock, Download, Upload, FileText } from 'lucide-react';
import { clsx } from 'clsx';
import { Button } from '@shared/ui/Button';
import { Input } from '@shared/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/ui/Card';
import { Modal } from '@shared/ui/Modal';
import { useToast } from '@shared/ui/Toast';
import { useAuth } from '@shared/hooks/useAuth';
import { useSchedule } from '@shared/hooks/useSchedule';
import { DemoModePanel } from './components/DemoModePanel';
import { exportToJSON, exportToCSV, importFromJSON, downloadBackup, generateBackupFilename } from '@core/storage/backup-manager';

export function SettingsPage() {
  const { user } = useAuth();
  const { config } = useSchedule();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<'general' | 'network' | 'backup' | 'demo' | 'security'>('general');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json');
  const [importJson, setImportJson] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null);

  const deviceConfig = config[0];

  const tabs = [
    { id: 'general' as const, label: 'General', icon: User },
    { id: 'network' as const, label: 'Red', icon: Wifi },
    { id: 'backup' as const, label: 'Respaldos', icon: HardDrive },
    { id: 'demo' as const, label: 'Demo', icon: Play },
    { id: 'security' as const, label: 'Seguridad', icon: ShieldIcon },
  ];

  const handleExport = async () => {
    try {
      if (exportFormat === 'json') {
        const json = await exportToJSON();
        downloadBackup(generateBackupFilename('timbre-config'), json);
        addToast({ type: 'success', title: 'Exportado', message: 'Configuración descargada como JSON' });
      } else {
        const csv = await exportToCSV();
        const blob = new Blob([Object.values(csv).join('\n\n')], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = generateBackupFilename('timbre-config').replace('.json', '.csv');
        a.click();
        URL.revokeObjectURL(url);
        addToast({ type: 'success', title: 'Exportado', message: 'Configuración descargada como CSV' });
      }
      setShowExportModal(false);
    } catch (error) {
      addToast({ type: 'error', title: 'Error', message: 'No se pudo exportar' });
    }
  };

  const handleImport = async () => {
    try {
      const result = await importFromJSON(importJson);
      setImportResult({ success: result.success, message: result.success ? 'Configuración importada correctamente' : result.errors.join(', ') });
      if (result.success) {
        addToast({ type: 'success', title: 'Importado', message: 'Configuración importada, recargue la página' });
      }
    } catch (error) {
      setImportResult({ success: false, message: 'JSON inválido' });
    }
  };

  const handleChangePassword = () => {
    if (passwordForm.new !== passwordForm.confirm) {
      addToast({ type: 'error', title: 'Error', message: 'Las contraseñas no coinciden' });
      return;
    }
    if (passwordForm.new.length < 6) {
      addToast({ type: 'error', title: 'Error', message: 'La contraseña debe tener al menos 6 caracteres' });
      return;
    }
    addToast({ type: 'success', title: 'Actualizado', message: 'Contraseña cambiada correctamente' });
    setShowChangePassword(false);
    setPasswordForm({ current: '', new: '', confirm: '' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
          <p className="text-gray-500 mt-1">Usuario, red, respaldos, zona horaria, modo demo y seguridad</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 bg-gray-100 rounded-lg p-1 mb-6" role="tablist">
        {tabs.map(tab => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-white shadow-sm text-primary-600'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'general' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-500">Perfil de Usuario</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center">
                  <User className="h-8 w-8 text-primary-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{user?.name || 'Administrador'}</h3>
                  <p className="text-gray-500">{user?.email || 'admin@colegio.edu'}</p>
                  <span className={clsx('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', user?.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700')}>
                    {user?.role === 'admin' ? 'Administrador' : 'Operador'}
                  </span>
                </div>
              </div>
              <div className="pt-4 border-t border-gray-200">
                <Button variant="outline" onClick={() => setShowChangePassword(true)}>
                  <Lock className="h-4 w-4 mr-2" /> Cambiar contraseña
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-500">Configuración del Sistema</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Zona horaria</label>
                  <select className="w-full text-sm border border-gray-300 rounded px-2 py-1 bg-white" defaultValue="America/Guatemala">
                    <option value="America/Guatemala">Guatemala (UTC-6)</option>
                    <option value="America/Mexico_City">México (UTC-6)</option>
                    <option value="America/Bogota">Colombia (UTC-5)</option>
                    <option value="America/Lima">Perú (UTC-5)</option>
                    <option value="America/Argentina/Buenos_Aires">Argentina (UTC-3)</option>
                    <option value="Europe/Madrid">España (UTC+1/+2)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Formato de hora</label>
                  <select className="w-full text-sm border border-gray-300 rounded px-2 py-1 bg-white" defaultValue="24">
                    <option value="24">24 horas (14:30)</option>
                    <option value="12">12 horas (2:30 PM)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Idioma</label>
                  <select className="w-full text-sm border border-gray-300 rounded px-2 py-1 bg-white" defaultValue="es">
                    <option value="es">Español</option>
                    <option value="en">English</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Timbre por defecto (segundos)</label>
                  <Input
                    type="number"
                    defaultValue={deviceConfig?.bellDefaultSeconds || 3}
                    min="1"
                    max="60"
                    className="w-full"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'network' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-500">Configuración WiFi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SSID (Red principal)</label>
                  <Input value={deviceConfig?.wifi?.ssid || 'COLEGIO_WIFI'} className="w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                  <Input type="password" value={deviceConfig?.wifi?.password || 'colegio2024'} className="w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SSID Punto de acceso (fallback)</label>
                  <Input value={deviceConfig?.wifi?.apSSID || 'TimbreEscolar-Setup'} className="w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña AP</label>
                  <Input type="password" value={deviceConfig?.wifi?.apPassword || 'config1234'} className="w-full" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="fallbackAP" defaultChecked className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                <label htmlFor="fallbackAP" className="text-sm text-gray-700">Activar punto de acceso de respaldo si falla la conexión WiFi</label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-500">Servidores NTP</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Servidor primario</label>
                  <Input value={deviceConfig?.ntpServers?.[0] || 'pool.ntp.org'} className="w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Servidor secundario</label>
                  <Input value={deviceConfig?.ntpServers?.[1] || 'time.google.com'} className="w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Intervalo sincronización (min)</label>
                  <Input type="number" defaultValue={deviceConfig?.ntpSyncIntervalMinutes || 60} min="5" max="1440" className="w-full" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'backup' && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-500">Exportar Configuración</CardTitle>
                <Button variant="outline" size="sm" onClick={() => setShowExportModal(true)}>
                  <Download className="h-3.5 w-3.5 mr-1" /> Exportar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">Descargue un respaldo completo de la configuración (horarios, plantillas, excepciones, eventos, configuración del dispositivo).</p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">JSON Completo</h4>
                      <p className="text-sm text-gray-500">Incluye todos los datos estructurados</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <FileText className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">CSV</h4>
                      <p className="text-sm text-gray-500">Tablas separadas para análisis externo</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-500">Importar Configuración</CardTitle>
                <Button variant="outline" size="sm" onClick={() => { setImportJson(''); setImportResult(null); setShowImportModal(true); }}>
                  <Upload className="h-3.5 w-3.5 mr-1" /> Importar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">Restaure una configuración previamente exportada. Sobrescribirá la configuración actual.</p>
              <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                <p className="text-sm text-gray-500">Arrastre un archivo .json aquí o haga clic para seleccionar</p>
                <p className="text-xs text-gray-400 mt-1">Máx. 2MB · .json</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-500">Gestión de Historial</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Limpiar historial antiguo</p>
                  <p className="text-sm text-gray-500">Elimina eventos anteriores a una fecha específica</p>
                </div>
                <Button variant="outline">Configurar</Button>
              </div>
              <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Auto-limpieza</p>
                  <p className="text-sm text-gray-500">Eliminar eventos de más de 90 días automáticamente</p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                  <span className="text-sm text-gray-700">Activado</span>
                </label>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'demo' && (
        <div className="space-y-6">
          <DemoModePanel />
        </div>
      )}

      {activeTab === 'security' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-500">Cambiar Contraseña</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña actual</label>
                  <Input type="password" value={passwordForm.current} onChange={e => setPasswordForm({ ...passwordForm, current: e.target.value })} className="w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nueva contraseña</label>
                  <Input type="password" value={passwordForm.new} onChange={e => setPasswordForm({ ...passwordForm, new: e.target.value })} className="w-full" minLength={6} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar nueva contraseña</label>
                  <Input type="password" value={passwordForm.confirm} onChange={e => setPasswordForm({ ...passwordForm, confirm: e.target.value })} className="w-full" minLength={6} />
                </div>
              </div>
              <Button onClick={handleChangePassword} disabled={!passwordForm.current || !passwordForm.new || !passwordForm.confirm}>
                <Lock className="h-4 w-4 mr-1" /> Actualizar contraseña
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-500">Permisos de Usuario</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {user?.permissions?.map((perm, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-900 capitalize">{perm.replace(/_/g, ' ')}</span>
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">Concedido</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-500">Configuración de Sesión</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Tiempo de expiración</p>
                  <p className="text-sm text-gray-500">Cerrar sesión automáticamente tras inactividad</p>
                </div>
                <select className="text-sm border border-gray-300 rounded px-2 py-1 bg-white">
                  <option value="30">30 minutos</option>
                  <option value="60" selected>1 hora</option>
                  <option value="240">4 horas</option>
                  <option value="480">8 horas</option>
                  <option value="0">Nunca</option>
                </select>
              </div>
              <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Autenticación de dos factores</p>
                  <p className="text-sm text-gray-500">Requerir 2FA para acciones críticas</p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                  <span className="text-sm text-gray-700">Activado</span>
                </label>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Modal
        isOpen={showChangePassword}
        onClose={() => { setShowChangePassword(false); setPasswordForm({ current: '', new: '', confirm: '' }); }}
        title="Cambiar Contraseña"
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña actual</label>
            <Input type="password" value={passwordForm.current} onChange={e => setPasswordForm({ ...passwordForm, current: e.target.value })} className="w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nueva contraseña</label>
            <Input type="password" value={passwordForm.new} onChange={e => setPasswordForm({ ...passwordForm, new: e.target.value })} className="w-full" minLength={6} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar nueva contraseña</label>
            <Input type="password" value={passwordForm.confirm} onChange={e => setPasswordForm({ ...passwordForm, confirm: e.target.value })} className="w-full" minLength={6} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => { setShowChangePassword(false); setPasswordForm({ current: '', new: '', confirm: '' }); }}>Cancelar</Button>
            <Button onClick={handleChangePassword}>
              <Lock className="h-3.5 w-3.5 mr-1" /> Actualizar
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Exportar Configuración"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Seleccione el formato de exportación:</p>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="py-4" onClick={() => { setExportFormat('json'); handleExport(); }}>
              <FileText className="h-6 w-6 mx-auto mb-1 text-blue-500" />
              <div className="font-medium">JSON</div>
              <div className="text-xs text-gray-500">Estructura completa</div>
            </Button>
            <Button variant="outline" className="py-4" onClick={() => { setExportFormat('csv'); handleExport(); }}>
              <FileText className="h-6 w-6 mx-auto mb-1 text-green-500" />
              <div className="font-medium">CSV</div>
              <div className="text-xs text-gray-500">Tablas separadas</div>
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showImportModal}
        onClose={() => { setShowImportModal(false); setImportJson(''); setImportResult(null); }}
        title="Importar Configuración"
        size="md"
      >
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm font-medium text-amber-800">⚠ Esta acción sobrescribirá la configuración actual</p>
            <p className="text-xs text-amber-700 mt-1">Haga un respaldo antes de continuar</p>
          </div>
          <textarea
            value={importJson}
            onChange={e => setImportJson(e.target.value)}
            rows={8}
            className="w-full p-3 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder='Pegue aquí el JSON exportado...'
          />
          {importResult && (
            <div className={clsx('p-3 rounded-lg text-sm', importResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700')}>
              {importResult.message}
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => { setShowImportModal(false); setImportJson(''); setImportResult(null); }}>Cancelar</Button>
            <Button onClick={handleImport}>Importar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}