import { Menu, Bell, User, LogOut, Sun, Moon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@shared/hooks/useAuth';
import { useToast } from '@shared/ui/Toast';
import { useTheme } from '@shared/hooks/useTheme';
import { useWebSocket } from '@shared/hooks/useWebSocket';

export function Header() {
  const { user, logout } = useAuth();
  const { addToast, history } = useToast();
  const { theme, toggleTheme } = useTheme();
  const { connected } = useWebSocket();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [seenCount, setSeenCount] = useState(0);
  const notificationsRef = useRef<HTMLDivElement>(null);

  const unread = Math.max(0, history.length - seenCount);

  useEffect(() => {
    if (!showNotifications) return undefined;
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifications]);

  const handleLogout = () => {
    logout();
    addToast({ type: 'success', title: 'Sesión cerrada', message: 'Hasta pronto' });
  };

  const toggleNotifications = () => {
    const next = !showNotifications;
    if (next) setSeenCount(history.length);
    setShowNotifications(next);
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
          <div className="relative" ref={notificationsRef}>
            <button
              onClick={toggleNotifications}
              className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-300 rounded-lg"
              aria-label="Notificaciones"
              aria-expanded={showNotifications}
            >
              <Bell className="h-5 w-5" />
              {unread > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-danger-500 text-[10px] font-medium text-white flex items-center justify-center">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Notificaciones</p>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{history.length} recientes</span>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {history.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      Todavía no hay notificaciones
                    </p>
                  ) : (
                    history.slice(0, 10).map(notification => (
                      <div
                        key={notification.id}
                        className="px-4 py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {notification.title}
                          </p>
                          <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                            {new Date(notification.createdAt).toLocaleTimeString('es-ES', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        {notification.message && (
                          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                            {notification.message}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:block text-sm text-gray-500 dark:text-gray-400">Estado:</span>
            <div className="flex items-center gap-1.5">
              <span
                className={`h-2 w-2 rounded-full ${connected ? 'bg-success-500' : 'bg-danger-500'}`}
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {connected ? 'Conectado' : 'Desconectado'}
              </span>
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
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-danger-600 hover:bg-danger-50 dark:hover:bg-gray-700"
                >
                  <LogOut className="h-4 w-4" />
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
