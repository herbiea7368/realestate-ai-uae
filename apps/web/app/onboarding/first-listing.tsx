'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function FirstListing() {
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const r = useRouter();

  async function submit() {
    await fetch('/api/listings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, price_aed: price }),
    });
    r.push('/onboarding/success');
  }

  return (
    <main>
      <h2>Create Your First Listing</h2>
      <input
        placeholder="Listing Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <input
        placeholder="Price (AED)"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
      />
      <button onClick={submit}>Finish</button>
    </main>
  );
}
