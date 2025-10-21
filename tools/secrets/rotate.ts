import { randomBytes } from 'crypto';
import { decryptVault, encryptVault } from './vault.js';

export function rotate(oldKey: string, newKey: string): void {
  if (!oldKey) {
    throw new Error('Missing ENCRYPTION_MASTER_KEY_OLD');
  }
  const payload = decryptVault<Record<string, string>>(oldKey);
  encryptVault(payload, newKey);
  console.log('Vault re-encrypted with new key');
}

function runCli(): void {
  const [command] = process.argv.slice(2);
  if (command !== 'rotate') {
    console.error('Usage: tsx tools/secrets/rotate.ts rotate');
    process.exit(1);
  }

  const oldKey = process.env.ENCRYPTION_MASTER_KEY_OLD ?? '';
  const newKey = randomBytes(32).toString('hex');

  rotate(oldKey, newKey);
  console.log(`::add-mask::${newKey}`);
  console.log(`NEW KEY: ${newKey}`);
}

if (process.argv[1] && process.argv[1].endsWith('rotate.ts')) {
  runCli();
}
