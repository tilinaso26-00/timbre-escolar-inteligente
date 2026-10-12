const AUTH_TOKEN = 'timbre-escolar-2024';

const HTTP_CANDIDATES = ['http://192.168.4.1', 'http://TimbreEscolar.local'];

let cachedBase: string | null = null;

async function tryFetch(path: string, init?: RequestInit): Promise<Response | null> {
  const bases = cachedBase ? [cachedBase, ...HTTP_CANDIDATES.filter(b => b !== cachedBase)] : HTTP_CANDIDATES;
  for (const base of bases) {
    try {
      const res = await fetch(base + path, {
        ...init,
        headers: {
          Authorization: `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json',
          ...(init?.headers ?? {}),
        },
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        cachedBase = base;
        return res;
      }
      console.warn(`[deviceHttp] ${base}${path} -> HTTP ${res.status}`);
    } catch (error) {
      console.warn(`[deviceHttp] ${base}${path} fallo:`, error);
    }
  }
  return null;
}

export async function httpGet<T = unknown>(path: string): Promise<T | null> {
  const res = await tryFetch(path, { method: 'GET' });
  if (!res) return null;
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function httpPost<T = unknown>(path: string, body?: unknown): Promise<T | null> {
  const res = await tryFetch(path, {
    method: 'POST',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res) return null;
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** Devuelve true si el ESP32 responde por HTTP (aunque el WebSocket no conecte). */
export async function pingDevice(): Promise<boolean> {
  const status = await httpGet<Record<string, unknown>>('/api/status');
  return status !== null && status.connected === true;
}

/**
 * Activa el timbre por HTTP. Usado como fallback cuando el WebSocket no conecta.
 * Devuelve true si el ESP32 confirmó.
 */
export async function httpBell(durationSec: number, test = false): Promise<boolean> {
  const path = test ? '/api/bell/test' : '/api/bell/manual';
  const res = await httpPost<{ status?: string }>(path, { durationSec });
  return res !== null && res.status === 'ok';
}

export function resetHttpCache(): void {
  cachedBase = null;
}
