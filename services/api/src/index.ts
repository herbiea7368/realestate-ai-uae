import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import permitsRouter from './permits/controller';
import listingWriterRouter from './listing-writer/controller';
import pdplRouter from './pdpl/controller';
import pdplDsrRouter from './pdpl/dsr.controller';
import authRouter from './auth/controller';
import profileRouter from './profile/controller';
import moderationMiddleware from './moderation/middleware';
import { optionalAuth, requireAuth } from './auth/middleware';
import { createAuditMiddleware } from './audit/audit.middleware';
import { metricsMiddleware, startMetricsServer } from './metrics';

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
app.use(metricsMiddleware);

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/auth', authRouter);
app.use(optionalAuth);
app.use(moderationMiddleware);
app.use('/permits', createAuditMiddleware('permits'), permitsRouter);
app.use('/nlp/listing-writer', requireAuth, createAuditMiddleware('nlp/listing-writer'), listingWriterRouter);
app.use('/profile', profileRouter);
app.use(
  '/pdpl/dsr',
  requireAuth,
  createAuditMiddleware('pdpl/dsr', { action: 'DSR' }),
  pdplDsrRouter
);
app.use('/pdpl', pdplRouter);

const port = Number(process.env.PORT ?? 4001);
const metricsEnabled = process.env.METRICS_ENABLED === 'true';
const metricsPort = Number(process.env.METRICS_PORT_API ?? 9101);

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`API listening on port ${port}`);
  });

  if (metricsEnabled) {
    startMetricsServer(metricsPort);
  }
}

export default app;
