/* AES-256-GCM at-rest vault — TALLY-prefixed env vars + key path. */

import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const VAULT_KEY_PATH = process.env.TALLY_DB_PATH
  ? resolve(dirname(process.env.TALLY_DB_PATH), '.vault-key')
  : resolve(process.cwd(), 'data', '.vault-key');

let _key: Buffer | null = null;

function loadOrCreateKey(): Buffer {
  if (_key) return _key;
  const env = process.env.TALLY_VAULT_KEY;
  if (env) {
    const k = Buffer.from(env, 'base64');
    if (k.length !== 32) throw new Error('TALLY_VAULT_KEY must decode to 32 bytes');
    _key = k; return _key;
  }
  if (existsSync(VAULT_KEY_PATH)) {
    const raw = readFileSync(VAULT_KEY_PATH, 'utf8').trim();
    const k = Buffer.from(raw, 'base64');
    if (k.length !== 32) throw new Error('on-disk vault key must decode to 32 bytes');
    _key = k; return _key;
  }
  const dir = dirname(VAULT_KEY_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const k = randomBytes(32);
  writeFileSync(VAULT_KEY_PATH, k.toString('base64'), 'utf8');
  try { chmodSync(VAULT_KEY_PATH, 0o600); } catch {}
  _key = k; return _key;
}

export function encryptString(plain: string): string {
  const key = loadOrCreateKey();
  const iv  = randomBytes(12);
  const c   = createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
  const tag = c.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

export function decryptString(packed: string): string {
  const key = loadOrCreateKey();
  const buf = Buffer.from(packed, 'base64');
  if (buf.length < 12 + 16) throw new Error('vault payload too short');
  const iv  = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const d   = createDecipheriv('aes-256-gcm', key, iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(enc), d.final()]).toString('utf8');
}
