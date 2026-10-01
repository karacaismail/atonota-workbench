import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { catalog } from '../catalog.mjs';

const require = createRequire(import.meta.url);
const playwright = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const playwrightVersion = require((process.env.PLAYWRIGHT_PATH || 'playwright') + '/package.json').version;
const output = process.env.QA_DIR || fileURLToPath(new URL('../qa-results/', import.meta.url));
const directory = fileURLToPath(new URL('../site/', import.meta.url));
const allowed = new Set(['index.html', 'styles.css', 'app.mjs', 'model.mjs', 'catalog.mjs', 'theme.mjs', 'favicon.svg',
  'fonts/josefin-sans-latin-wght-normal.woff2', 'fonts/josefin-sans-latin-ext-wght-normal.woff2']);
await mkdir(output, { recursive: true });
const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  const file = pathname === '/' ? 'index.html' : pathname.slice(1);
  if (!allowed.has(file)) { response.writeHead(404); response.end(); return; }
  try {
    const data = await readFile(join(directory, file));
    response.setHeader('Content-Type', file.endsWith('.mjs') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.svg') ? 'image/svg+xml' : file.endsWith('.woff2') ? 'font/woff2' : 'text/html');
    response.end(data);
  } catch { response.writeHead(404); response.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = process.env.QA_URL || 'http://127.0.0.1:' + server.address().port + '/';
const rows = [];
const evidence = { url, runtime: process.version, playwright: playwrightVersion, platform: process.platform, date: new Date().toISOString(),
  budgets: { decodedRoute: 100 * 1024, js: 15 * 1024, externalAttempts: 0 },
  capturePolicy: 'WebKit only: pinned Playwright 1.63.0 private animation-sync wrapper, restored per capture; caret preserved; app CSP and error gate unchanged',
  screenshots: 'candidate; compare with separately captured user ZIP reference; no silent baseline approval',
  physicalDevices: 'not_run', screenReader: 'not_run', virtualKeyboard: 'not_run', manualZoom: 'not_run', results: rows };
const visible = page => page.locator('.tile:not([hidden])');
const app = id => catalog.find(item => item.id === id);

function contrast(a, b) {
  const luminance = color => {
    const values = color.match(/[\d.]+/gu).slice(0, 3).map(value => {
      const channel = Number(value) / 255;
      return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
    });
    return .2126 * values[0] + .7152 * values[1] + .0722 * values[2];
  };
  const first = luminance(a); const second = luminance(b);
  return (Math.max(first, second) + .05) / (Math.min(first, second) + .05);
}
async function ready(page) {
  await page.waitForFunction(() => document.documentElement.dataset.ready === 'true');
  await page.evaluate(() => document.fonts.ready);
}
async function capture(page, engine, options = {}) {
  if (engine !== 'webkit') return page.screenshot({ ...options, caret: 'initial' });
  // Playwright 1.63 inserts an inline "body {}" style to sync WebKit animations.
  // Keep the application's strict CSP and its unfiltered error gate intact.
  // This private test-only workaround is version-guarded and restored per capture.
  assert.equal(playwrightVersion, '1.63.0', 'Revalidate the WebKit capture workaround when Playwright changes');
  const delegate = page._connection.toImpl(page).delegate;
  const original = delegate.shouldToggleStyleSheetToSyncAnimations;
  assert.equal(typeof original, 'function');
  assert.equal(original.call(delegate), true);
  delegate.shouldToggleStyleSheetToSyncAnimations = () => false;
  try { return await page.screenshot({ ...options, caret: 'initial' }); }
  finally { delegate.shouldToggleStyleSheetToSyncAnimations = original; }
}
async function assertLayout(page, engine, viewport) {
  await page.setViewportSize(viewport);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, engine + ' overflow ' + JSON.stringify(viewport));
  const boxes = await visible(page).evaluateAll(elements => elements.map(element => {
    const box = element.getBoundingClientRect();
    return { width: box.width, height: box.height, left: box.left, right: box.right, top: box.top };
  }));
  assert.ok(boxes.every(box => box.width >= 44 && box.height >= 44 && box.left >= 12 && box.right <= viewport.width - 12), engine + ' tile bounds ' + JSON.stringify(boxes));
  if (viewport.width === 320) assert.equal(boxes.filter(box => Math.abs(box.top - boxes[0].top) < 1).length, 2);
  const frames = await page.locator('main, nav.groups, .group, .grid-clip').evaluateAll(elements => elements.map(element => {
    const style = getComputedStyle(element); return { outline: style.outlineStyle, shadow: style.boxShadow };
  }));
  assert.ok(frames.every(frame => frame.outline === 'none' && frame.shadow === 'none'), engine + ' no section-wide frame');
  rows.push({ engine, viewport, layout: 'pass', sectionFocusFrames: 'pass' });
}
async function assertThemeContrast(page, engine, theme) {
  const colors = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    const input = document.querySelector('#q');
    const button = document.querySelector('#theme');
    return { background: getComputedStyle(document.body).backgroundColor, placeholder: getComputedStyle(input, '::placeholder').color,
      placeholderOpacity: Number(getComputedStyle(input, '::placeholder').opacity), placeholderBackground: getComputedStyle(input).backgroundColor,
      text: getComputedStyle(document.querySelector('.name')).color, counts: [...document.querySelectorAll('.tab-n')].map(element => getComputedStyle(element).color),
      focus: getComputedStyle(button).outlineColor, focusStyle: getComputedStyle(button).outlineStyle, focusWidth: getComputedStyle(button).outlineWidth, theme: root.colorScheme };
  });
  const foreground = colors.placeholder.match(/[\d.]+/gu).map(Number);
  const background = colors.placeholderBackground.match(/[\d.]+/gu).map(Number);
  const opacity = (foreground[3] ?? 1) * colors.placeholderOpacity;
  const composite = 'rgb(' + foreground.slice(0, 3).map((channel, index) => channel * opacity + background[index] * (1 - opacity)).join(', ') + ')';
  assert.ok(contrast(composite, colors.placeholderBackground) >= 4.5, engine + ' ' + theme + ' composited placeholder contrast ' + JSON.stringify(colors));
  assert.ok(contrast(colors.text, colors.background) >= 4.5);
  assert.ok(colors.counts.every(color => contrast(color, colors.background) >= 4.5), engine + ' ' + theme + ' count contrast');
  assert.equal(colors.focusStyle, 'solid'); assert.ok(parseFloat(colors.focusWidth) >= 2);
  assert.ok(contrast(colors.focus, colors.background) >= 3, engine + ' ' + theme + ' focus contrast');
  rows.push({ engine, theme, textContrast: 'pass', focusContrast: 'pass', colors });
}

