import { performance } from 'node:perf_hooks';

type Target = {
  name: string;
  url: string;
  sloMs: number;
};

const targets: Target[] = [
  {
    name: 'api-health',
    url: process.env.SYNTHETIC_API_URL ?? 'http://localhost:4001/health',
    sloMs: 300
  },
  {
    name: 'search-health',
    url: process.env.SYNTHETIC_SEARCH_URL ?? 'http://localhost:4010/health',
    sloMs: 800
  }
];

async function probe(target: Target): Promise<void> {
  const started = performance.now();
  try {
    const response = await fetch(target.url, { method: 'GET' });
    const duration = performance.now() - started;
    if (!response.ok) {
      throw new Error(`Response ${response.status}`);
    }

    const status = duration > target.sloMs ? 'breach' : 'ok';
    console.log(
      `[synthetic] ${target.name} status=${status} duration=${duration.toFixed(0)}ms slo=${target.sloMs}ms`
    );
  } catch (error) {
    console.error(
      `[synthetic] ${target.name} failed to reach ${target.url}: ${(error as Error).message}`
    );
    process.exitCode = 1;
  }
}

async function main(): Promise<void> {
  for (const target of targets) {
    await probe(target);
  }
}

main().catch((error) => {
  console.error('[synthetic] unexpected failure', error);
  process.exitCode = 1;
});
