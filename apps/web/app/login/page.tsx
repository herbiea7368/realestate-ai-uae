'use client';

import { FormEvent, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4001';
const TOKEN_STORAGE_KEY = 'id_token';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams?.get('redirect') ?? '/add-listing';

  const [email, setEmail] = useState('agent@example.com');
  const [password, setPassword] = useState('secret12');
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const error = typeof payload.error === 'string' ? payload.error : 'invalid_credentials';
        setMessage(error);
        return;
      }

      if (typeof payload.token === 'string') {
        window.localStorage.setItem(TOKEN_STORAGE_KEY, payload.token);
      }

      router.push(redirect);
    } catch {
      setMessage('network_error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={{ maxWidth: 420, margin: '80px auto', padding: '24px', border: '1px solid #e5e5e5' }}>
      <h1>Sign in</h1>
      <p>Authenticate to access the listing writer and valuation tools.</p>
      <form onSubmit={handleSubmit}>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />

        <button type="submit" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      {message && <p role="alert">Unable to sign in: {message}</p>}
    </main>
  );
}
