import fetch from 'node-fetch';

const webhook = process.env.RELEASE_ANNOUNCEMENT_WEBHOOK || '';
if (!webhook) {
  console.log('Announcement skipped: RELEASE_ANNOUNCEMENT_WEBHOOK not configured.');
  process.exit(0);
}

const msg = {
  text: ` RealEstate AI v${process.env.RELEASE_TAG || '1.0.0'} is live at ${process.env.PRODUCTION_URL}!`,
  timestamp: new Date().toISOString(),
};

fetch(webhook, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(msg),
})
  .then((r) => console.log('Announcement', r.status))
  .catch((err) => {
    console.error('Announcement_failed', err);
    process.exitCode = 1;
  });
