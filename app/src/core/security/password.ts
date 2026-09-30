export type HashAlgorithm = 'sha256' | 'fnv1a';

export interface PasswordHash {
  salt: string;
  hash: string;
  algo: HashAlgorithm;
}

export function generateSalt(): string {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * FNV-1a de 32 bits repetido: solo para contexts sin Web Crypto
 * (http sobre IP de red). Nunca se guarda la contraseña en claro.
 */
function fnv1a(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

export async function hashPassword(password: string, salt: string): Promise<PasswordHash> {
  const material = `${salt}:${password}`;
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(material));
      return { salt, hash: toHex(digest), algo: 'sha256' };
    } catch {
      /* cae al respaldo */
    }
  }
  const part = fnv1a(material);
  return { salt, hash: `${part}${fnv1a(part + material)}${fnv1a(material + 'x')}`, algo: 'fnv1a' };
}

export async function verifyPassword(password: string, stored: PasswordHash): Promise<boolean> {
  const candidate = await hashPassword(password, stored.salt);
  if (candidate.algo !== stored.algo) return false;
  return candidate.hash === stored.hash;
}
