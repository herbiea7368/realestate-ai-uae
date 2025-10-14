export interface PiiDetectionResult {
  phones: string[];
  emails: string[];
}

export function detectPII(text: string): PiiDetectionResult {
  const phones = [...text.matchAll(/\+971\d{8,9}/g)].map((match) => match[0]);
  const emails = [...text.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)].map((match) => match[0]);
  return { phones, emails };
}

