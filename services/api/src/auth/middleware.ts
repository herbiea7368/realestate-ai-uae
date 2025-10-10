import type { NextFunction, Request, Response } from 'express';
import { verifyToken } from './jwt';

function extractToken(req: Request) {
  const header = req.headers.authorization ?? '';
  if (typeof header === 'string' && header.startsWith('Bearer ')) {
    return header.slice(7);
  }
  const cookieToken = (req as Request & { cookies?: Record<string, string> }).cookies?.id_token;
  if (cookieToken) {
    return cookieToken;
  }
  return null;
}

function attachUserIfPresent(req: Request) {
  const token = extractToken(req);
  if (!token) {
    return false;
  }
  try {
    req.user = verifyToken(token);
    return true;
  } catch {
    return false;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.method === 'OPTIONS') {
    return next();
  }
  const attached = attachUserIfPresent(req);
  if (!attached) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  return next();
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  attachUserIfPresent(req);
  next();
}
