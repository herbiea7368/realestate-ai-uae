import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'http';
import client from 'prom-client';

const register = new client.Registry();
client.collectDefaultMetrics({ register });

const ingestionRunsTotal = new client.Counter({
  name: 'ingestion_runs_total',
  help: 'Total ingestion pipeline executions grouped by result',
  labelNames: ['result']
});

const ingestionRowsWrittenTotal = new client.Counter({
  name: 'ingestion_rows_written_total',
  help: 'Total rows written to the downstream search database'
});

const ingestionLastRunTimestamp = new client.Gauge({
  name: 'ingestion_last_run_timestamp',
  help: 'Unix timestamp (seconds) of the last successful ingestion run'
});

register.registerMetric(ingestionRunsTotal);
register.registerMetric(ingestionRowsWrittenTotal);
register.registerMetric(ingestionLastRunTimestamp);

type ResultLabel = 'success' | 'empty' | 'skipped' | 'error';

let metricsServer: Server | null = null;

export const recordRun = (result: ResultLabel, rowsWritten = 0): void => {
  ingestionRunsTotal.inc({ result });

  if (rowsWritten > 0) {
    ingestionRowsWrittenTotal.inc(rowsWritten);
  }

  if (result !== 'error') {
    ingestionLastRunTimestamp.set(Math.floor(Date.now() / 1000));
  }
};

const handleRequest = async (_req: IncomingMessage, res: ServerResponse): Promise<void> => {
  const url = _req.url ?? '/';
  if (_req.method === 'GET' && url === '/metrics') {
    res.statusCode = 200;
    res.setHeader('Content-Type', register.contentType);
    res.end(await register.metrics());
    return;
  }

  res.statusCode = 404;
  res.end();
};

export const startMetricsServer = (port: number): void => {
  if (metricsServer) {
    return;
  }

  metricsServer = createServer((req, res) => {
    handleRequest(req, res).catch((error) => {
      res.statusCode = 500;
      res.end();
      console.error('[ingestion.metrics.error]', error);
    });
  }).listen(port, () => {
    console.log(`[metrics] Ingestion metrics listening on :${port}`);
  });
};

export const stopMetricsServer = (): void => {
  metricsServer?.close();
  metricsServer = null;
};

export const resetMetrics = (): void => {
  ingestionRunsTotal.reset();
  ingestionRowsWrittenTotal.reset();
  ingestionLastRunTimestamp.reset();
  register.resetMetrics();
};

export { register, ingestionRunsTotal, ingestionRowsWrittenTotal, ingestionLastRunTimestamp };
