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

const routeLabel = (req: Request): string => {
  if (req.route?.path) {
    return `${req.baseUrl ?? ''}${req.route.path}`;
  }
  if (req.baseUrl) {
    return req.baseUrl;
  }
  return req.path ?? req.originalUrl ?? 'unknown';
};

const observeRequest = (req: Request, res: Response): void => {
  const start = process.hrtime.bigint();
  const record = (resultCode: number, finished = true): void => {
    const diff = Number(process.hrtime.bigint() - start) / 1_000_000;
    const labels = {
      route: routeLabel(req),
      method: req.method,
      code: String(resultCode)
    };
    httpRequestDurationMs.observe(labels, diff);
    if (finished) {
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
  observeRequest(req, res);
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
    console.log(`[metrics] API metrics listening on :${port}`);
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
