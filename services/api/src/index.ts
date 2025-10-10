import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import permitsRouter from './permits/controller';
import listingWriterRouter from './listing-writer/controller';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/permits', permitsRouter);
app.use('/nlp/listing-writer', listingWriterRouter);

const port = Number(process.env.PORT ?? 4001);

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`API listening on port ${port}`);
  });
}

export default app;
