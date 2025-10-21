import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { delimiter, join, resolve } from 'path';
import { spawnSync } from 'child_process';

const backupScript = resolve(__dirname, '../../../tools/backup/backup.sh');

function createStubExecutable(dir: string, name: string, content: string): void {
  const filePath = join(dir, name);
  writeFileSync(filePath, content);
  chmodSync(filePath, 0o755);
}

describe('backup script', () => {
  let binDir: string;

  beforeEach(() => {
    binDir = mkdtempSync(join(tmpdir(), 'backup-bin-'));
    createStubExecutable(
      binDir,
      'pg_dump',
      '#!/usr/bin/env bash\nprintf \"mock dump\"'
    );
    createStubExecutable(
      binDir,
      'openssl',
      '#!/usr/bin/env bash\ncat -'
    );
    createStubExecutable(
      binDir,
      'aws',
      '#!/usr/bin/env bash\ncat - > /dev/null\nexit 0'
    );
  });

  afterEach(() => {
    rmSync(binDir, { recursive: true, force: true });
  });

  it('completes successfully when dependencies respond', () => {
    const result = spawnSync('bash', [backupScript], {
      env: {
        ...process.env,
        DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/realestate',
        BACKUP_ENCRYPTION_KEY: 'example-key',
        BACKUP_BUCKET_URL: 's3://example-bucket',
        PATH: `${binDir}${delimiter}${process.env.PATH ?? ''}`
      }
    });

    expect(result.status).toBe(0);
    expect(result.stdout.toString()).toContain('Validated: backup uploaded');
  });
});
