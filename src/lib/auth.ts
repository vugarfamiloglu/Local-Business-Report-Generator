/* Web Crypto HMAC session — Edge-runtime safe. */

const COOKIE_NAME = 'tally_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14;

function getSecret(): string {
  return process.env.TALLY_SESSION_SECRET || 'tally-default-session-secret-do-not-ship';
}
async function importKey(): Promise<CryptoKey> {
  const raw = new TextEncoder().encode(getSecret());
  return crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

function b64url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = '';
  for (const b of arr) s += String.fromCharCode(b);
  return btoa(s).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}
function fromB64url(s: string): Uint8Array<ArrayBuffer> {
  const pad = '='.repeat((4 - (s.length % 4)) % 4);
  const b64 = (s + pad).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const ab  = new ArrayBuffer(bin.length);
  const out = new Uint8Array(ab);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function signSession(payload: Record<string, unknown>): Promise<string> {
  const exp  = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const body = b64url(new TextEncoder().encode(JSON.stringify({ ...payload, exp })));
  const key  = await importKey();
  const sig  = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  return `${body}.${b64url(sig)}`;
}

export async function verifySession(token: string | undefined | null): Promise<Record<string, unknown> | null> {
  if (!token || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  try {
    const key = await importKey();
    const ok  = await crypto.subtle.verify('HMAC', key, fromB64url(sig), new TextEncoder().encode(body));
    if (!ok) return null;
    const payload = JSON.parse(new TextDecoder().decode(fromB64url(body))) as { exp?: number; [k: string]: unknown };
    if (typeof payload.exp === 'number' && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch { return null; }
}

export { COOKIE_NAME, SESSION_TTL_SECONDS };
