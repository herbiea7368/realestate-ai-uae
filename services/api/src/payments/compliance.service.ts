import { logAuditEvent } from '../audit/audit.logger';

export interface ComplianceCheckInput {
  amount_aed: number;
  user_id: string;
}

export interface ComplianceResult {
  flag: boolean;
  reason?: 'amount_over_limit' | 'offshore_user';
}

export function amlCheck(txn: ComplianceCheckInput): ComplianceResult {
  if (txn.amount_aed > 1_000_000) {
    return { flag: true, reason: 'amount_over_limit' };
  }
  if (/offshore/i.test(txn.user_id)) {
    return { flag: true, reason: 'offshore_user' };
  }
  return { flag: false };
}

export async function logCompliance(result: ComplianceResult, context: ComplianceCheckInput) {
  await logAuditEvent({
    route: 'payments/compliance',
    method: 'AML_CHECK',
    status: result.flag ? 423 : 200,
    body: { amount_aed: context.amount_aed, user_id: context.user_id },
    result,
    userId: context.user_id,
    action: 'AML_EVALUATION'
  });
}
