import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'operator';
  permissions: string[];
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

const DEMO_USER: User = {
  id: '1',
  name: 'Administrador',
  email: 'admin@colegio.edu',
  role: 'admin',
  permissions: ['manage_schedules', 'manage_templates', 'manage_calendar', 'manual_bell', 'device_config', 'view_logs', 'backup_restore']
};

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      loading: false,

      login: async (email: string, password: string) => {
        set({ loading: true });
        try {
          if (email === 'admin@colegio.edu' && password === 'admin123') {
            const token = 'demo-jwt-token-' + Date.now();
            set({ user: DEMO_USER, token, isAuthenticated: true, loading: false });
            return true;
          }
          set({ loading: false });
          return false;
        } catch {
          set({ loading: false });
          return false;
        }
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false, loading: false });
      },

      updateUser: (userData) => {
        set(state => ({ user: state.user ? { ...state.user, ...userData } : null }));
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated })
    }
  )
);

export function usePermission(permission: string): boolean {
  const user = useAuth(state => state.user);
  return user?.permissions.includes(permission) ?? false;
}