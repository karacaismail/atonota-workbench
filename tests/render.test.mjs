import assert from 'node:assert/strict';
import { test } from 'node:test';
import { catalog } from '../catalog.mjs';
import { renderPage } from '../render.mjs';
import { icon } from '../icons.mjs';

test('static HTML has seven working safe new-tab links without JavaScript', () => {
  const html = renderPage(catalog);
  assert.equal((html.match(/class="app-link"/gu) || []).length, 7);
  for (const app of catalog) {
    assert.ok(html.includes(`id="app-${app.id}" href="${app.url}" target="_blank" rel="noopener noreferrer"`));
  }
  assert.ok(html.includes('href="#app-pen"'));
  assert.ok(html.includes('class="search-form" role="search" hidden'));
  assert.ok(html.includes('<noscript>'));
});
test('metadata is escaped as text, never injected as HTML', () => {
  const html = renderPage([{ ...catalog[0], name: '<img src=x onerror=alert(1)>', description: '" & <script>' }]);
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
  assert.ok(html.includes('&quot; &amp; &lt;script&gt;'));
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
