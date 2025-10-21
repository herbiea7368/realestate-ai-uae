import { decryptVault, encryptVault } from './vault.js';

type VaultShape = Record<string, string>;

function requireMasterKey(): string {
  const key = process.env.ENCRYPTION_MASTER_KEY ?? '';
  if (!key) {
    throw new Error('ENCRYPTION_MASTER_KEY is required');
  }
  return key;
}

function readVault(key: string): VaultShape {
  try {
    return decryptVault<VaultShape>(key);
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes('Vault file missing') || error.message.includes('bad decrypt'))
    ) {
      return {};
    }
    throw error;
  }
}

function listSecrets(data: VaultShape): void {
  const entries = Object.entries(data);
  if (entries.length === 0) {
    console.log('Vault empty');
    return;
  }
  for (const [name, value] of entries) {
    console.log(`${name}=${value}`);
  }
}

function getSecret(data: VaultShape, key: string): void {
  if (!(key in data)) {
    console.error(`Secret "${key}" not found`);
    process.exitCode = 1;
    return;
  }
  console.log(data[key]);
}

function setSecret(data: VaultShape, name: string, value: string, key: string): void {
  const updated = { ...data, [name]: value };
  encryptVault(updated, key);
  console.log(`Secret "${name}" updated`);
}

function main(): void {
  const [command, arg1, arg2] = process.argv.slice(2);
  if (!command) {
    console.error('Usage: tsx tools/secrets/cli.ts <list|get|set> [key] [value]');
    process.exit(1);
  }

  const masterKey = requireMasterKey();
  const vault = readVault(masterKey);

  if (command === 'list') {
    listSecrets(vault);
    return;
  }

  if (command === 'get') {
    if (!arg1) {
      console.error('Usage: tsx tools/secrets/cli.ts get <key>');
      process.exit(1);
    }
    getSecret(vault, arg1);
    return;
  }

  if (command === 'set') {
    if (!arg1 || arg2 === undefined) {
      console.error('Usage: tsx tools/secrets/cli.ts set <key> <value>');
      process.exit(1);
    }
    setSecret(vault, arg1, arg2, masterKey);
    return;
  }

  console.error(`Unknown command "${command}"`);
  process.exit(1);
}

if (process.argv[1] && process.argv[1].endsWith('cli.ts')) {
  main();
}
