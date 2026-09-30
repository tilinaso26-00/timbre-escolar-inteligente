import { NavLink, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  Home,
  Calendar,
  Clock,
  BookOpen,
  History,
  Wifi,
  Settings,
  Bell,
  Sun,
  Moon
} from 'lucide-react';
import { useAuth } from '@shared/hooks/useAuth';

const navigation = [
  { name: 'Inicio', href: '/', icon: Home },
  { name: 'Horarios', href: '/horarios', icon: Clock },
  { name: 'Calendario', href: '/calendario', icon: Calendar },
  { name: 'Jornadas', href: '/jornadas', icon: Sun },
  { name: 'Plantillas', href: '/plantillas', icon: BookOpen },
  { name: 'Historial', href: '/historial', icon: History },
  { name: 'Dispositivo', href: '/dispositivo', icon: Wifi },
  { name: 'Configuración', href: '/configuracion', icon: Settings }
];

export function Sidebar() {
  const location = useLocation();
  const { user, logout } = useAuth();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 lg:translate-x-0">
      <div className="flex h-full flex-col">
        <div className="flex h-16 items-center justify-between px-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Bell className="h-8 w-8 text-primary-600" />
            <span className="text-xl font-bold text-gray-900">Timbre Escolar</span>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto" aria-label="Navegación principal">
          {navigation.map(item => {
            const isActive = location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href));
            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive: active }) => clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  active
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                {item.name}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.name || 'Administrador'}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email || 'admin@colegio.edu'}</p>
            </div>
            <button
              onClick={logout}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Cerrar sesión"
            >
              <Moon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}