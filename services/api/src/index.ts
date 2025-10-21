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
import auditExportRouter from './audit/export.controller';
import paymentsRouter from './payments/payments.controller';
import paymentsDashboardRouter from './payments/dashboard.controller';
import notifyRouter from './notify/controller';
import { bootstrapNotificationWorkers } from './notify/worker';
import moderationMiddleware from './moderation/middleware';
import { optionalAuth, requireAuth } from './auth/middleware';
import { createAuditMiddleware } from './audit/audit.middleware';
import { metricsMiddleware, startMetricsServer } from './metrics';
import rbacRouter from './rbac/rbac.controller';
import { requirePermission } from './rbac/rbac.middleware';
import { resolveTenant } from './tenant/resolve';
import tenantRouter from './tenant/controller';
import billingRouter from './billing/billing.controller';
import billingWebhookRouter from './billing/webhooks.controller';
import { enforceTenantScope } from './tenant/guard';
import adminTenantsRouter from './admin/tenants.controller';
import eventsRouter from './events/controller';
import chatRouter from './chat/controller';
import chatAnalyticsRouter from './chat/analytics.controller';
import { chatLimiter } from './rate-limit';

const app = express();

function parseCspPolicy(policy: string | undefined): Record<string, string[]> | undefined {
  if (!policy) {
    return undefined;
  }
  const directives: Record<string, string[]> = {};
  for (const entry of policy.split(';')) {
    const trimmed = entry.trim();
    if (!trimmed) {
      continue;
    }
    const [name, ...values] = trimmed.split(/\s+/);
    if (!name) {
      continue;
    }
    directives[name] = values.length > 0 ? values : ["'self'"];
  }
  return directives;
}

const configuredCsp =
  parseCspPolicy(process.env.CSP_POLICY) ??
  {
    'default-src': ["'self'"],
    'img-src': ['*', 'data:'],
    'script-src': ["'self'"],
    'connect-src': ['*']
  };

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: configuredCsp
    }
  })
);
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
app.use('/billing/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());
app.use(cookieParser());
app.use(metricsMiddleware);
app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/auth', authRouter);
app.use('/billing/webhook', billingWebhookRouter);
app.use(optionalAuth);
app.use(resolveTenant);
app.use(enforceTenantScope);
app.use(moderationMiddleware);
app.use('/permits', createAuditMiddleware('permits'), permitsRouter);
app.use(
  '/nlp/listing-writer',
  requireAuth,
  createAuditMiddleware('nlp/listing-writer'),
  listingWriterRouter
);
app.use('/profile', profileRouter);
app.use(
  '/pdpl/dsr',
  requireAuth,
  createAuditMiddleware('pdpl/dsr', { action: 'DSR' }),
  pdplDsrRouter
);
app.use('/audit', requireAuth, createAuditMiddleware('audit/export', { action: 'AUDIT_EXPORT' }), auditExportRouter);
app.use('/pdpl', pdplRouter);
app.use(
  '/tenant',
  requireAuth,
  createAuditMiddleware('tenant', { action: 'TENANT_MANAGEMENT' }),
  tenantRouter
);
app.use(
  '/billing',
  requireAuth,
  createAuditMiddleware('billing', { action: 'BILLING' }),
  billingRouter
);
app.use(
  '/payments',
  requireAuth,
  createAuditMiddleware('payments', { action: 'PAYMENT_FLOW' }),
  paymentsRouter
);
app.use(
  '/events',
  createAuditMiddleware('events', { action: 'USER_ACTIVITY' }),
  eventsRouter
);
app.use(
  '/admin/payments',
  requireAuth,
  requirePermission('admin'),
  createAuditMiddleware('admin/payments', { action: 'PAYMENT_ADMIN' }),
  paymentsDashboardRouter
);
app.use(
  '/admin/tenants',
  requireAuth,
  requirePermission('admin'),
  createAuditMiddleware('admin/tenants', { action: 'TENANT_ADMIN' }),
  adminTenantsRouter
);
app.use(
  '/notify',
  requireAuth,
  createAuditMiddleware('notify', { action: 'NOTIFY' }),
  notifyRouter
);
app.use('/rbac', requireAuth, createAuditMiddleware('rbac'), rbacRouter);
app.use(
  '/chat/analytics',
  requireAuth,
  requirePermission('admin'),
  createAuditMiddleware('chat/analytics', { action: 'CHAT_ANALYTICS' }),
  chatAnalyticsRouter
);
app.use('/chat/query', chatLimiter);
app.use('/chat', createAuditMiddleware('chat', { action: 'CHAT_QUERY' }), chatRouter);

bootstrapNotificationWorkers();

const port = Number(process.env.PORT ?? 4001);
const metricsEnabled = process.env.METRICS_ENABLED === 'true';
const metricsPort = Number(process.env.METRICS_PORT_API ?? 9101);
const healthcheckPort = Number(process.env.HEALTHCHECK_PORT ?? 8088);

function startHealthServer(): void {
  const healthApp = express();
  healthApp.get('/healthz', (_req, res) => {
    res.json({
      ok: true,
      uptime: process.uptime(),
      ts: new Date().toISOString()
    });
  });
  healthApp.listen(healthcheckPort, () => {
    console.log(`API healthcheck listening on :${healthcheckPort}`);
  });
}

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`API listening on port ${port}`);
  });

  if (metricsEnabled) {
    startMetricsServer(metricsPort);
  }

  startHealthServer();
}

export default app;