try {
  for (const engine of ['chromium', 'firefox', 'webkit']) {
    console.log('QA ' + engine + ': ZIP launcher structure and 320-first journey');
    const browser = await playwright[engine].launch();
    try {
      const context = await browser.newContext({ viewport: { width: 320, height: 568 }, hasTouch: true, colorScheme: 'light', reducedMotion: 'reduce',
        locale: 'tr-TR', timezoneId: 'Europe/Istanbul', deviceScaleFactor: 1, serviceWorkers: 'block' });
      const page = await context.newPage();
      const requests = []; const errors = []; const badResponses = []; const policyErrors = [];
      page.on('request', request => requests.push(request.url()));
      page.on('pageerror', error => errors.push(error.message));
      page.on('response', response => { if (response.status() >= 400) badResponses.push(response.url()); });
      page.on('console', message => { if (message.type() === 'error' && /content.security.policy|violat.*policy|refused.*(?:script|style|font)/iu.test(message.text())) policyErrors.push(message.text()); });
      await page.goto(url); await ready(page);
      assert.equal(await page.getByRole('heading', { level: 1 }).textContent(), 'Workbench');
      assert.equal(await page.locator('.tile').count(), 7);
      assert.equal(await page.locator('.group').count(), 2);
      assert.equal(await page.locator('.tab').count(), 3);
      assert.deepEqual(await page.locator('.tab-n').allTextContents(), ['7', '4', '3']);
      assert.equal(await page.locator('[data-seg="all"]').getAttribute('aria-pressed'), 'true');
      assert.equal(await page.locator('.pipeline').count(), 1);
      assert.equal(await page.locator('#theme').getAttribute('aria-label'), 'Koyu temaya geç');
      const capabilities = await page.evaluate(() => ({ coarse: matchMedia('(any-pointer:coarse)').matches, fine: matchMedia('(any-pointer:fine)').matches, hover: matchMedia('(hover:hover)').matches }));
      const resources = await page.evaluate(() => [...performance.getEntriesByType('navigation'), ...performance.getEntriesByType('resource')].map(entry => ({
        name: entry.name, decoded: entry.decodedBodySize, encoded: entry.encodedBodySize, transferred: entry.transferSize })));
      assert.ok(requests.every(request => new URL(request).origin === new URL(url).origin));
      const decoded = resources.reduce((sum, resource) => sum + resource.decoded, 0);
      const js = resources.filter(resource => new URL(resource.name).pathname.endsWith('.mjs')).reduce((sum, resource) => sum + resource.decoded, 0);
      const fonts = resources.filter(resource => new URL(resource.name).pathname.endsWith('.woff2'));
      assert.ok(decoded > 0 && decoded <= evidence.budgets.decodedRoute, engine + ' route budget ' + decoded);
      assert.ok(js > 0 && js <= evidence.budgets.js, engine + ' JS budget ' + js);
      assert.equal(fonts.length, 2, engine + ' both local Latin/Turkish font subsets must be measured');
      assert.ok(fonts.every(font => font.decoded > 0));
      assert.ok(resources.some(resource => new URL(resource.name).pathname.endsWith('/theme.mjs')));
      assert.ok(await page.evaluate(() => document.fonts.check('600 17px "Josefin Sans"')));
      assert.equal(await page.locator('script:not([src]), [style]').count(), 0);
      const traversalKey = engine === 'webkit' ? 'Alt+Tab' : 'Tab';
      for (const viewport of [{ width: 320, height: 568 }, { width: 480, height: 320 }, { width: 568, height: 320 }]) {
        await page.setViewportSize(viewport);
        await page.locator('#app-penpot').focus();
        for (const id of ['open-design', 'affinity', 'blender', 'storybook-beta', 'storybook-rc', 'pen']) {
          await page.keyboard.press(traversalKey);
          await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
          const focused = await page.evaluate(() => {
            const tile = document.activeElement;
            const name = tile.querySelector('.name').getBoundingClientRect();
            const rect = tile.getBoundingClientRect();
            const top = document.querySelector('.bar--top').getBoundingClientRect().bottom;
            const bottom = document.querySelector('.bar--bottom').getBoundingClientRect().top;
            const target = rect.height <= bottom - top ? rect : name;
            return { id: tile.dataset.id, top: target.top, bottom: target.bottom, visibleTop: top, visibleBottom: bottom,
              scope: rect.height <= bottom - top ? 'whole tile' : 'name in short landscape',
              nameExposed: tile.contains(document.elementFromPoint(name.left + name.width / 2, name.top + name.height / 2)) };
          });
          assert.equal(focused.id, id);
          assert.ok(focused.top >= focused.visibleTop - .5 && focused.bottom <= focused.visibleBottom + .5 && focused.nameExposed,
            engine + ' sticky bars must not obscure the focused tile or name: ' + JSON.stringify(focused));
          if (id === 'affinity') await capture(page, engine, { path: join(output, engine + '-sticky-focus-' + viewport.width + '.png') });
        }
        rows.push({ engine, viewport, stickyFocusVisibility: 'pass', nativeTileTraversal: 'pass' });
      }
      await page.setViewportSize({ width: 320, height: 568 });
      await page.locator('#app-affinity').focus();
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
      for (const viewport of [{ width: 480, height: 320 }, { width: 568, height: 320 }, { width: 320, height: 568 }]) {
        await page.setViewportSize(viewport);
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
        const current = await page.evaluate(() => {
          const tile = document.activeElement;
          const name = tile.querySelector('.name').getBoundingClientRect();
          return { id: tile.dataset.id, top: name.top, bottom: name.bottom,
            visibleTop: document.querySelector('.bar--top').getBoundingClientRect().bottom,
            visibleBottom: document.querySelector('.bar--bottom').getBoundingClientRect().top };
        });
        assert.equal(current.id, 'affinity');
        assert.ok(current.top >= current.visibleTop - .5 && current.bottom <= current.visibleBottom + .5,
          engine + ' existing tile focus must remain visible across resize: ' + JSON.stringify(current));
      }
      rows.push({ engine, existingTileFocusAcrossPortraitLandscape: 'pass' });
      await page.locator('#app-pen').blur();
      await page.locator('#app-affinity').blur();
      await page.evaluate(() => window.scrollTo(0, 0));
      for (const viewport of [{width:320,height:480},{width:320,height:568},{width:360,height:640},{width:375,height:667},{width:390,height:844},
        {width:480,height:320},{width:568,height:320},{width:599,height:800},{width:600,height:800},{width:601,height:800},
        {width:639,height:800},{width:640,height:800},{width:641,height:800},{width:768,height:800},{width:1024,height:800},{width:1440,height:900},{width:1920,height:1080}]) {
        await assertLayout(page, engine, viewport);
        if ([320,390,1440].includes(viewport.width) && viewport.height !== 480) await capture(page, engine, { path: join(output, engine + '-' + viewport.width + '.png'), fullPage: true });
      }
      await page.setViewportSize({ width: 320, height: 568 });
      const search = page.locator('#q');
      await search.fill('PENPOT');
      assert.equal(await visible(page).count(), 1);
      assert.equal(await visible(page).getAttribute('data-id'), 'penpot');
      assert.equal(await page.locator('#live').textContent(), '1 uygulama');
      await page.keyboard.press('Enter');
      assert.equal(await page.evaluate(() => document.activeElement.dataset.id), 'penpot');
      await search.focus(); await page.keyboard.press('Escape');
      assert.equal(await search.inputValue(), '');
      assert.equal(await visible(page).count(), 7);
      await page.locator('[data-seg="design"]').click();
      assert.equal(await visible(page).count(), 4);
      await search.fill('ÇİZİM');
      assert.equal(await visible(page).getAttribute('data-id'), 'affinity');
      await page.locator('#clear').tap();
      assert.equal(await search.inputValue(), '');
      assert.equal(await search.evaluate(element => element === document.activeElement), true);
      assert.equal(await page.locator('[data-seg="design"]').getAttribute('aria-pressed'), 'true');
      assert.equal(await visible(page).count(), 4);
      await search.fill('beta');
      assert.equal(await visible(page).count(), 0);
      assert.equal(await page.locator('#empty').isVisible(), true);
      assert.deepEqual(await page.locator('.tab-n').allTextContents(), ['1', '0', '1']);
      await capture(page, engine, { path: join(output, engine + '-empty-320.png'), fullPage: true });
      await page.locator('#empty-clear').click();
      assert.equal(await visible(page).count(), 7);
      assert.equal(await page.locator('[data-seg="all"]').getAttribute('aria-pressed'), 'true');
      assert.equal(await search.evaluate(element => element === document.activeElement), true);
      await page.locator('[data-seg="comp"]').focus(); await page.keyboard.press('Space');
      assert.equal(await visible(page).count(), 3);
      assert.equal(await page.locator('[data-seg="comp"]').getAttribute('aria-pressed'), 'true');
      await page.locator('[data-seg="all"]').focus(); await page.keyboard.press('Enter');
      assert.equal(await visible(page).count(), 7);
      await search.focus();
      await page.keyboard.type('/');
      assert.equal(await search.inputValue(), '/');
      await page.keyboard.press('Escape');
      await search.fill('beta storybook');
      assert.equal(await visible(page).getAttribute('data-id'), 'storybook-beta');
      await page.setViewportSize({ width: 844, height: 390 });
      assert.equal(await search.inputValue(), 'beta storybook');
      assert.equal(await search.evaluate(element => element === document.activeElement), true);
      const afterRotateRequests = requests.length;
      await page.setViewportSize({ width: 320, height: 568 });
      assert.equal(requests.length, afterRotateRequests);
      await page.keyboard.press('Escape');
      await page.locator('.skip-link').focus(); await page.keyboard.press('Enter');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'app-penpot');
      await page.keyboard.press('/');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'q');
      const forwardKey = engine === 'webkit' ? 'Alt+Tab' : 'Tab';
      const backKey = engine === 'webkit' ? 'Shift+Alt+Tab' : 'Shift+Tab';
      const keyboardNavigationPolicy = engine === 'webkit'
        ? 'WebKit emulated coarse uses Alt+Tab full-control navigation; ordinary Tab skips native controls'
        : 'Ordinary Tab full-control navigation';
      await page.keyboard.press(backKey);
      assert.equal(await page.evaluate(() => document.activeElement.dataset.seg), 'comp', engine + ' reverse traversal from search reaches the preceding group control');
      await page.keyboard.press(forwardKey);
      assert.equal(await page.evaluate(() => document.activeElement.id), 'q', engine + ' forward traversal returns to search before focus-style inspection');
      const focus = await search.evaluate(element => ({ outline: getComputedStyle(element).outlineWidth, style: getComputedStyle(element).outlineStyle,
        color: getComputedStyle(element).outlineColor, parentOutline: getComputedStyle(element.parentElement).outlineStyle }));
      assert.ok(parseFloat(focus.outline) >= 2); assert.equal(focus.style, 'solid'); assert.equal(focus.parentOutline, 'none');
      await capture(page, engine, { path: join(output, engine + '-focus-320.png'), fullPage: true });
      for (const editableValue of ['', 'plaintext-only']) {
        await page.evaluate(value => { const editor = document.createElement('div'); editor.id = 'keyboard-editor'; editor.setAttribute('contenteditable', value); document.body.append(editor); editor.focus(); }, editableValue);
        await page.keyboard.press('/');
        assert.equal(await page.locator('#keyboard-editor').textContent(), '/');
        assert.equal(await page.evaluate(() => document.activeElement.id), 'keyboard-editor');
        await page.locator('#keyboard-editor').evaluate(element => element.remove());
      }
      await page.locator('#theme').focus();
      await page.keyboard.press(forwardKey); await page.keyboard.press(backKey);
      assert.equal(await page.evaluate(() => document.activeElement.id), 'theme', engine + ' full-control traversal returns to theme before light focus inspection');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'theme');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, engine + ' theme focus must not overflow320');
      await assertThemeContrast(page, engine, 'light');
      await page.locator('#theme').click();
      assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'dark');
      assert.equal(await page.locator('#theme').getAttribute('aria-label'), 'Açık temaya geç');
      assert.equal(await page.evaluate(() => localStorage.getItem('wb:theme')), 'dark');
      await page.keyboard.press(forwardKey); await page.keyboard.press(backKey);
      assert.equal(await page.evaluate(() => document.activeElement.id), 'theme', engine + ' full-control traversal returns to theme before dark focus inspection');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'theme');
      await assertThemeContrast(page, engine, 'dark');
      await capture(page, engine, { path: join(output, engine + '-dark-320.png'), fullPage: true });
      await page.reload(); await ready(page);
      assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'dark');
      await page.locator('#theme').click();
      assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'light');
      assert.equal(await page.locator('#theme').getAttribute('aria-label'), 'Koyu temaya geç');
      const targets = await page.locator('button, #q, .tile').evaluateAll(elements => elements.filter(element => element.getClientRects().length).map(element => ({
        tag: element.tagName, name: element.getAttribute('aria-label') || element.textContent.trim(), width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height })));
      const minimum = capabilities.coarse ? 48 : 44;
      assert.ok(targets.every(target => target.width >= minimum && target.height >= minimum), engine + ' hit targets ' + JSON.stringify(targets));
      assert.equal(errors.length, 0, errors.join('\n'));
      assert.equal(badResponses.length, 0, badResponses.join('\n'));
      assert.equal(policyErrors.length, 0, policyErrors.join('\n'));
      rows.push({ engine, input: 'emulated touch + keyboard', capabilities, keyboardNavigationPolicy, search: 'pass', groupFilters: 'pass', groupPreservingClear: 'pass',
        emptyResetAll: 'pass', enterFocus: 'pass', themePersistence: 'pass', focus: 'pass', resizeContinuity: 'pass',
        requests, decodedBytes: decoded, jsBytes: js, fonts, resourceDetails: resources, targetMinimum: minimum, targetSizes: targets, focusComputed: focus, browserVersion: browser.version() });
      await writeFile(join(output, engine + '-aria.yml'), await page.locator('body').ariaSnapshot());

      await context.route(/^https:\/\/(?:wb|pen)\.atonota\.net\//u, route => route.fulfill({ status: 200, contentType: 'text/html', body: '<title>Configured target</title>' }));
      const popupPromise = context.waitForEvent('page');
      await page.locator('#app-pen').click();
      const popup = await popupPromise; await popup.waitForURL(app('pen').url);
      assert.equal(await popup.evaluate(() => window.opener), null); await popup.close();
      await search.fill('penpot');
      const returnPromise = context.waitForEvent('page');
      await page.locator('#app-penpot').tap();
      const returnPopup = await returnPromise; await returnPopup.waitForURL(app('penpot').url); await returnPopup.close();
      await page.bringToFront(); await page.reload(); await ready(page);
      assert.equal(await search.inputValue(), 'penpot');
      assert.equal(await visible(page).getAttribute('data-id'), 'penpot');
      assert.equal(await page.evaluate(() => document.activeElement.dataset.id), 'penpot');
      rows.push({ engine, newTab: 'pass', openerIsolation: 'pass', queryAndFocusAfterReload: 'pass', destinationNetwork: 'mocked; not server validation' });
      await context.close();

      for (const touch of [false, true]) {
        const pointerContext = await browser.newContext({ viewport: { width: 320, height: 568 }, hasTouch: touch, colorScheme: 'light', reducedMotion: 'reduce', serviceWorkers: 'block' });
        await pointerContext.route(/^https:\/\/wb\.atonota\.net\//u, route => route.fulfill({ status: 200, contentType: 'text/html', body: '<title>Configured target</title>' }));
        const pointerPage = await pointerContext.newPage(); await pointerPage.goto(url); await ready(pointerPage);
        const icon = await pointerPage.locator('#app-affinity .ic').boundingBox();
        const before = await pointerPage.evaluate(() => scrollY);
        const opened = pointerContext.waitForEvent('page');
        if (touch) await pointerPage.touchscreen.tap(icon.x + icon.width / 2, icon.y + icon.height / 2);
        else await pointerPage.mouse.click(icon.x + icon.width / 2, icon.y + icon.height / 2);
        const destination = await opened; await destination.waitForURL(app('affinity').url);
        await pointerPage.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
        assert.equal(await pointerPage.evaluate(() => scrollY), before, engine + ' pointer activation must not trigger keyboard-only reveal');
        assert.equal(await destination.evaluate(() => opener), null);
        rows.push({ engine, pointer: touch ? 'emulated touch' : 'emulated mouse', pointerRevealIsolation: 'pass', partiallyVisibleTileLaunch: 'pass' });
        await pointerContext.close();
      }

      for (const fixture of ['invalid-json', 'invalid-types', 'stored-design', 'blocked-storage']) {
        const restored = await browser.newContext({ viewport: { width: 320, height: 568 }, colorScheme: 'light', reducedMotion: 'reduce', serviceWorkers: 'block' });
        await restored.addInitScript(kind => {
          if (kind === 'blocked-storage') {
            Object.defineProperty(Storage.prototype, 'getItem', { value() { throw new Error('Storage blocked'); } });
            Object.defineProperty(Storage.prototype, 'setItem', { value() { throw new Error('Storage blocked'); } });
          } else {
            sessionStorage.setItem('wb:state', kind === 'invalid-json' ? '{broken' : JSON.stringify(kind === 'invalid-types' ?
              { q: {}, seg: '../bad', last: 'unknown', y: 1e100 } : { q: 'penpot', seg: 'design', last: 'penpot', y: 0 }));
            localStorage.setItem('wb:theme', kind === 'stored-design' ? 'dark' : 'invalid');
          }
        }, fixture);
        const restoredPage = await restored.newPage(); const restoredErrors = [];
        restoredPage.on('pageerror', error => restoredErrors.push(error.message));
        await restoredPage.goto(url); await ready(restoredPage);
        assert.equal(await restoredPage.locator('#q').inputValue(), fixture === 'stored-design' ? 'penpot' : '');
        assert.equal(await visible(restoredPage).count(), fixture === 'stored-design' ? 1 : 7);
        if (fixture === 'stored-design') {
          assert.equal(await restoredPage.locator('[data-seg="design"]').getAttribute('aria-pressed'), 'true');
          assert.equal(await restoredPage.evaluate(() => document.documentElement.dataset.theme), 'dark');
          assert.equal(await restoredPage.evaluate(() => document.activeElement.dataset.id), 'penpot');
        }
        await restoredPage.locator('#q').fill('blender');
        assert.equal(await visible(restoredPage).getAttribute('data-id'), 'blender');
        await restoredPage.locator('#theme').click();
        assert.equal(await restoredPage.evaluate(() => document.documentElement.dataset.theme), fixture === 'stored-design' ? 'light' : 'dark');
        assert.equal(restoredErrors.length, 0, restoredErrors.join('\n'));
        rows.push({ engine, fixture, recoveryAndInteraction: 'pass' });
        await restored.close();
      }

      const failedModuleContext = await browser.newContext({ viewport: { width: 320, height: 568 }, colorScheme: 'light' });
      await failedModuleContext.route(requestURL => requestURL.pathname.endsWith('/app.mjs'), route => route.abort());
      const failedModule = await failedModuleContext.newPage();
      await failedModule.goto(url);
      assert.equal(await failedModule.locator('.tile').count(), 7);
      assert.equal(await failedModule.locator('.bar--bottom').isVisible(), false);
      assert.equal(await failedModule.locator('#theme').isVisible(), false);
      rows.push({ engine, failedEnhancement: 'pass', staticLinksStillPresent: 'pass' });
      await failedModuleContext.close();

      const noJS = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 320, height: 568 }, colorScheme: 'light' });
      const baseline = await noJS.newPage(); await baseline.goto(url);
      assert.equal(await baseline.locator('.tile').count(), 7);
      assert.equal(await baseline.locator('.bar--bottom').isVisible(), false);
      assert.equal(await baseline.locator('#theme').isVisible(), false);
      for (const item of catalog) assert.equal(await baseline.locator('#app-' + item.id).getAttribute('href'), item.url);
      assert.ok(await baseline.locator('noscript').isVisible());
      await capture(baseline, engine, { path: join(output, engine + '-nojs-320.png'), fullPage: true });
      rows.push({ engine, noJS: 'pass', sevenStaticLinks: 'pass', inertControlsHidden: 'pass' });
      await noJS.close();

      for (const width of [320, 1440]) {
        const precision = await browser.newContext({ viewport: { width, height: 900 }, hasTouch: false, colorScheme: 'light', reducedMotion: 'reduce',
          locale: 'tr-TR', deviceScaleFactor: 1, serviceWorkers: 'block' });
        const desktop = await precision.newPage(); await desktop.goto(url); await ready(desktop);
        const fineCapabilities = await desktop.evaluate(() => ({ coarse: matchMedia('(any-pointer:coarse)').matches, fine: matchMedia('(any-pointer:fine)').matches, hover: matchMedia('(hover:hover)').matches }));
        assert.equal(fineCapabilities.fine, true); assert.equal(fineCapabilities.coarse, false);
        await desktop.keyboard.press('/');
        assert.equal(await desktop.evaluate(() => document.activeElement.id), 'q');
        await desktop.keyboard.type('blender');
        assert.equal(await visible(desktop).getAttribute('data-id'), 'blender');
        await desktop.keyboard.press('Escape');
        await desktop.locator('#app-penpot').hover();
        await capture(desktop, engine, { path: join(output, engine + '-hover-' + width + '.png'), fullPage: true });
        await desktop.mouse.move(0, 0); await desktop.locator('#q').blur();
        const screenshot = await capture(desktop, engine, { path: join(output, engine + '-fine-' + width + '-final.png'), fullPage: true });
        assert.ok(screenshot.equals(await capture(desktop, engine, { fullPage: true })), engine + ' stationary visual determinism');
        await desktop.locator('#theme').click();
        await capture(desktop, engine, { path: join(output, engine + '-dark-' + width + '-final.png'), fullPage: true });
        rows.push({ engine, width, pointer: 'emulated fine mouse + keyboard', capabilities: fineCapabilities, hover: 'pass',
          searchShortcut: 'pass', deterministicRepeatedScreenshot: 'pass; not approved regression baseline' });
        await precision.close();
      }
    } finally { await browser.close(); }
  }
  evidence.status = 'pass';
  console.log(rows.length + ' browser checks passed. Physical devices/screen reader/real soft keyboard: not_run.');
} catch (error) {
  evidence.status = 'fail'; evidence.error = error.stack; throw error;
} finally {
  await writeFile(join(output, 'results.json'), JSON.stringify(evidence, null, 2));
  server.close();
}
