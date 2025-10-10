import jwt, { JsonWebTokenError, JwtPayload, type Secret, type SignOptions } from 'jsonwebtoken';
import type { UserClaims } from '../types';

const secret: Secret = process.env.API_JWT_SECRET ?? 'change_me';

export function signToken(payload: UserClaims, expiresIn: SignOptions['expiresIn'] = '1h') {
  return jwt.sign(payload, secret, { expiresIn });
}

export function verifyToken(token: string): UserClaims {
  const decoded = jwt.verify(token, secret);
  if (typeof decoded === 'string') {
    throw new JsonWebTokenError('invalid_token');
  }
  const { sub, email, role } = decoded as JwtPayload & Partial<UserClaims>;
  if (!sub || !email || !role) {
    throw new JsonWebTokenError('invalid_token');
  }
  return { sub, email, role };
}
