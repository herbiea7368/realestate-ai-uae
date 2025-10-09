const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:4000/api/v1';

export async function POST(request: Request) {
  const payload = await request.json();

  const response = await fetch(`${API_BASE_URL}/permits/check`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await response.json();

  return new Response(JSON.stringify(data), {
    status: response.status,
    headers: { 'content-type': 'application/json' }
  });
}
