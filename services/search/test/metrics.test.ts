import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import app from '../src/index.js';
import { register, resetMetrics } from '../src/metrics.js';

describe('metrics middleware', () => {
  beforeEach(async () => {
    await resetMetrics();
  });

  it('records metrics for incoming requests', async () => {
    await request(app).get('/health').expect(200);

    const counters = await register.getSingleMetricAsString('http_requests_total');
    expect(counters).toContain('route="/health"');

    const histogram = await register.getSingleMetricAsString('http_request_duration_ms');
    expect(histogram).toContain('http_request_duration_ms_bucket');
  });
});
