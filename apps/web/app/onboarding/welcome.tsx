'use client';

import { useRouter } from 'next/navigation';

export default function Welcome() {
  const r = useRouter();
  return (
    <main style={{ maxWidth: 720, margin: '40px auto', textAlign: 'center' }}>
      <h1>Welcome to RealEstate AI</h1>
      <p>Let's get your account set up in a few steps.</p>
      <button onClick={() => r.push('/onboarding/profile')}>Start</button>
    </main>
  );
}
