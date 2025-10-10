import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import permitsRouter from './permits/controller';
import listingWriterRouter from './listing-writer/controller';
import pdplRouter from './pdpl/controller';
import authRouter from './auth/controller';
import profileRouter from './profile/controller';
import { optionalAuth, requireAuth } from './auth/middleware';

const app = express();

app.use(helmet());
const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS
  ?.split(',')
  .map((value) => value.trim())
  .filter(Boolean);
app.use(
  cors({
    origin: allowedOrigins && allowedOrigins.length > 0 ? allowedOrigins : true,
    credentials: true
  })
);

const requestsPerMinute = Number(process.env.RATE_LIMIT_PER_MINUTE ?? 30);
const limiter = rateLimit({
  windowMs: 60_000,
  limit: Number.isFinite(requestsPerMinute) && requestsPerMinute > 0 ? requestsPerMinute : 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false
});
app.use(limiter);
app.use(express.json());
app.use(cookieParser());

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/auth', authRouter);
app.use(optionalAuth);
app.use('/permits', permitsRouter);
app.use('/nlp/listing-writer', requireAuth, listingWriterRouter);
app.use('/profile', profileRouter);
app.use('/pdpl', pdplRouter);

const port = Number(process.env.PORT ?? 4001);

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`API listening on port ${port}`);
  });
}

export default app;
