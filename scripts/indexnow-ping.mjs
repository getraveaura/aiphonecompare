// Ping IndexNow with the URL list written by postbuild. Retries while the
// key file or the Pages deploy is still propagating. Exits 0 on 200 or 202.
import fs from 'node:fs';

const payload = JSON.parse(fs.readFileSync('indexnow-payload.json', 'utf8'));
const pauses = [0, 15000, 20000, 30000, 30000, 45000, 45000, 60000];

for (let attempt = 0; attempt < pauses.length; attempt++) {
  if (pauses[attempt]) await new Promise((resolve) => setTimeout(resolve, pauses[attempt]));
  let status = 0;
  let body = '';
  try {
    const response = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify(payload),
    });
    status = response.status;
    body = (await response.text()).slice(0, 500);
  } catch (error) {
    console.log(`IndexNow attempt ${attempt + 1} failed: ${error.message}`);
    continue;
  }
  console.log(`IndexNow attempt ${attempt + 1}: ${status} ${body}`);
  if (status === 200 || status === 202) process.exit(0);
}

console.error('IndexNow did not accept the URL list');
process.exit(1);
