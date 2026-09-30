import { Menu, Bell, User, LogOut, Sun, Moon } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@shared/hooks/useAuth';
import { useToast } from '@shared/ui/Toast';
import { useTheme } from '@shared/hooks/useTheme';

export function Header() {
  const { user, logout } = useAuth();
  const { addToast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const handleLogout = () => {
    logout();
    addToast({ type: 'success', title: 'Sesión cerrada', message: 'Hasta pronto' });
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 lg:ml-64">
      <div className="flex h-full items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <button
            className="lg:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            aria-label="Abrir menú"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 lg:flex lg:items-center lg:justify-end gap-4">
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-300 rounded-lg"
              aria-label="Notificaciones"
              aria-expanded={showNotifications}
            >
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-danger-500 text-[10px] font-medium text-white flex items-center justify-center">
                3
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:block text-sm text-gray-500 dark:text-gray-400">Estado:</span>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-success-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Conectado</span>
            </div>
          </div>

          <button
            onClick={toggleTheme}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-300 rounded-lg"
            aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>

          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-300 rounded-lg"
              aria-label="Notificaciones"
              aria-expanded={showNotifications}
            >
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-danger-500 text-[10px] font-medium text-white flex items-center justify-center">
                3
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-300 rounded-lg"
                aria-label="Menú de usuario"
                aria-expanded={showUserMenu}
              >
                <div className="h-8 w-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                </div>
                <span className="hidden sm:block text-sm font-medium text-gray-700 dark:text-gray-300">{user?.name || 'Admin'}</span>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1">
                  <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user?.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-danger-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <LogOut className="h-4 w-4" />
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}