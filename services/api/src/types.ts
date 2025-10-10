export type PermitStatus = 'valid' | 'invalid' | 'expired';

export interface PermitRecord {
  status: PermitStatus;
  expiresAt: number;
}
