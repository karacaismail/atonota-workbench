import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, readFile, writeFile, copyFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
const root = fileURLToPath(new URL('../', import.meta.url));
const modules = ['app.mjs', 'catalog.mjs', 'model.mjs', 'theme.mjs'];
const fonts = ['fonts/josefin-sans-latin-wght-normal.woff2', 'fonts/josefin-sans-latin-ext-wght-normal.woff2'];
const files = [...modules, ...fonts, 'fonts/OFL.txt', 'styles.css', 'favicon.svg', 'render.mjs', 'icons.mjs', 'page-template.html', 'scripts/build.mjs'];
const base = 'https://fixture.invalid/workbench/';

async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'atonota-workbench-build-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  for (const file of files) {
    await mkdir(dirname(join(directory, file)), { recursive: true });
    await copyFile(join(root, file), join(directory, file));
  }
  return directory;
}
async function build(directory) {
  await run(process.execPath, ['scripts/build.mjs'], { cwd: directory });
  const html = await readFile(join(directory, 'site/index.html'), 'utf8');
  const urls = [...html.matchAll(/\b(?:src|href)="([^"]+)"/gu)].map(match => new URL(match[1], base)).filter(url => url.origin === new URL(base).origin && /\.(?:mjs|css|svg|woff2)$/u.test(url.pathname));
  const hash = urls.find(url => url.pathname.endsWith('/styles.css'))?.searchParams.get('v');
  assert.match(hash || '', /^[a-f\d]{12}$/u, 'stylesheet needs a deterministic content version');
  assert.ok(urls.length >= 5);
  assert.ok(urls.every(url => url.searchParams.get('v') === hash), 'every HTML asset must share the same build version');
  for (const file of modules) {
    const source = await readFile(join(directory, 'site', file), 'utf8');
    const imports = [...source.matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*)(['"])(\.{1,2}\/[^'"]+)\1/gu)];
    for (const match of imports) {
      const dependency = new URL(match[2], new URL(file, base));
      assert.equal(dependency.searchParams.get('v'), hash, file + ' dependency ' + match[2]);
      await readFile(join(directory, 'site', dependency.pathname.slice(new URL(base).pathname.length)));
    }
  }
  const css = await readFile(join(directory, 'site/styles.css'), 'utf8');
  const cssFonts = [...css.matchAll(/url\(['"]([^'"]+\.woff2[^'"]*)['"]\)/gu)].map(match => new URL(match[1], base));
  assert.equal(cssFonts.length, 2);
  assert.ok(cssFonts.every(url => url.searchParams.get('v') === hash), 'CSS fonts and HTML preload must use the same version');
  return { hash, contents: await Promise.all(['index.html', 'styles.css', ...modules, ...fonts].map(file => readFile(join(directory, 'site', file)))) };
}

test('build versions every HTML asset and transitive module import, preserving query and fragment', async t => {
  const directory = await fixture(t);
  await writeFile(join(directory, 'app.mjs'), (await readFile(join(directory, 'app.mjs'), 'utf8')) + '\nimport "./model.mjs?source=side#example";\nexport { catalog as fixtureCatalog } from "./catalog.mjs";\nconst fixtureLazy = () => import("./model.mjs?source=dynamic#example");\n');
  await build(directory);
  const emitted = await readFile(join(directory, 'site/app.mjs'), 'utf8');
  assert.match(emitted, /model\.mjs\?source=side&v=[a-f\d]{12}#example/u);
  assert.match(emitted, /model\.mjs\?source=dynamic&v=[a-f\d]{12}#example/u);
});
test('unchanged builds are byte-identical; source, rendered HTML, and font changes invalidate all assets', async t => {
  const directory = await fixture(t);
  const first = await build(directory);
  const repeat = await build(directory);
  assert.equal(repeat.hash, first.hash);
  assert.deepEqual(repeat.contents, first.contents);
  for (const file of ['model.mjs', 'page-template.html', fonts[0]]) {
    const before = await build(directory);
    const source = await readFile(join(directory, file));
    await writeFile(join(directory, file), Buffer.concat([source, Buffer.from(file.endsWith('.mjs') ? '\n// changed fixture\n' : file.endsWith('.html') ? '\n<!-- changed fixture -->\n' : '\nfixture')]));
    const after = await build(directory);
    assert.notEqual(after.hash, before.hash, file + ' change must invalidate the build version');
  }
});
