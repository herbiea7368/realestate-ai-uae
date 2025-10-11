import express from 'express';
import type { Request, Response } from 'express';
import type { Server } from 'http';
import client from 'prom-client';

const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestDurationMs = new client.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in milliseconds',
  labelNames: ['route', 'method', 'code'],
  buckets: [50, 100, 200, 300, 500, 1000]
});

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Count of processed HTTP requests',
  labelNames: ['route', 'method', 'code']
});

register.registerMetric(httpRequestDurationMs);
register.registerMetric(httpRequestsTotal);

let metricsServer: Server | null = null;

const resolveRoute = (req: Request): string => {
  if (req.route?.path) {
    return `${req.baseUrl ?? ''}${req.route.path}`;
  }
  if (req.baseUrl) {
    return req.baseUrl;
  }
  return req.path ?? req.originalUrl ?? 'unknown';
};

const attachObservers = (req: Request, res: Response): void => {
  const startedAt = process.hrtime.bigint();

  const record = (code: number, count = true): void => {
    const elapsed = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const labels = {
      route: resolveRoute(req),
      method: req.method,
      code: String(code)
    };

    httpRequestDurationMs.observe(labels, elapsed);
    if (count) {
      httpRequestsTotal.inc(labels);
    }
  };

  res.on('finish', () => {
    record(res.statusCode);
  });

  res.on('close', () => {
    if (!res.writableEnded) {
      record(res.statusCode ?? 499, false);
    }
  });
};

export const metricsMiddleware = (req: Request, res: Response, next: () => void): void => {
  attachObservers(req, res);
  next();
};

export const startMetricsServer = (port: number): void => {
  if (metricsServer) {
    return;
  }

  const metricsApp = express();
  metricsApp.get('/metrics', async (_req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  });

  metricsServer = metricsApp.listen(port, () => {
    console.log(`[metrics] Search metrics listening on :${port}`);
  });
};

export const stopMetricsServer = (): void => {
  metricsServer?.close();
  metricsServer = null;
};

export const resetMetrics = async (): Promise<void> => {
  httpRequestDurationMs.reset();
  httpRequestsTotal.reset();
  register.resetMetrics();
};

export { register, httpRequestDurationMs, httpRequestsTotal };
