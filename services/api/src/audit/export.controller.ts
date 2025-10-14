import { Router } from 'express';
import { createReadStream, promises as fs } from 'fs';
import readline from 'readline';
import { getAuditLogPath } from './audit.logger';

const exportRouter = Router();

exportRouter.get('/export', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'forbidden' });
  }

  const sinceParam = req.query.since;
  let sinceDate: Date | null = null;
  if (typeof sinceParam === 'string') {
    const parsed = new Date(sinceParam);
    if (Number.isNaN(parsed.getTime())) {
      return res.status(400).json({ error: 'invalid_since' });
    }
    sinceDate = parsed;
  }

  const logPath = getAuditLogPath();
  try {
    await fs.access(logPath);
  } catch {
    return res.status(404).json({ error: 'audit_log_missing' });
  }

  res.setHeader('Content-Type', 'application/x-ndjson');
  res.setHeader('Content-Disposition', 'attachment; filename="audit-export.ndjson"');

  const stream = createReadStream(logPath, { encoding: 'utf8' });
  const reader = readline.createInterface({ input: stream, crlfDelay: Infinity });

  reader.on('line', (line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return;
    }
    try {
      const record = JSON.parse(trimmed) as { ts?: string };
      if (sinceDate && record.ts) {
        const recordDate = new Date(record.ts);
        if (Number.isNaN(recordDate.getTime()) || recordDate < sinceDate) {
          return;
        }
      } else if (sinceDate && !record.ts) {
        return;
      }
      res.write(`${JSON.stringify(record)}\n`);
    } catch (error) {
      console.error('[audit.export] failed to parse log line', error);
    }
  });

  reader.once('close', () => {
    res.end();
  });

  stream.once('error', (error) => {
    console.error('[audit.export] stream error', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'stream_error' });
    } else {
      res.destroy(error as Error);
    }
  });

  req.once('close', () => {
    reader.close();
    stream.destroy();
  });
});

export default exportRouter;

