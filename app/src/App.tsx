import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ToastProvider } from '@shared/ui/Toast';
import { Layout } from '@shared/layout';
import { useAuth } from '@shared/hooks/useAuth';
import { ThemeProvider } from '@shared/hooks/useTheme';
import { Login } from '@features/auth/Login';
import { Dashboard } from '@features/dashboard/Dashboard';
import { SchedulePage } from '@features/schedules/SchedulePage';
import { CalendarPage } from '@features/calendar/CalendarPage';
import { TemplatesPage } from '@features/templates/TemplatesPage';
import { HistoryPage } from '@features/history/HistoryPage';
import { DevicePage } from '@features/device/DevicePage';
import { SettingsPage } from '@features/settings/SettingsPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function FeaturePlaceholder({ title, description }: { title: string; description: string }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
      <div className="text-6xl mb-4">🚧</div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{title}</h2>
      <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">{description}</p>
      <p className="mt-4 text-sm text-gray-400 dark:text-gray-500">En desarrollo...</p>
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="horarios" element={<SchedulePage />} />
        <Route path="calendario" element={<CalendarPage />} />
        <Route path="plantillas" element={<TemplatesPage />} />
        <Route path="jornadas" element={<FeaturePlaceholder title="Gestión de Jornadas" description="Configuración independiente Matutina y Vespertina" />} />
        <Route path="historial" element={<HistoryPage />} />
        <Route path="dispositivo" element={<DevicePage />} />
        <Route path="configuracion" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AppRoutes />
        <Toaster position="bottom-right" />
      </ToastProvider>
    </ThemeProvider>
  );
}