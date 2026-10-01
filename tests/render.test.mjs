import assert from 'node:assert/strict';
import { test } from 'node:test';
import { catalog } from '../catalog.mjs';
import { renderPage } from '../render.mjs';
import { icon } from '../icons.mjs';

test('static HTML has seven working safe new-tab links without JavaScript', () => {
  const html = renderPage(catalog);
  assert.equal((html.match(/class="tile"/gu) || []).length, 7);
  for (const app of catalog) {
    const anchor = [...html.matchAll(/<a\b[^>]*>/gu)].map(match => match[0]).find(value => value.includes(`data-id="${app.id}"`));
    assert.ok(anchor, app.id);
    assert.ok(anchor.includes(`href="${app.url}"`) && anchor.includes('target="_blank"') && anchor.includes('rel="noopener noreferrer"'), app.id);
    assert.ok(anchor.includes(`id="app-${app.id}"`), app.id);
  }
  assert.ok(html.includes('class="skip-link"'));
  assert.ok(html.includes('class="no-js"'));
  assert.ok(html.includes('id="q"'));
  assert.ok(html.includes('id="theme"'));
  assert.ok(html.includes('<noscript>'));
  assert.ok(html.includes('(yeni sekmede açılır)'));
});
test('metadata is escaped as text, never injected as HTML', () => {
  const html = renderPage([{ ...catalog[0], name: '<img src=x onerror=alert(1)>', description: '" & <script>' }]);
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
  assert.ok(!html.includes('<img src=x'));
});
test('unknown icon names fail explicitly; no remote image, analytics or unverified online claim', () => {
  assert.throws(() => icon('unknown'));
  const html = renderPage(catalog);
  assert.ok(!html.includes('<img '));
  assert.ok(!html.includes('online'));
  assert.ok(!html.includes('Çevrimiçi'));
  assert.ok(html.includes("connect-src 'none'"));
});

test('ZIP visual structure has two numbered groups, pipeline and bottom controls', () => {
  const html = renderPage(catalog);
  assert.equal((html.match(/class="group"/gu) || []).length, 2);
  assert.ok(html.includes('data-group="design"') && html.includes('id="h-design"'));
  assert.ok(html.includes('data-group="comp"') && html.includes('id="h-comp"'));
  assert.ok(html.includes('class="pipeline"'));
  assert.ok(/bar--bottom/u.test(html));
  for (const group of ['all', 'design', 'comp']) assert.ok(html.includes(`data-seg="${group}"`));
  assert.ok(html.indexOf('data-id="storybook-beta"') < html.indexOf('data-id="storybook-rc"'));
  assert.ok(html.indexOf('data-id="storybook-rc"') < html.indexOf('data-id="pen"'));
});

test('local font/theme bootstrap stays compatible with restrictive CSP', () => {
  const html = renderPage(catalog);
  assert.ok(html.includes("script-src 'self'"));
  assert.ok(html.includes("style-src 'self'"));
  assert.ok(html.includes("font-src 'self'"));
  assert.ok(html.includes('src="./theme.mjs"'));
  assert.equal((html.match(/<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/gu) || []).length, 0);
  assert.equal((html.match(/\sstyle=/gu) || []).length, 0);
  assert.ok(!html.includes("'unsafe-inline'"));
});
