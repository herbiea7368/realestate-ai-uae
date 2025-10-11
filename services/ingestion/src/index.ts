import { config } from 'dotenv';
import fetch from 'node-fetch';
import { fetchFeed, type FeedResult } from './fetcher';
import { normaliseListings } from './normalizer';
import { scheduleIngestion } from './cron';
import { writeListings, type WriteResult, type WriterOptions } from './writer';
import type { IngestionSummary, NormalisedListing, RawFeedItem } from './types';
import { recordRun, startMetricsServer } from './metrics';

config();

const isDirectExecution = typeof require !== 'undefined' && require.main === module;
const metricsEnabled = process.env.METRICS_ENABLED === 'true';
const metricsPort = Number(process.env.METRICS_PORT_INGEST ?? 9103);

if (metricsEnabled && process.env.NODE_ENV !== 'test') {
  startMetricsServer(metricsPort);
}

type RunIngestionDependencies = {
  sourceUrl?: string;
  fetchFeedFn?: (sourceUrl: string) => Promise<FeedResult>;
  normaliseFn?: (items: RawFeedItem[]) => NormalisedListing[];
  writeFn?: (items: NormalisedListing[], options?: WriterOptions) => Promise<WriteResult>;
  writerOptions?: WriterOptions;
  invalidateCacheFn?: (result: WriteResult) => Promise<void>;
};

export async function runIngestion(
  dependencies: RunIngestionDependencies = {}
): Promise<IngestionSummary> {
  const sourceUrl = dependencies.sourceUrl ?? process.env.INGESTION_SOURCE_URL ?? '';
  if (!sourceUrl) {
    throw new Error('INGESTION_SOURCE_URL is not configured');
  }

  const fetchFn = dependencies.fetchFeedFn ?? fetchFeed;
  const normaliseFn = dependencies.normaliseFn ?? normaliseListings;
  const writeFn = dependencies.writeFn ?? writeListings;

  try {
    const { items, format } = await fetchFn(sourceUrl);
    if (!items.length) {
      console.info('[ingestion.run]', {
        total: 0,
        normalised: 0,
        format,
        message: 'No listings returned from source feed'
      });
      const summary: IngestionSummary = {
        total: 0,
        normalised: 0,
        inserted: 0,
        updated: 0,
        skipped: 0
      };
      recordRun('empty');
      return summary;
    }

    const normalised = normaliseFn(items);
    if (!normalised.length) {
      console.warn('[ingestion.run]', {
        total: items.length,
        normalised: 0,
        format,
        message: 'No listings satisfied normalisation rules'
      });
      const summary: IngestionSummary = {
        total: items.length,
        normalised: 0,
        inserted: 0,
        updated: 0,
        skipped: items.length
      };
      recordRun('skipped');
      return summary;
    }

    const writeResult = await writeFn(normalised, dependencies.writerOptions);
    const invalidateCache = dependencies.invalidateCacheFn ?? invalidateSearchCache;
    await invalidateCache(writeResult);

    const summary: IngestionSummary = {
      total: items.length,
      normalised: normalised.length,
      inserted: writeResult.inserted,
      updated: writeResult.updated,
      skipped: writeResult.skipped
    };

    console.info('[ingestion.run]', {
      ...summary,
      format
    });

    recordRun('success', writeResult.inserted + writeResult.updated);
    return summary;
  } catch (error) {
    recordRun('error');
    throw error;
  }
}

async function invalidateSearchCache(result: WriteResult): Promise<void> {
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  const changes = result.inserted + result.updated;
  if (changes === 0) {
    return;
  }

  const adminKey = process.env.SEARCH_ADMIN_KEY;
  if (!adminKey) {
    console.warn('[ingestion.reindex]', 'SEARCH_ADMIN_KEY not set, skipping cache invalidation');
    return;
  }

  const baseUrl =
    process.env.SEARCH_SERVICE_URL ??
    process.env.NEXT_PUBLIC_SEARCH_URL ??
    'http://localhost:4010';
  const endpoint = `${baseUrl.replace(/\/$/, '')}/admin/reindex`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'X-ADMIN-KEY': adminKey
      }
    });

    if (!response.ok) {
      console.error('[ingestion.reindex]', {
        status: response.status,
        statusText: response.statusText
      });
    } else {
      console.info('[ingestion.reindex]', { status: 'cleared', endpoint });
    }
  } catch (error) {
    console.error('[ingestion.reindex]', {
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

function initialiseCron(): void {
  const cronExpression = process.env.INGESTION_CRON?.trim();
  const isTestEnv = process.env.NODE_ENV === 'test';
  const schedulingDisabled = process.env.INGESTION_DISABLE_SCHEDULE === 'true';

  if (cronExpression && !isTestEnv && !schedulingDisabled) {
    scheduleIngestion(cronExpression, () =>
      runIngestion().catch((error) => {
        console.error('[ingestion.cron.run.error]', {
          message: error instanceof Error ? error.message : String(error)
        });
      })
    );
  }
}

const shouldAutoStart =
  process.env.NODE_ENV !== 'test' && process.env.INGESTION_DISABLE_AUTO_START !== 'true';

if (shouldAutoStart && isDirectExecution) {
  initialiseCron();

  runIngestion().catch((error) => {
    console.error('[ingestion.run.error]', {
      message: error instanceof Error ? error.message : String(error)
    });
    process.exitCode = 1;
  });
}
