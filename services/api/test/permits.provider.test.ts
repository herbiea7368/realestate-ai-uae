describe('trakheesi provider factory', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalBase = process.env.TRAKHEESI_API_BASE;
  const originalKey = process.env.TRAKHEESI_API_KEY;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.TRAKHEESI_API_BASE = originalBase;
    process.env.TRAKHEESI_API_KEY = originalKey;
    jest.resetModules();
  });

  it('returns the mock provider outside production', async () => {
    process.env.NODE_ENV = 'development';
    jest.resetModules();
    const { getProvider } = await import('../src/permits/provider.factory');
    const provider = getProvider();
    const result = await provider.verify('12345678');
    expect(result.status).toBe('valid');
  });

  it('returns the DLD provider when NODE_ENV=production', async () => {
    process.env.NODE_ENV = 'production';
    process.env.TRAKHEESI_API_BASE = 'https://example.com';
    process.env.TRAKHEESI_API_KEY = 'testing';
    jest.resetModules();
    const { getProvider } = await import('../src/permits/provider.factory');
    const provider = getProvider();
    const valid = await provider.verify('12345678');
    const invalid = await provider.verify('12345670');
    expect(valid.status).toBe('valid');
    expect(invalid.status).toBe('invalid');
  });
});

describe('permit service caching', () => {
  let checkPermit: (trakheesi: string) => Promise<{ source: string; status: string; expiresAt: number }>;
  let getPermit: (trakheesi: string) => Promise<{ source: string; status: string; expiresAt: number }>;
  let clearPermitCache: () => Promise<void>;

  beforeEach(async () => {
    process.env.NODE_ENV = 'test';
    process.env.CACHE_PROVIDER = 'memory';
    jest.resetModules();
    const serviceModule = await import('../src/permits/service');
    checkPermit = serviceModule.checkPermit;
    getPermit = serviceModule.getPermit;
    clearPermitCache = serviceModule.clearPermitCache;
    await clearPermitCache();
  });

  afterEach(async () => {
    await clearPermitCache();
  });

  it('hydrates cache after provider verification', async () => {
    const first = await checkPermit('12345678');
    expect(first.source).toBe('provider');
    expect(first.status).toBe('valid');

    const second = await getPermit('12345678');
    expect(second.source).toBe('cache');
    expect(second.status).toBe('valid');
    expect(second.expiresAt).toBe(first.expiresAt);
  });
});
