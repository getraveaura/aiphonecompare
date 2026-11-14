import assert from 'node:assert/strict';
import test from 'node:test';
import { estimatePlan, formatUsd } from '../src/lib/cost.mjs';
import { buildLandings } from '../src/lib/landings.mjs';
import models from '../src/data/cost-models.json' with { type: 'json' };

const pages = buildLandings();
const dollars = (text) => text.match(/\$\d[\d,]*(?:\.\d{2})?/g) || [];

test('landing pages have distinct paths, titles, and search phrases', () => {
  assert.equal(pages.length, 18);
  assert.equal(new Set(pages.map((page) => page.path)).size, 18);
  assert.equal(new Set(pages.map((page) => page.title)).size, 18);
  assert.equal(new Set(pages.map((page) => page.phrase)).size, 18);
  for (const page of pages) {
    assert.ok(page.h1);
    assert.ok(page.description.length > 40 && page.description.length <= 160);
    assert.ok(page.answer.length >= 2);
    assert.ok(page.faqs.length >= 3);
    assert.ok(page.blocks.some((block) => block.type === 'table'));
    assert.ok(page.related.length >= 3);
  }
});

test('Smith.ai at 50 calls matches the cost engine and does not price the unpublished 150-call band', () => {
  const smith = models.providers.find((provider) => provider.slug === 'smith-ai');
  const free = smith.plans.find((plan) => plan.id === 'free');
  const band = smith.plans.find((plan) => plan.id === 'pro-150');
  const estimate = estimatePlan({ ...free, unit: 'call' }, { calls: 50, durationMinutes: 3 });
  const page = pages.find((item) => item.path === '/cost/smith-ai/');
  const table = page.blocks.find((block) => block.type === 'table');
  const row = table.rows.find((cells) => cells[1].text === 'Free');
  assert.equal(row[2].text, formatUsd(estimate.scenarioCents));
  assert.match(table.rows.find((cells) => cells[1].text === band.name)[3].text, /Not estimated/);
});

test('Goodcall is not converted from call count, and Housecall has no invented price', () => {
  const dental = pages.find((page) => page.path === '/cost/dental/');
  const table = dental.blocks.find((block) => block.type === 'table');
  const goodcall = table.rows.find((row) => row[0].text === 'Goodcall');
  assert.match(goodcall[2].text, /different caller/);
  const jobber = pages.find((page) => page.path === '/compare/jobber-vs-housecall-pro/');
  const blob = JSON.stringify(jobber);
  assert.match(blob, /Not verified/);
  assert.doesNotMatch(jobber.answer.join(' '), /Housecall Pro CSR AI: \$\d/);
});

test('FAQ dollar amounts are copied from the page data, not added beside it', () => {
  for (const page of pages) {
    for (const item of page.faqs) {
      for (const amount of dollars(item.a)) {
        assert.ok(page.dollars.includes(amount), `${page.path} FAQ uses ${amount} outside the sourced figures`);
      }
    }
  }
});

test('the 3-tech HVAC shop page reuses home-services plans and does not invent a typical call volume', () => {
  const page = pages.find((item) => item.path === '/cost/hvac-shop/');
  const home = pages.find((item) => item.path === '/cost/home-services/');
  assert.ok(page);
  assert.ok(home);
  assert.equal(page.h1, 'AI receptionist cost for a 3-tech HVAC shop');
  assert.match(page.answer.join(' '), /do not have a published typical call volume/i);
  assert.doesNotMatch(page.answer.join(' '), /typically (gets|receives|handles) \d+ calls/i);
  const pageTable = page.blocks.find((block) => block.type === 'table');
  const homeTable = home.blocks.find((block) => block.type === 'table');
  assert.deepEqual(pageTable.rows, homeTable.rows);
  assert.ok(page.related.some((link) => link.href === '/done-for-you/home-services/'));
  assert.ok(page.related.some((link) => link.href === '/audit/'));
  assert.ok(page.related.some((link) => link.href === '/best/hvac-plumbing/'));
  assert.ok(page.related.some((link) => link.href === '/cost/home-services/'));
});


test('new compare pages stay inside sourced records and do not invent a ServiceTitan price', () => {
  const smith = pages.find((page) => page.path === '/compare/smith-ai-vs-goodcall/');
  const rosie = pages.find((page) => page.path === '/compare/rosie-vs-my-ai-front-desk/');
  const jobber = pages.find((page) => page.path === '/compare/jobber-vs-servicetitan/');
  const oncrew = pages.find((page) => page.path === '/compare/oncrew-vs-nextphone/');
  for (const page of [smith, rosie, jobber, oncrew]) {
    assert.ok(page, 'missing compare page');
    assert.match(page.answer.join(' '), /directory|cost model|cost calculator/i);
  }
  assert.match(smith.answer.join(' '), /different caller/i);
  assert.match(rosie.answer.join(' '), /does not calculate a bill/i);
  assert.match(jobber.answer.join(' '), /no starting price/i);
  assert.doesNotMatch(jobber.answer.join(' '), /ServiceTitan AI Voice Agent: \$\d/);
  assert.match(oncrew.answer.join(' '), /\$199\/mo/);
});

test('the missed-call explainer uses sourced stories and does not invent a typical cost', () => {
  const page = pages.find((item) => item.path === '/cost/missed-call/');
  assert.ok(page);
  assert.equal(page.topic, 'missed-call');
  const blob = `${page.answer.join(' ')} ${page.faqs.map((item) => item.a).join(' ')}`;
  assert.match(blob, /does not publish a typical/i);
  assert.match(blob, /20%/);
  assert.match(blob, /13\.7%/);
  assert.match(blob, /26 sales appointments/);
  assert.match(blob, /\$299/);
  assert.match(blob, /£212/);
  assert.doesNotMatch(blob, /typically costs \$\d/);
  assert.ok(page.related.some((link) => link.href === '/audit/'));
  assert.ok(page.related.some((link) => link.href === '/missed-call-calculator/' || link.href === '/cost/'));
  assert.ok(page.blocks.some((block) => block.type === 'table' && block.rows.length === 8));
});
