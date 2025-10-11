import { config } from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import searchRouter from './routes/search.js';
import feedRouter from './routes/feed.js';
import { applySchema, seedDatabase } from './setup.js';
import { pool } from './db.js';
import { clear as clearCache } from './cache.js';
import { metricsMiddleware, startMetricsServer } from './metrics.js';

config();

const app = express();

app.use(helmet());
app.use(express.json());
app.use(metricsMiddleware);
app.use(feedRouter);

app.post('/admin/reindex', (req, res) => {
  const configuredKey = process.env.SEARCH_ADMIN_KEY;
  if (!configuredKey) {
    return res.status(500).json({
      error: 'admin_key_not_configured'
    });
  }

  const providedKey = String(req.header('x-admin-key') ?? '');
  if (!providedKey || providedKey !== configuredKey) {
    return res.status(401).json({
      error: 'unauthorised'
    });
  }

  clearCache();
  console.info('[search.cache]', { action: 'cleared', user: 'admin' });
  res.json({ ok: true });
});

app.use(searchRouter);

const port = Number(process.env.SEARCH_PORT ?? 4010);
const metricsEnabled = process.env.METRICS_ENABLED === 'true';
const metricsPort = Number(process.env.METRICS_PORT_SEARCH ?? 9102);

export async function bootstrap(): Promise<void> {
  await applySchema();
  if (process.env.SEARCH_SKIP_SEED !== 'true') {
    await seedDatabase();
  }
}

if (process.env.NODE_ENV !== 'test') {
  bootstrap()
    .then(() => {
      app.listen(port, () => {
        console.log(`Search service listening on :${port}`);
      });

      if (metricsEnabled) {
        startMetricsServer(metricsPort);
      }
    })
    .catch((error) => {
      console.error('Failed to initialise search service', error);
      pool.end().finally(() => process.exit(1));
    });
}

export default app;
