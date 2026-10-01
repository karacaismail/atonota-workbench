import assert from 'node:assert/strict';
import { test } from 'node:test';
import { catalog } from '../catalog.mjs';
import { filterApps, normalizeSearch, validateCatalog } from '../model.mjs';

test('empty search exposes every configured application in the original order', () => {
  assert.deepEqual(filterApps(catalog, '  '), catalog);
});
test('search matches names, purpose, route and aliases without Turkish case/diacritic traps', () => {
  assert.equal(normalizeSearch(' İŞ AKIŞI '), 'is akisi');
  assert.deepEqual(filterApps(catalog, 'PENPOT').map(app => app.id), ['penpot']);
  assert.deepEqual(filterApps(catalog, 'çizim').map(app => app.id), ['affinity']);
  assert.deepEqual(filterApps(catalog, '3D').map(app => app.id), ['blender']);
  assert.deepEqual(filterApps(catalog, '/sbrc').map(app => app.id), ['storybook-rc']);
});
test('multiple search words all match and unknown input is an empty result', () => {
  assert.deepEqual(filterApps(catalog, 'storybook beta').map(app => app.id), ['storybook-beta']);
  assert.deepEqual(filterApps(catalog, 'storybook penpot'), []);
  assert.deepEqual(filterApps(catalog, '<script>'), []);
});
test('the exact user provided domains and paths remain the target registry', () => {
  assert.deepEqual(catalog.map(app => app.url), [
    'https://pen.atonota.net/', 'https://wb.atonota.net/pp',
    'https://wb.atonota.net/od', 'https://wb.atonota.net/ad',
    'https://wb.atonota.net/b3d', 'https://wb.atonota.net/sbbeta',
    'https://wb.atonota.net/sbrc',
  ]);
  assert.equal(validateCatalog(catalog).length, 0);
});
test('build rejects unsafe, duplicate, unknown-host or credential-bearing registry entries', () => {
  for (const url of ['javascript:alert(1)', 'http://wb.atonota.net/pp', 'https://elsewhere.test/', 'https://secret@wb.atonota.net/pp', 'https://wb.atonota.net:444/pp']) {
    assert.ok(validateCatalog([{ ...catalog[0], url }]).length > 0, url);
  }
  assert.ok(validateCatalog([catalog[0], catalog[0]]).length > 0);
  assert.ok(validateCatalog([{ ...catalog[0], id: '../bad' }]).length > 0);
});
