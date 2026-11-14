// Build official brand rasters and copy the kit to public/brand and the
// monetization brand folder. Does not overwrite public/og.png.
// Run: node scripts/make-brand.mjs
import { chromium } from 'playwright';
import { mkdirSync, readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const staging = join(root, 'public/brand');
const kit = '/workspace/aiphonecompare-monetization/brand';
mkdirSync(staging, { recursive: true });
mkdirSync(kit, { recursive: true });

const py = spawnSync('python3', [join(root, 'scripts/make-brand.py'), staging], { stdio: 'inherit' });
if (py.status !== 0) process.exit(py.status ?? 1);

const iconSvg = readFileSync(join(staging, 'icon.svg'), 'utf8');
const wordmarkSvg = readFileSync(join(staging, 'wordmark.svg'), 'utf8');
const font = (f) => `data:font/woff2;base64,${readFileSync(join(root, 'public/fonts', f)).toString('base64')}`;

const socialHtml = `<!doctype html><html><head><style>
@font-face{font-family:N;font-weight:600;src:url(${font('newsreader-600.woff2')})}
@font-face{font-family:S;font-weight:400;src:url(${font('source-sans-3-400.woff2')})}
@font-face{font-family:S;font-weight:600;src:url(${font('source-sans-3-600.woff2')})}
*{box-sizing:border-box}
body{margin:0;width:1200px;height:630px;overflow:hidden;font-family:S;color:#1c1915;
background:radial-gradient(900px 420px at 0% -10%,rgba(31,95,74,.16),transparent 60%),radial-gradient(700px 380px at 100% 110%,rgba(122,67,32,.10),transparent 55%),#f3efe6}
.frame{position:absolute;inset:36px;border:1px solid #e4d9c8;border-radius:28px;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;padding:0 88px}
.brand{width:820px}
.brand svg{width:820px;height:auto;display:block}
.sub{margin:36px 0 0;font-size:28px;line-height:1.35;color:#3f3a33;max-width:820px}
.url{position:absolute;right:88px;bottom:62px;font-size:22px;color:#5c564c}
</style></head><body>
<div class="frame">
  <div class="brand">${wordmarkSvg}</div>
  <p class="sub">Independent price comparison for AI phone answering. Every price sourced and dated. Rankings not for sale.</p>
  <div class="url">aiphonecompare.com</div>
</div>
</body></html>`;

const browser = await chromium.launch();

async function rasterSvg(svg, size, out, { bleed = false, pad = 0 } = {}) {
  const innerSize = size - pad * 2;
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  const body = bleed
    ? `<div style="width:${size}px;height:${size}px;background:#1c1915;display:grid;place-items:center">${svg.replace('<svg', `<svg width="${Math.round(size * 0.82)}" height="${Math.round(size * 0.82)}"`).replace('rx="8"', 'rx="0"')}</div>`
    : `<div style="width:${size}px;height:${size}px;display:grid;place-items:center;padding:${pad}px">${svg.replace('<svg', `<svg width="${innerSize}" height="${innerSize}"`)}</div>`;
  await page.setContent(`<body style="margin:0;background:transparent">${body}</body>`);
  await page.screenshot({ path: out, omitBackground: true });
  await page.close();
}

await rasterSvg(iconSvg, 512, join(staging, 'icon-512.png'));
await rasterSvg(iconSvg, 16, join(staging, 'favicon-16.png'));
await rasterSvg(iconSvg, 32, join(staging, 'favicon-32.png'));
await rasterSvg(iconSvg, 192, join(staging, 'favicon-192.png'));
await rasterSvg(iconSvg, 180, join(staging, 'apple-touch-icon.png'), { bleed: true });

const social = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await social.setContent(socialHtml, { waitUntil: 'load' });
await social.evaluate(() => document.fonts.ready);
await social.screenshot({ path: join(staging, 'social-1200x630.png') });
await social.close();
await browser.close();

const files = [
  'icon.svg', 'wordmark.svg',
  'icon-512.png', 'social-1200x630.png',
  'favicon-16.png', 'favicon-32.png', 'favicon-192.png', 'apple-touch-icon.png',
];
for (const file of files) copyFileSync(join(staging, file), join(kit, file));

const readme = `# aiphonecompare brand kit

Official mark: a dark rounded square (#1c1915) with a cream check (#f3efe6), plus the "aiphonecompare" wordmark in Newsreader 600, the site's serif, at the same size and letter-spacing as the header.

| File | Use |
| --- | --- |
| \`icon.svg\` | Vector icon (32-unit viewBox). Prefer this for the favicon and app icon. |
| \`wordmark.svg\` | Vector lockup (icon + wordmark), outlines, no live font needed. |
| \`icon-512.png\` | Icon only, 512×512. |
| \`social-1200x630.png\` | Brand share card. The live site's default Open Graph image stays \`/og.png\`, which already uses this mark and a product headline. |
| \`favicon-16.png\`, \`favicon-32.png\`, \`favicon-192.png\` | Favicon sizes. |
| \`apple-touch-icon.png\` | 180×180, full-bleed dark square for iOS. |

Colours: ink \`#1c1915\`, cream check and paper check stroke \`#f3efe6\`, paper \`#f3efe6\`, pine \`#1f5f4a\`.

Rebuild from the repo: \`node scripts/make-brand.mjs\`.
`;
writeFileSync(join(kit, 'README.md'), readme);
writeFileSync(join(staging, 'README.md'), readme);
console.log('brand kit written to', staging, 'and', kit);
