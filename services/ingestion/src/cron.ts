import cron, { type ScheduledTask } from 'node-cron';

export function scheduleIngestion(
  expression: string,
  task: () => Promise<unknown>
): ScheduledTask {
  if (!expression || !expression.trim()) {
    throw new Error('Cron expression is required to schedule ingestion');
  }

  const scheduled = cron.schedule(expression, () => {
    task()
      .then(() => {
        console.info('[ingestion.cron]', { status: 'completed', at: new Date().toISOString() });
      })
      .catch((error) => {
        console.error('[ingestion.cron.error]', {
          message: error instanceof Error ? error.message : String(error)
        });
      });
  });

  console.info('[ingestion.cron]', { status: 'scheduled', expression });

  return scheduled;
}
