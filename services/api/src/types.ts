export type PermitStatus = 'valid' | 'invalid' | 'expired';

export interface PermitRecord {
  status: PermitStatus;
  expiresAt: number;
}

export type UserRole = 'agent' | 'admin';

export interface UserClaims {
  sub: string;
  email: string;
  role: UserRole;
}

/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Express {
    interface Request {
      user?: UserClaims;
    }
  }
}
/* eslint-enable @typescript-eslint/no-namespace */

export interface UserProfile extends UserClaims {
  displayName?: string;
  phone?: string;
}
