// Renders the Open Graph images (1200x630) and PNG favicons with Playwright.
// Run: node scripts/make-og.mjs   (writes public/og.png, public/og/*.png, public/favicon-32.png, public/apple-touch-icon.png)
// Text only: no vendor counts or prices, so images never go stale.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const font = (f) => `data:font/woff2;base64,${readFileSync(join(root, 'public/fonts', f)).toString('base64')}`;
const mark = `<svg width="56" height="56" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#1c1915"/><path d="M9 16.4 13.2 20.6 23.2 10.6" fill="none" stroke="#f3efe6" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const cards = [
  { file: 'og.png', kicker: 'Independent directory', title: 'What an AI receptionist will cost', sub: 'Every price sourced and dated. Sponsored spots labeled. Rankings not for sale.', chips: ['Dental', 'Legal', 'Plumbing', 'Medical'], plain: true },
  { file: 'og/get-featured.png', kicker: 'For AI receptionist vendors', title: 'Get featured where buyers compare', sub: 'Industry spotlight: the top spot on one industry page for 30 days, labeled Sponsored.', chips: ['$49 / 30 days', 'No contract'] },
  { file: 'og/done-for-you.png', kicker: 'Done-for-you setup', title: 'We pick, set up and tune your AI receptionist', sub: 'Independent pick from verified prices, 60 days of tuning, and a result guarantee.', chips: ['From $1,000', 'Refund if the result is missed'] },
  { file: 'og/teardown.png', kicker: 'For AI receptionist vendors', title: 'See how buyers compare you, and win more of them', sub: 'A sourced competitor teardown with 5 fixes you can ship this week.', chips: ['$199', 'Delivered within 24 hours'] },
  { file: 'og/overpaying.png', kicker: 'Free price check', title: 'Are you overpaying for your AI receptionist?', sub: 'Check what you pay against published plans at your call volume. No sign-up.', chips: ['Free', 'Published plans only'] },
  { file: 'og/cost.png', kicker: 'Cost calculator', title: 'What an AI receptionist costs at your call volume', sub: 'Scenario bills from each provider\u2019s own published allowance and overage.', chips: ['Sourced', 'Dated'] },
  { file: 'og/match.png', kicker: 'Match tool', title: 'Find the AI receptionist that fits your business', sub: 'Filter by industry, call volume and must-haves. Rankings are not for sale.', chips: ['Free', 'Independent'] },
];

const html = (c) => `<!doctype html><html><head><style>
@font-face{font-family:N;font-weight:600;src:url(${font('newsreader-600.woff2')})}
@font-face{font-family:S;font-weight:400;src:url(${font('source-sans-3-400.woff2')})}
@font-face{font-family:S;font-weight:600;src:url(${font('source-sans-3-600.woff2')})}
*{box-sizing:border-box}body{margin:0;width:1200px;height:630px;overflow:hidden;font-family:S;color:#1c1915;
background:radial-gradient(900px 420px at 0% -10%,rgba(31,95,74,.16),transparent 60%),radial-gradient(700px 380px at 100% 110%,rgba(122,67,32,.10),transparent 55%),#f3efe6}
.frame{position:absolute;inset:36px;border:1px solid #e4d9c8;border-radius:28px;padding:56px 64px;display:flex;flex-direction:column}
.brand{display:flex;align-items:center;gap:16px;font-family:N;font-size:34px;letter-spacing:-.03em}
.kicker{margin-top:44px;color:#1f5f4a;font-weight:600;font-size:22px;letter-spacing:.1em;text-transform:uppercase}
h1{margin:14px 0 0;font-family:N;font-weight:600;font-size:${c.title.length > 44 ? 66 : 76}px;line-height:1.02;letter-spacing:-.035em;max-width:${c.wide ? 900 : 820}px}
p{margin:20px 0 0;font-size:27px;line-height:1.35;color:#3f3a33;max-width:880px}
.chips{margin-top:auto;display:flex;gap:12px}
.chip{padding:10px 18px;border-radius:999px;background:#fffdf8;border:1px solid #e4d9c8;font-weight:600;font-size:22px;color:#163f32}
.chips:not(.plain) .chip:first-child{background:#1f5f4a;border-color:#1f5f4a;color:#f6f1e7}
.url{position:absolute;right:64px;bottom:62px;font-size:22px;color:#5c564c}
</style></head><body><div class="frame"><div class="brand">${mark}aiphonecompare</div>
<div class="kicker">${c.kicker}</div><h1>${c.title}</h1><p>${c.sub}</p>
<div class="chips${c.plain ? ' plain' : ''}">${c.chips.map((x) => `<span class="chip">${x}</span>`).join('')}</div><div class="url">aiphonecompare.com</div></div></body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
for (const c of cards) {
  await page.setContent(html(c), { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: join(root, 'public', c.file) });
}
const svg = readFileSync(join(root, 'public/favicon.svg'), 'utf8');
for (const [size, file] of [[32, 'favicon-32.png'], [180, 'apple-touch-icon.png']]) {
  const p = await browser.newPage({ viewport: { width: size, height: size } });
  const inner = file.startsWith('apple')
    ? `<div style="width:${size}px;height:${size}px;background:#1c1915;display:grid;place-items:center">${svg.replace('<svg', `<svg width="${size * 0.82}" height="${size * 0.82}"`).replace('rx="8"', 'rx="0"')}</div>`
    : svg.replace('<svg', `<svg width="${size}" height="${size}"`);
  await p.setContent(`<body style="margin:0;background:transparent">${inner}</body>`);
  await p.screenshot({ path: join(root, 'public', file), omitBackground: true });
  await p.close();
}
await browser.close();
console.log('og + icons written');
