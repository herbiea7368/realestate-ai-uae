import request from 'supertest';
import app from '../src/index';
import { register, resetMetrics } from '../src/metrics';

describe('metrics middleware', () => {
  beforeEach(async () => {
    await resetMetrics();
  });

  it('records counters and histograms for handled requests', async () => {
    await request(app).get('/health').expect(200);

    const snapshot = await register.getSingleMetricAsString('http_requests_total');
    expect(snapshot).toContain('route="/health"');
    expect(snapshot).toContain('method="GET"');
    expect(snapshot).toContain('code="200"');

    const histogram = await register.getSingleMetricAsString('http_request_duration_ms');
    expect(histogram).toContain('http_request_duration_ms_bucket');
  });
});
