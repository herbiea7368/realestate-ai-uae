import type { NextFunction, Request, Response } from 'express';
import { logAuditEvent } from './audit.logger';

interface AuditMiddlewareOptions {
  action?: string;
}

export function createAuditMiddleware(routeLabel: string, options: AuditMiddlewareOptions = {}) {
  return function auditHandler(req: Request, res: Response, next: NextFunction) {
    let responsePayload: unknown;

    const originalJson = res.json.bind(res);
    res.json = ((body?: unknown) => {
      responsePayload = body;
      return originalJson(body);
    }) as typeof res.json;

    const originalSend = res.send.bind(res);
    res.send = ((body?: unknown) => {
      responsePayload = body;
      return originalSend(body);
    }) as typeof res.send;

    res.on('finish', () => {
      logAuditEvent({
        route: routeLabel || req.originalUrl,
        method: req.method,
        status: res.statusCode,
        body: req.body,
        result: responsePayload,
        userId: req.user?.sub ?? null,
        action: options.action
      }).catch((error) => {
        console.error('[audit.middleware] failed to log event', error);
      });
    });

    next();
  };
}
