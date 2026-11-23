import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { coverageRows } from '../src/lib/after-hours.mjs';
import vendors from '../src/data/vendors.json' with { type: 'json' };

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const dollars = (text) => text.match(/\$\d[\d,]*(?:\.\d+)?/g) || [];

test('the three new pages carry FAQ, breadcrumbs, and a prices-checked line', () => {
  const pages = [
    ['src/pages/industries/property-management.astro', '/industries/property-management/'],
    ['src/pages/after-hours.astro', '/after-hours/'],
    ['src/pages/ai-vs-virtual-receptionist.astro', '/ai-vs-virtual-receptionist/'],
  ];
  const postbuild = read('postbuild.mjs');
  for (const [file, path] of pages) {
    const src = read(file);
    assert.match(postbuild, new RegExp(path.replaceAll('/', '\\/')));
    if (file.endsWith('property-management.astro')) {
      assert.match(src, /showChecked/);
      assert.match(read('src/components/Industry.astro'), /Prices checked/);
      assert.match(read('src/components/Industry.astro'), /FAQPage/);
      assert.match(read('src/components/Industry.astro'), /breadcrumbNode/);
    } else {
      assert.match(src, /Prices checked/);
      assert.match(src, /FAQPage/);
      assert.match(src, /breadcrumbNode/);
    }
  }
  assert.match(postbuild, /sitemap-0\.xml/);
  assert.match(read('src/pages/data.astro'), /Source: aiphonecompare\.com, checked/);
  assert.match(postbuild, /price_source_url/);
  assert.match(postbuild, /plan_notes/);
});

test('property directory dollars are already in the property vendor records', () => {
  const page = read('src/pages/industries/property-management.astro');
  const property = vendors.filter((vendor) => vendor.industries.includes('property'));
  assert.equal(property.length, 10);
  const blob = JSON.stringify(property);
  for (const amount of dollars(page)) assert.ok(blob.includes(amount), amount);
  assert.match(page, /oncrew\.ai\/answering\/property-management/);
  assert.match(page, /oncrew\.ai\/answering\/after-hours-property-management/);
  assert.match(page, /\/best\/property-management\//);
  assert.match(read('src/lib/best-guides.mjs'), /\/industries\/property-management\//);
});

test('after-hours rows use vendor prices and do not invent a dollar in the coverage line', () => {
  const rows = coverageRows(vendors);
  assert.ok(rows.length >= 10);
  for (const row of rows) {
    const vendor = vendors.find((item) => item.slug === row.slug);
    assert.equal(row.price, vendor.starting_price);
    assert.equal(row.checked, vendor.last_checked);
    for (const amount of dollars(row.says)) assert.ok(JSON.stringify(vendor).includes(amount), `${row.slug} ${amount}`);
  }
  assert.ok(rows.some((row) => row.slug === 'oncrew'));
  assert.match(read('src/pages/ai-vs-virtual-receptionist.astro'), /\/cost\/ai-vs-live-receptionist\//);
  assert.match(read('src/pages/ai-vs-virtual-receptionist.astro'), /\/cost\/calculator\//);
});
