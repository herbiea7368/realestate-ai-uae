'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4001';
const TOKEN_STORAGE_KEY = 'id_token';

type ProfileResponse = {
  id: string;
  email: string;
  role: string;
  displayName: string | null;
  phone: string | null;
};

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const storedToken = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!storedToken) {
      router.replace('/login?redirect=/profile');
      return;
    }

    async function loadProfile(token: string) {
      try {
        const response = await fetch(`${API_URL}/profile`, {
          headers: {
            Authorization: `Bearer ${token}`
          },
          credentials: 'include'
        });

        if (response.status === 401) {
          window.localStorage.removeItem(TOKEN_STORAGE_KEY);
          router.replace('/login?redirect=/profile');
          return;
        }

        if (!response.ok) {
          throw new Error('profile_error');
        }

        const payload = (await response.json()) as ProfileResponse;
        setProfile(payload);
        setDisplayName(payload.displayName ?? '');
        setPhone(payload.phone ?? '');
      } catch {
        setMessage('Unable to load profile');
      } finally {
        setLoading(false);
      }
    }

    void loadProfile(storedToken);
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (typeof window === 'undefined') {
      return;
    }

    const token = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) {
      router.replace('/login?redirect=/profile');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ displayName: displayName || undefined, phone: phone || undefined })
      });

      if (response.status === 401) {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
        router.replace('/login?redirect=/profile');
        return;
      }

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const errorMessage = typeof payload.error === 'string' ? payload.error : 'update_failed';
        setMessage(errorMessage);
        return;
      }

      const payload = (await response.json()) as ProfileResponse;
      setProfile(payload);
      setMessage('Profile updated');
    } catch {
      setMessage('network_error');
    }
  }

  function handleSignOut() {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
    router.push('/login');
  }

  if (loading) {
    return (
      <main style={{ maxWidth: 480, margin: '80px auto' }}>
        <p>Loading profile…</p>
      </main>
    );
  }

  if (!profile) {
    return (
      <main style={{ maxWidth: 480, margin: '80px auto' }}>
        <p>Unable to load your profile.</p>
        <button type="button" onClick={handleSignOut}>
          Go to login
        </button>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 480, margin: '80px auto', padding: '24px', border: '1px solid #e5e5e5' }}>
      <h1>Profile</h1>
      <p>
        Signed in as <strong>{profile.email}</strong> ({profile.role})
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '12px', marginTop: '24px' }}>
        <label htmlFor="displayName">Display name</label>
        <input
          id="displayName"
          name="displayName"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          placeholder="Dubai Agent"
        />

        <label htmlFor="phone">Phone</label>
        <input
          id="phone"
          name="phone"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="+971 50 000 0000"
        />

        <button type="submit">Save</button>
      </form>

      <button type="button" style={{ marginTop: '24px' }} onClick={handleSignOut}>
        Sign out
      </button>

      {message && (
        <p role="status" style={{ marginTop: '16px' }}>
          {message}
        </p>
      )}
    </main>
  );
}
