export type PermitStatus = 'valid' | 'expired' | 'not_found' | 'suspended';

export interface PermitRecord {
  trakheesiNumber: string;
  issuer: 'DLD';
  issueDate: string;
  expiryDate: string;
  status: PermitStatus;
  suspendedReason?: string;
}

export interface PermitValidationResult {
  status: PermitStatus;
  issuer: 'DLD';
  expiryDate?: string;
  errors: string[];
  checkedAt: string;
}
