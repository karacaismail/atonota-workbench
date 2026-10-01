import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as registry from '../catalog.mjs';
import * as model from '../model.mjs';
const { catalog, groups } = registry;
const { filterApps, normalizeSearch, validateCatalog } = model;

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
  assert.deepEqual(filterApps(catalog, 'beta storybook').map(app => app.id), ['storybook-beta']);
  assert.deepEqual(filterApps(catalog, 'storybook penpot'), []);
  assert.deepEqual(filterApps(catalog, '<script>'), []);
});
test('the exact user provided domains and paths remain the target registry', () => {
  assert.deepEqual(Object.fromEntries(catalog.map(app => [app.id, app.url])), {
    pen: 'https://pen.atonota.net/', penpot: 'https://wb.atonota.net/pp',
    'open-design': 'https://wb.atonota.net/od', affinity: 'https://wb.atonota.net/ad',
    blender: 'https://wb.atonota.net/b3d', 'storybook-beta': 'https://wb.atonota.net/sbbeta',
    'storybook-rc': 'https://wb.atonota.net/sbrc',
  });
  assert.equal(validateCatalog(catalog).length, 0);
});
test('build rejects unsafe, duplicate, unknown-host or credential-bearing registry entries', () => {
  for (const url of ['javascript:alert(1)', 'http://wb.atonota.net/pp', 'https://elsewhere.test/', 'https://secret@wb.atonota.net/pp', 'https://wb.atonota.net:444/pp', 'https://wb.atonota.net/pp?token=test', 'https://wb.atonota.net/pp#secret']) {
    assert.ok(validateCatalog([{ ...catalog[0], url }]).length > 0, url);
  }
  assert.ok(validateCatalog([catalog[0], catalog[0]]).length > 0);
  assert.ok(validateCatalog([{ ...catalog[0], id: '../bad' }]).length > 0);
  assert.ok(validateCatalog([{ ...catalog[0], group: 'unknown' }]).length > 0);
});

test('ZIP design groups and pipeline order remain exact', () => {
  assert.deepEqual(groups.map(group => [group.id, group.name]), [['design', 'Tasarım'], ['comp', 'Bileşen hattı']]);
  assert.deepEqual(catalog.map(app => app.id), ['penpot', 'open-design', 'affinity', 'blender', 'storybook-beta', 'storybook-rc', 'pen']);
  assert.deepEqual(filterApps(catalog, '', 'design').map(app => app.id), ['penpot', 'open-design', 'affinity', 'blender']);
  assert.deepEqual(filterApps(catalog, '', 'comp').map(app => app.id), ['storybook-beta', 'storybook-rc', 'pen']);
});

test('group names and aliases extend search without breaking every-term matching', () => {
  assert.equal(filterApps(catalog, 'bileşen hattı').length, 3);
  assert.equal(filterApps(catalog, 'tasarım', 'design').length, 4);
  assert.deepEqual(filterApps(catalog, 'geliştirme beta', 'comp').map(app => app.id), ['storybook-beta']);
  assert.deepEqual(filterApps(catalog, 'beta', 'design'), []);
  for (const value of [null, undefined, 123, {}, []]) assert.equal(normalizeSearch(value), '');
});

test('stored launcher state is normalized without trusting parsed JSON types', () => {
  const fresh = { q: '', seg: 'all', last: '', y: 0 };
  for (const raw of [null, undefined, [], true, 42, 'old schema']) assert.deepEqual(model.normalizeState(raw, catalog), fresh);
  assert.deepEqual(model.normalizeState({ q: {}, seg: 'admin', last: '../bad', y: Infinity }, catalog), fresh);
  assert.deepEqual(model.normalizeState({ q: '  PENPOT ', seg: 'design', last: 'penpot', y: 42.5 }, catalog), { q: '  PENPOT ', seg: 'design', last: 'penpot', y: 42.5 });
  assert.equal(model.normalizeState({ q: 'x'.repeat(500) }, catalog).q.length, 160);
  for (const value of [-1, NaN, Infinity, '40', null]) assert.equal(model.normalizeState({ y: value }, catalog).y, 0);
  assert.ok(model.normalizeState({ y: 1e100 }, catalog).y < 1e100, 'scroll restoration must have a finite practical bound');
  assert.equal(model.normalizeState({ last: 'penpot' }, [catalog.find(app => app.id === 'pen')]).last, '');
});

test('theme storage only accepts explicit supported choices', () => {
  assert.equal(model.normalizeTheme('light'), 'light');
  assert.equal(model.normalizeTheme('dark'), 'dark');
  for (const value of ['', 'system', 'DARK', null, undefined, {}, true]) assert.equal(model.normalizeTheme(value), null);
});
