import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const VAULT_RELATIVE_PATH = ['tools', 'secrets', 'vault.json.enc'] as const;
const KEY_BYTE_LENGTH = 32; // 256-bit key
const IV_LENGTH = 12; // AES-GCM recommended IV length
const AUTH_TAG_LENGTH = 16;

function resolveVaultPath(): string {
  const override = process.env.VAULT_FILE ?? process.env.VAULT_PATH;
  if (override) {
    return resolve(process.cwd(), override);
  }
  return resolve(process.cwd(), ...VAULT_RELATIVE_PATH);
}

function ensureKey(key: string): Buffer {
  if (!key) {
    throw new Error('Encryption key is required');
  }
  if (key.length !== KEY_BYTE_LENGTH * 2) {
    throw new Error(`Encryption key must be ${KEY_BYTE_LENGTH * 2} hex characters`);
  }
  return Buffer.from(key, 'hex');
}

export function encryptVault(data: unknown, key: string): void {
  const secret = ensureKey(key);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv('aes-256-gcm', secret, iv);
  const payload = Buffer.concat([
    cipher.update(JSON.stringify(data), 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  const buffer = Buffer.concat([iv, tag, payload]);
  writeFileSync(resolveVaultPath(), buffer);
}

export function decryptVault<T>(key: string): T {
  const path = resolveVaultPath();
  if (!existsSync(path)) {
    throw new Error(`Vault file missing at ${path}`);
  }
  const secret = ensureKey(key);
  const buffer = readFileSync(path);
  const iv = buffer.subarray(0, IV_LENGTH);
  const tag = buffer.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = buffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = createDecipheriv('aes-256-gcm', secret, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return JSON.parse(decrypted.toString('utf8')) as T;
}

export function readVaultRaw(): Buffer {
  const path = resolveVaultPath();
  if (!existsSync(path)) {
    throw new Error(`Vault file missing at ${path}`);
  }
  return readFileSync(path);
}
