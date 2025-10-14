import { randomUUID } from 'node:crypto';

export type PaymentStatus =
  | 'initiated'
  | 'escrowed'
  | 'released'
  | 'refunded'
  | 'flagged';

export interface PaymentRecord {
  id: string;
  userId: string;
  amountAed: number;
  status: PaymentStatus;
  stripePaymentId?: string;
  bankEscrowRef?: string;
  createdAt: Date;
  updatedAt: Date;
  aml?: {
    flag: boolean;
    reason?: string;
  };
}

const payments = new Map<string, PaymentRecord>();

export function createPayment(record: Omit<PaymentRecord, 'id' | 'createdAt' | 'updatedAt'>) {
  const id = randomUUID();
  const now = new Date();
  const complete: PaymentRecord = {
    ...record,
    id,
    createdAt: now,
    updatedAt: now
  };
  payments.set(id, complete);
  return complete;
}

export function updatePayment(id: string, updates: Partial<Omit<PaymentRecord, 'id'>>) {
  const current = payments.get(id);
  if (!current) {
    return null;
  }
  const next: PaymentRecord = {
    ...current,
    ...updates,
    updatedAt: new Date()
  };
  payments.set(id, next);
  return next;
}

export function getPayment(id: string) {
  return payments.get(id) ?? null;
}

export function listPaymentsForUser(userId: string) {
  return [...payments.values()]
    .filter((payment) => payment.userId === userId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function listAllPayments() {
  return [...payments.values()];
}

export function resetPayments() {
  payments.clear();
}
