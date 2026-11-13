import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('done-for-you draft stays noindex and unlinked', () => {
  const page = read('src/pages/done-for-you.astro');
  assert.match(page, /<Base[^>]*\bnoindex\b/);
  assert.match(page, /Draft<\/strong> Pricing pending approval/);
  assert.doesNotMatch(page, /buy\.stripe\.com/);
  assert.doesNotMatch(read('src/layouts/Base.astro'), /done-for-you/);
  assert.doesNotMatch(read('postbuild.mjs'), /done-for-you/);
});

test('postbuild skips noindex pages for the sitemap', () => {
  assert.match(read('postbuild.mjs'), /isNoindex\(p\)/);
});
