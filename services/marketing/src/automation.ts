import fetch from 'node-fetch';

export async function sendWelcomeEmail(to: string, name: string) {
  const key = process.env.SENDGRID_API_KEY;
  if (!key) {
    console.log('SendGrid disabled');
    return;
  }

  await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [
        { to: [{ email: to }], subject: `Welcome ${name} to RealEstate AI!` },
      ],
      from: { email: 'noreply@realestate.ai' },
      content: [{ type: 'text/plain', value: `Hi ${name}, welcome to RealEstate AI.` }],
    }),
  });
}
