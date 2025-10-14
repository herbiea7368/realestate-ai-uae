import axios from 'axios';

const DEFAULT_BASE_URL = 'https://api.uaebank.test/v1';

function getBaseUrl(): string {
  return process.env.BANK_API_BASE ?? DEFAULT_BASE_URL;
}

function getHeaders() {
  const apiKey = process.env.BANK_API_KEY;
  return apiKey ? { 'x-api-key': apiKey } : undefined;
}

export interface EscrowHoldResponse {
  ref: string;
  status: 'held' | 'mocked';
}

export async function hold(amount: number, userId: string): Promise<EscrowHoldResponse> {
  const base = getBaseUrl();
  try {
    const response = await axios.post(
      `${base}/escrow/hold`,
      { amount, userId },
      { headers: getHeaders() }
    );
    return {
      ref: response.data.ref ?? `mock-ref-${Date.now()}`,
      status: response.data.status ?? 'held'
    };
  } catch (error) {
    console.warn('[payments.escrow] falling back to mock hold', error);
    return {
      ref: `mock-ref-${Date.now()}`,
      status: 'mocked'
    };
  }
}

export async function release(ref: string) {
  const base = getBaseUrl();
  try {
    const response = await axios.post(
      `${base}/escrow/release`,
      { ref },
      { headers: getHeaders() }
    );
    return {
      status: response.data.status ?? 'released',
      ref
    };
  } catch (error) {
    console.warn('[payments.escrow] falling back to mock release', error);
    return { status: 'released', ref };
  }
}
