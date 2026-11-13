import { defineConfig } from 'astro/config';

// Spotlight dates are checked against the build date (UTC), so a spotlight
// expires at the first build after its end date. See docs/daily-update.md.
const buildDate = new Date().toISOString().slice(0, 10);

export default defineConfig({
  output: 'static',
  site: 'https://aiphonecompare.com',
  base: '/',
  trailingSlash: 'always',
  vite: { define: { __APC_BUILD_DATE__: JSON.stringify(buildDate) } },
});
