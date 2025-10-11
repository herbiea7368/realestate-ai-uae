import { config } from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import searchRouter from './routes/search.js';
import { applySchema, seedDatabase } from './setup.js';
import { pool } from './db.js';

config();

const app = express();

app.use(helmet());
app.use(express.json());
app.use(searchRouter);

const port = Number(process.env.SEARCH_PORT ?? 4010);

export async function bootstrap(): Promise<void> {
  await applySchema();
  if (process.env.SEARCH_SKIP_SEED !== 'true') {
    await seedDatabase();
  }
}

if (process.env.NODE_ENV !== 'test') {
  bootstrap()
    .then(() => {
      app.listen(port, () => {
        console.log(`Search service listening on :${port}`);
      });
    })
    .catch((error) => {
      console.error('Failed to initialise search service', error);
      pool.end().finally(() => process.exit(1));
    });
}

export default app;
