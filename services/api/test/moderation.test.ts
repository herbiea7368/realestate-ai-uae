import { moderate } from '../src/moderation/moderation.service';

const originalThreshold = process.env.MODERATION_THRESHOLD;
const originalEnabled = process.env.MODERATION_ENABLED;

describe('moderation service', () => {
  beforeEach(() => {
    process.env.MODERATION_THRESHOLD = '0.8';
    process.env.MODERATION_ENABLED = 'true';
  });

  afterAll(() => {
    if (originalThreshold === undefined) {
      delete process.env.MODERATION_THRESHOLD;
    } else {
      process.env.MODERATION_THRESHOLD = originalThreshold;
    }
    if (originalEnabled === undefined) {
      delete process.env.MODERATION_ENABLED;
    } else {
      process.env.MODERATION_ENABLED = originalEnabled;
    }
  });

  it('flags toxic keywords above the moderation threshold', () => {
    const result = moderate('This listing is a total fraud.');
    expect(result.flagged).toBe(true);
    expect(result.reasons).toContain('toxicity_threshold_exceeded');
    expect(result.score).toBeGreaterThanOrEqual(result.threshold);
  });

  it('detects PII such as UAE phone numbers', () => {
    const result = moderate('Call me at +97112345678 for details.');
    expect(result.flagged).toBe(true);
    expect(result.reasons).toContain('pii_detected');
    expect(result.pii.phones).toContain('+97112345678');
  });
});
