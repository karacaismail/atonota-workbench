import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { catalog } from '../catalog.mjs';

const require = createRequire(import.meta.url);
const playwright = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const playwrightVersion = require(`${process.env.PLAYWRIGHT_PATH || 'playwright'}/package.json`).version;
const output = process.env.QA_DIR || fileURLToPath(new URL('../qa-results/', import.meta.url));
const directory = fileURLToPath(new URL('../site/', import.meta.url));
const allowed = ['index.html', 'styles.css', 'app.mjs', 'model.mjs', 'catalog.mjs', 'favicon.svg'];
await mkdir(output, { recursive: true });
const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  const file = pathname === '/' ? 'index.html' : pathname.slice(1);
  if (!allowed.includes(file)) { response.writeHead(404); response.end(); return; }
  try {
    const data = await readFile(join(directory, file));
    response.setHeader('Content-Type', file.endsWith('.mjs') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.svg') ? 'image/svg+xml' : 'text/html');
    response.end(data);
  } catch { response.writeHead(404); response.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = process.env.QA_URL || `http://127.0.0.1:${server.address().port}/`;
const rows = [];
const evidence = { url, runtime: process.version, playwright: playwrightVersion, platform: process.platform, date: new Date().toISOString(), budgets: { decodedRoute: 100 * 1024, js: 15 * 1024, externalAttempts: 0 }, screenshots: 'candidate; no pre-existing approved pixel baseline', physicalDevices: 'not_run', screenReader: 'not_run', virtualKeyboard: 'not_run', manualZoom: 'not_run', results: rows };

async function assertLayout(page, engine, viewport) {
  await page.setViewportSize(viewport);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${engine} horizontal overflow ${viewport.width}x${viewport.height}`);
  const boxes = await page.locator('.app-link').evaluateAll(elements => elements.map(element => {
    const box = element.getBoundingClientRect();
    return { width: box.width, height: box.height, left: box.left, right: box.right, top: box.top };
  }));
  assert.ok(boxes.every(box => box.width >= 44 && box.height >= 44 && box.left >= 12 && box.right <= viewport.width - 12));
  if (viewport.width === 320) assert.equal(boxes.filter(box => Math.abs(box.top - boxes[0].top) < 1).length, 2);
  const frames = await page.locator('main, .app-grid, .workspace-heading, .search-shell').evaluateAll(elements => elements.map(element => {
    const style = getComputedStyle(element);
    return { outline: style.outlineStyle, shadow: style.boxShadow };
  }));
  assert.ok(frames.every(frame => frame.outline === 'none' && frame.shadow === 'none'));
  rows.push({ engine, viewport, layout: 'pass', outerFrames: 'pass' });
}

try {
  for (const engine of ['chromium', 'firefox', 'webkit']) {
    console.log(`QA ${engine}: 320-first launcher journey`);
    const browser = await playwright[engine].launch();
    try {
      const context = await browser.newContext({ viewport: { width: 320, height: 568 }, hasTouch: true, reducedMotion: 'reduce', locale: 'tr-TR', timezoneId: 'Europe/Istanbul', deviceScaleFactor: 1, serviceWorkers: 'block' });
      const page = await context.newPage();
      const requests = [];
      const errors = [];
      const badResponses = [];
      page.on('request', request => requests.push(request.url()));
      page.on('pageerror', error => errors.push(error.message));
      page.on('response', response => { if (response.status() >= 400) badResponses.push(response.url()); });
      await page.goto(url);
      await page.waitForFunction(() => document.documentElement.dataset.ready === 'true');
      assert.equal(await page.getByRole('heading', { level: 1 }).count(), 1);
      assert.equal(await page.locator('.app-link').count(), 7);
      const capabilities = await page.evaluate(() => ({ coarse: matchMedia('(any-pointer:coarse)').matches, fine: matchMedia('(any-pointer:fine)').matches, hover: matchMedia('(hover:hover)').matches }));
      const resources = await page.evaluate(() => [...performance.getEntriesByType('navigation'), ...performance.getEntriesByType('resource')].map(entry => ({ name: entry.name, decoded: entry.decodedBodySize, encoded: entry.encodedBodySize, transferred: entry.transferSize })));
      assert.ok(requests.every(request => new URL(request).origin === new URL(url).origin));
      const decoded = resources.reduce((sum, resource) => sum + resource.decoded, 0);
      const js = resources.filter(resource => resource.name.endsWith('.mjs')).reduce((sum, resource) => sum + resource.decoded, 0);
      assert.ok(decoded > 0 && decoded <= evidence.budgets.decodedRoute, `${engine} route budget ${decoded}`);
      assert.ok(js > 0 && js <= evidence.budgets.js, `${engine} JS budget ${js}`);
      assert.ok(resources.some(resource => resource.name.endsWith('styles.css')));
      for (const viewport of [{width:320,height:480},{width:320,height:568},{width:360,height:640},{width:375,height:667},{width:390,height:844},{width:480,height:320},{width:568,height:320},{width:844,height:447},{width:844,height:448},{width:844,height:449},{width:461,height:800},{width:462,height:800},{width:463,height:800},{width:607,height:800},{width:608,height:800},{width:609,height:800},{width:767,height:800},{width:768,height:800},{width:769,height:800},{width:1023,height:800},{width:1024,height:800},{width:1025,height:800},{width:1440,height:900},{width:1920,height:1080}]) {
        await assertLayout(page, engine, viewport);
        if ([320,390,1440].includes(viewport.width) && viewport.height !== 480) await page.screenshot({ path: join(output, `${engine}-${viewport.width}.png`), fullPage: true });
      }
      await page.setViewportSize({ width: 320, height: 568 });
      const search = page.locator('#app-search');
      await search.fill('PENPOT');
      assert.equal(await page.locator('.app-item:not([hidden])').count(), 1);
      assert.equal(await page.locator('.app-item:not([hidden])').getAttribute('data-app-id'), 'penpot');
      assert.equal(await page.locator('#result-count').textContent(), '1 / 7 uygulama');
      await page.keyboard.press('Escape');
      assert.equal(await search.inputValue(), '');
      assert.equal(await page.locator('.app-item:not([hidden])').count(), 7);
      await search.fill('ÇİZİM');
      assert.equal(await page.locator('.app-item:not([hidden])').getAttribute('data-app-id'), 'affinity');
      await page.locator('#clear-search').tap();
      assert.equal(await search.inputValue(), '');
      assert.equal(await search.evaluate(element => element === document.activeElement), true);
      await search.fill('yok böyle bir uygulama');
      assert.equal(await page.locator('.empty-state').isVisible(), true);
      assert.equal(await page.locator('.app-item:not([hidden])').count(), 0);
      await page.screenshot({ path: join(output, `${engine}-empty-320.png`), fullPage: true });
      await page.locator('.reset-search').click();
      assert.equal(await page.locator('.app-item:not([hidden])').count(), 7);
      assert.equal(await search.evaluate(element => element === document.activeElement), true);
      await page.keyboard.type('/');
      assert.equal(await search.inputValue(), '/'); // Shortcut never steals text while typing.
      await page.keyboard.press('Escape');
      await search.fill('storybook beta');
      await page.setViewportSize({ width: 844, height: 390 });
      assert.equal(await search.inputValue(), 'storybook beta');
      assert.equal(await search.evaluate(element => element === document.activeElement), true);
      assert.equal(await page.locator('.app-item:not([hidden])').getAttribute('data-app-id'), 'storybook-beta');
      const afterRotateRequests = requests.length;
      await page.setViewportSize({ width: 320, height: 568 });
      assert.equal(requests.length, afterRotateRequests); // One shared lightweight shell; no hidden alternative packages.
      await page.keyboard.press('Escape');
      await page.locator('.skip-link').focus();
      await page.keyboard.press('Enter');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'app-pen');
      await page.keyboard.press('/');
      assert.equal(await search.evaluate(element => element === document.activeElement), true);
      await page.keyboard.press('Tab');
      await page.keyboard.press('Shift+Tab');
      const focus = await search.evaluate(element => ({ outline: getComputedStyle(element).outlineWidth, style: getComputedStyle(element).outlineStyle, color: getComputedStyle(element).outlineColor, boxShadow: getComputedStyle(element).boxShadow, parentOutline: getComputedStyle(element.parentElement).outlineStyle }));
      assert.ok(parseFloat(focus.outline) >= 2);
      assert.equal(focus.style, 'solid');
      assert.equal(focus.boxShadow, 'none');
      assert.equal(focus.parentOutline, 'none');
      await page.screenshot({ path: join(output, `${engine}-focus-320.png`), fullPage: true });
      // Generic shortcut stays outside every browser-supported editing surface.
      for (const editableValue of ['', 'plaintext-only']) {
        await page.evaluate(value => { const editor = document.createElement('div'); editor.id = 'keyboard-editor'; editor.setAttribute('contenteditable', value); document.body.append(editor); editor.focus(); }, editableValue);
        await page.keyboard.press('/');
        assert.equal(await page.locator('#keyboard-editor').textContent(), '/');
        assert.equal(await page.evaluate(() => document.activeElement.id), 'keyboard-editor');
        await page.locator('#keyboard-editor').evaluate(element => element.remove());
      }
      const targets = await page.locator('button:not([hidden]), input, .app-link, .roadmap-link, .site-footer a').evaluateAll(elements => elements.filter(element => element.getClientRects().length).map(element => ({ tag: element.tagName, name: element.getAttribute('aria-label') || element.textContent.trim(), width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height })));
      const minimum = capabilities.coarse ? 48 : 44;
      assert.ok(targets.every(target => target.width >= minimum && target.height >= minimum), `${engine} hit target ${minimum}: ${JSON.stringify(targets)}`);
      assert.equal(errors.length, 0, errors.join('\n'));
      assert.equal(badResponses.length, 0, badResponses.join('\n'));
      rows.push({ engine, input: 'emulated touch + keyboard', capabilities, search: 'pass', clear: 'pass', empty: 'pass', focus: 'pass', resizeContinuity: 'pass', resources: 'pass', requests, decodedBytes: decoded, jsBytes: js, resourceDetails: resources, targetMinimum: minimum, targetSizes: targets, focusComputed: focus, browserVersion: browser.version() });
      await writeFile(join(output, `${engine}-aria.yml`), await page.locator('body').ariaSnapshot());

      // Safely test real new-tab behavior with mocked external destinations; no live app requests.
      await context.route(/^https:\/\/(?:wb|pen)\.atonota\.net\//u, route => route.fulfill({ status: 200, contentType: 'text/html', body: '<title>Configured target</title>' }));
      const popupPromise = context.waitForEvent('page');
      await page.locator('#app-pen').click();
      const popup = await popupPromise;
      await popup.waitForURL(catalog[0].url);
      assert.equal(await popup.evaluate(() => window.opener), null);
      await popup.close();
      rows.push({ engine, newTab: 'pass', openerIsolation: 'pass', destinationNetwork: 'mocked; not server validation' });
      await search.fill('penpot');
      const returnPopupPromise = context.waitForEvent('page');
      await page.locator('#app-penpot').tap();
      const returnPopup = await returnPopupPromise;
      await returnPopup.waitForURL(catalog[1].url);
      await returnPopup.close();
      await page.bringToFront();
      assert.equal(await search.inputValue(), 'penpot');
      assert.equal(await page.locator('.app-item:not([hidden])').getAttribute('data-app-id'), 'penpot');
      rows.push({ engine, touchLaunch: 'pass', queryAndListAfterTabReturn: 'pass' });
      await context.close();

      const noJS = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 320, height: 568 } });
      const baseline = await noJS.newPage();
      await baseline.goto(url);
      assert.equal(await baseline.locator('.app-link').count(), 7);
      assert.equal(await baseline.locator('.search-form').isVisible(), false);
      assert.equal(await baseline.locator('#app-pen').getAttribute('href'), catalog[0].url);
      assert.ok(await baseline.locator('noscript').isVisible());
      await baseline.screenshot({ path: join(output, `${engine}-nojs-320.png`), fullPage: true });
      rows.push({ engine, noJS: 'pass', staticLinks: 'pass' });
      await noJS.close();

      for (const width of [320, 1440]) {
        const precision = await browser.newContext({ viewport: { width, height: 900 }, hasTouch: false, reducedMotion: 'reduce', locale: 'tr-TR', deviceScaleFactor: 1 });
        const desktop = await precision.newPage();
        await desktop.goto(url);
        await desktop.waitForFunction(() => document.documentElement.dataset.ready === 'true');
        const fineCapabilities = await desktop.evaluate(() => ({ coarse: matchMedia('(any-pointer:coarse)').matches, fine: matchMedia('(any-pointer:fine)').matches, hover: matchMedia('(hover:hover)').matches }));
        assert.equal(fineCapabilities.fine, true);
        assert.equal(fineCapabilities.coarse, false);
        await desktop.keyboard.press('/');
        assert.equal(await desktop.evaluate(() => document.activeElement.id), 'app-search');
        await desktop.keyboard.type('blender');
        assert.equal(await desktop.locator('.app-item:not([hidden])').getAttribute('data-app-id'), 'blender');
        await desktop.keyboard.press('Escape');
        await desktop.locator('#app-penpot').hover();
        await desktop.screenshot({ path: join(output, `${engine}-hover-${width}.png`), fullPage: true });
        await desktop.mouse.move(0, 0);
        await desktop.locator('#app-search').blur();
        const screenshot1 = await desktop.screenshot({ path: join(output, `${engine}-fine-${width}-final.png`), fullPage: true });
        const screenshot2 = await desktop.screenshot({ fullPage: true });
        assert.ok(screenshot1.equals(screenshot2), `${engine} stationary visual determinism`);
        rows.push({ engine, width, pointer: 'emulated fine mouse + keyboard', capabilities: fineCapabilities, hover: 'pass', searchShortcut: 'pass', deterministicRepeatedScreenshot: 'pass (not an approved regression baseline)' });
        await precision.close();
      }
    } finally { await browser.close(); }
  }
  evidence.status = 'pass';
  console.log(`${rows.length} browser checks passed. Physical devices/screen reader/real soft keyboard: not_run.`);
} catch (error) {
  evidence.status = 'fail';
  evidence.error = error.stack;
  throw error;
} finally {
  await writeFile(join(output, 'results.json'), JSON.stringify(evidence, null, 2));
  server.close();
}
