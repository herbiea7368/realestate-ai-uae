import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomBytes } from 'crypto';
import { encryptVault, decryptVault } from '../../../tools/secrets/vault';

describe('vault encryption', () => {
  const masterKey = randomBytes(32).toString('hex');
  let tempDir: string;
  let vaultFile: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'vault-test-'));
    vaultFile = join(tempDir, 'vault.json.enc');
    process.env.VAULT_FILE = vaultFile;
  });

  afterEach(() => {
    delete process.env.VAULT_FILE;
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('round-trips data through encrypt/decrypt', () => {
    const payload = { secret: 'value', counter: 1 };
    encryptVault(payload, masterKey);

    const decrypted = decryptVault<typeof payload>(masterKey);
    expect(decrypted).toEqual(payload);
  });
});
