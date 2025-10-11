process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
process.env.METRICS_ENABLED = 'false';

import { register as apiRegister } from '../services/api/src/metrics';
import { register as searchRegister } from '../services/search/src/metrics.js';
import { register as ingestionRegister } from '../services/ingestion/src/metrics';

async function requireMetric(register: typeof apiRegister, metric: string): Promise<void> {
  try {
    const snapshot = await register.getSingleMetricAsString(metric);
    if (!snapshot.includes(metric)) {
      throw new Error(`Metric ${metric} missing in snapshot`);
    }
  } catch (error) {
    throw new Error(`Metric ${metric} missing: ${(error as Error).message}`);
  }
}

async function main(): Promise<void> {
  await requireMetric(apiRegister, 'http_request_duration_ms');
  await requireMetric(searchRegister, 'http_request_duration_ms');
  await requireMetric(ingestionRegister, 'ingestion_runs_total');
  await requireMetric(ingestionRegister, 'ingestion_rows_written_total');
  await requireMetric(ingestionRegister, 'ingestion_last_run_timestamp');

  console.log('metrics smoke ok');
}

main().catch((error) => {
  console.error('[metrics-smoke] failed', error);
  process.exitCode = 1;
});
