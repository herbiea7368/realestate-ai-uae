'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Profile() {
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const r = useRouter();

  async function save() {
    await fetch('/api/users/me', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, company }),
    });
    r.push('/onboarding/first-listing');
  }

  return (
    <main>
      <h2>Your Profile</h2>
      <input
        placeholder="Full Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        placeholder="Company"
        value={company}
        onChange={(e) => setCompany(e.target.value)}
      />
      <button onClick={save}>Next</button>
    </main>
  );
}
