export interface ConsentRecord {
  consent: boolean;
  timestamp: number;
}

const consentLedger = new Map<string, ConsentRecord>();

export function setConsent(userId: string, consent: boolean): ConsentRecord {
  const record: ConsentRecord = { consent, timestamp: Date.now() };
  consentLedger.set(userId, record);
  return record;
}

export function getConsent(userId: string): ConsentRecord | undefined {
  return consentLedger.get(userId);
}

export function resetConsentLedger(): void {
  consentLedger.clear();
}
