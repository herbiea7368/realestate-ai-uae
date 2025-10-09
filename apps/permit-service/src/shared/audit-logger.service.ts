import { promises as fs } from 'fs';
import { dirname, resolve } from 'path';

import { Injectable, Logger } from '@nestjs/common';

type AuditEvent = {
  timestamp: string;
  actor: string;
  scope: string;
  event: string;
  summary: string;
  details?: Record<string, unknown>;
};

@Injectable()
export class AuditLoggerService {
  private readonly logger = new Logger(AuditLoggerService.name);
  private readonly logPath: string;

  constructor() {
    this.logPath =
      process.env.CONTEXT_LOG_PATH ??
      resolve(process.cwd(), '..', '..', 'logs', 'context-log.ndjson');
  }

  async log(
    scope: string,
    event: string,
    summary: string,
    details?: Record<string, unknown>,
  ): Promise<void> {
    const payload: AuditEvent = {
      timestamp: new Date().toISOString(),
      actor: 'permit-service',
      scope,
      event,
      summary,
      details,
    };

    try {
      await fs.mkdir(dirname(this.logPath), { recursive: true });
      await fs.appendFile(
        this.logPath,
        `${JSON.stringify(payload, this.replacer)}\n`,
        'utf8',
      );
    } catch (error) {
      this.logger.warn(
        `Failed to append audit event ${event}: ${(error as Error).message}`,
      );
    }
  }

  private replacer(_: string, value: unknown) {
    if (value instanceof Date) {
      return value.toISOString();
    }
    return value;
  }
}
