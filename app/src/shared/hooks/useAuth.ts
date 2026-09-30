import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  generateSalt,
  hashPassword,
  verifyPassword,
  type PasswordHash,
} from '@core/security/password';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'operator';
  permissions: string[];
}

export interface ChangePasswordResult {
  ok: boolean;
  error?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  lastActivityAt: number | null;
  idleTimeoutMinutes: number;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  touch: () => void;
  setIdleTimeout: (minutes: number) => void;
  changePassword: (current: string, next: string) => Promise<ChangePasswordResult>;
  updateUser: (user: Partial<User>) => void;
}

const DEFAULT_EMAIL = 'admin@colegio.edu';
const DEFAULT_PASSWORD = 'admin123';
const CREDENTIALS_KEY = 'timbre.credentials';

const DEMO_USER: User = {
  id: '1',
  name: 'Administrador',
  email: DEFAULT_EMAIL,
  role: 'admin',
  permissions: ['manage_schedules', 'manage_templates', 'manage_calendar', 'manual_bell', 'device_config', 'view_logs', 'backup_restore']
};

async function loadCredentials(): Promise<PasswordHash> {
  try {
    const raw = localStorage.getItem(CREDENTIALS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PasswordHash;
      if (parsed?.salt && parsed?.hash) return parsed;
    }
  } catch {
    /* se regenera abajo */
  }
  const created = await hashPassword(DEFAULT_PASSWORD, generateSalt());
  localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(created));
  return created;
}

function storeCredentials(credentials: PasswordHash): void {
  localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(credentials));
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      loading: false,
      lastActivityAt: null,
      idleTimeoutMinutes: 60,

      login: async (email: string, password: string) => {
        set({ loading: true });
        try {
          const credentials = await loadCredentials();
          const valid = email === DEFAULT_EMAIL && (await verifyPassword(password, credentials));
          if (valid) {
            set({
              user: DEMO_USER,
              token: 'session-' + Date.now(),
              isAuthenticated: true,
              loading: false,
              lastActivityAt: Date.now(),
            });
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
        set({ user: null, token: null, isAuthenticated: false, loading: false, lastActivityAt: null });
      },

      touch: () => {
        set({ lastActivityAt: Date.now() });
      },

      setIdleTimeout: (minutes: number) => {
        set({ idleTimeoutMinutes: minutes, lastActivityAt: Date.now() });
      },

      changePassword: async (current: string, next: string) => {
        if (next.length < 6) return { ok: false, error: 'La contraseña debe tener al menos 6 caracteres' };
        const credentials = await loadCredentials();
        if (!(await verifyPassword(current, credentials))) {
          return { ok: false, error: 'La contraseña actual es incorrecta' };
        }
        storeCredentials(await hashPassword(next, generateSalt()));
        return { ok: true };
      },

      updateUser: (userData) => {
        set(state => ({ user: state.user ? { ...state.user, ...userData } : null }));
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        lastActivityAt: state.lastActivityAt,
        idleTimeoutMinutes: state.idleTimeoutMinutes
      })
    }
  )
);

export function usePermission(permission: string): boolean {
  const user = useAuth(state => state.user);
  return user?.permissions.includes(permission) ?? false;
}
