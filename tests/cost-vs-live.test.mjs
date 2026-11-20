import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('AI vs live cost page keeps its sourced 150-call figures and labels', () => {
  const md = read('src/articles/ai-vs-live-receptionist.md');
  for (const figure of ['$199', '$270', '$295', '$1,347.75', '$1,440', '$1,635']) assert.ok(md.includes(figure), figure);
  assert.match(md, /\| Not published \|/);
  assert.match(md, /It is our calculation, not a printed list price/);
  assert.match(md, /Ruby may cost more than this table shows/);
  assert.match(md, /\(\/audit\/\)/);
  assert.doesNotMatch(md, /OnCrew|My AI Front Desk|calculations\.md/);
});

test('/cost/ and the calculator link to the AI vs live cost page', () => {
  const page = read('src/pages/cost/ai-vs-live-receptionist.astro');
  assert.match(page, /How much does a virtual receptionist cost\? Live vs AI, with sourced prices \(2026\)/);
  for (const p of ['src/pages/cost.astro', 'src/pages/cost/calculator.astro']) {
    assert.match(read(p), /href="\/cost\/ai-vs-live-receptionist\/"/, p);
  }
});
