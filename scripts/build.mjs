import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { posix } from 'node:path';
import { catalog } from '../catalog.mjs';
import { renderPage } from '../render.mjs';

const output = new URL('../site/', import.meta.url);
const modules = ['app.mjs', 'catalog.mjs', 'model.mjs', 'theme.mjs'];
const files = ['styles.css', ...modules, 'favicon.svg',
  'fonts/josefin-sans-latin-wght-normal.woff2', 'fonts/josefin-sans-latin-ext-wght-normal.woff2', 'fonts/OFL.txt'];
const sources = new Map(await Promise.all(files.map(async file => [file, await readFile(new URL(`../${file}`, import.meta.url))])));
const html = renderPage(catalog);
// Hash original emitted content, not timestamps or already-versioned output.
const digest = createHash('sha256');
for (const [file, source] of [['index.html', Buffer.from(html)], ...sources].sort(([a], [b]) => a.localeCompare(b, 'en'))) {
  digest.update(file + '\0' + source.length + '\0'); digest.update(source);
}
const version = digest.digest('hex').slice(0, 12);
function versionURL(value, importer, required = false) {
  const fragmentAt = value.indexOf('#');
  const fragment = fragmentAt < 0 ? '' : value.slice(fragmentAt);
  const withoutFragment = fragmentAt < 0 ? value : value.slice(0, fragmentAt);
  const queryAt = withoutFragment.indexOf('?');
  const path = queryAt < 0 ? withoutFragment : withoutFragment.slice(0, queryAt);
  const file = posix.normalize(posix.join(posix.dirname(importer), path));
  if (!sources.has(file)) {
    if (required) throw new Error(`Relative module dependency is not emitted: ${importer} -> ${value}`);
    return value;
  }
  const query = new URLSearchParams(queryAt < 0 ? '' : withoutFragment.slice(queryAt + 1));
  query.set('v', version);
  return path + '?' + query + fragment;
}
function versionModule(source, file) {
  return source.replace(/(\b(?:import|export)\s+(?:[^;"'`]*?\bfrom\s*)?)(["'])(\.{1,2}\/[^"']+)\2/gu,
    (_, prefix, quote, value) => prefix + quote + versionURL(value, file, true) + quote)
    .replace(/(\bimport\s*\(\s*)(["'])(\.{1,2}\/[^"']+)\2/gu,
      (_, prefix, quote, value) => prefix + quote + versionURL(value, file, true) + quote);
}
await mkdir(output, { recursive: true });
await writeFile(new URL('index.html', output), html.replace(/\b(src|href)=(["'])(\.\/[^"']+)\2/gu,
  (_, attribute, quote, value) => attribute + '=' + quote + versionURL(value, 'index.html') + quote));
for (const [file, original] of sources) {
  await mkdir(new URL(posix.dirname(file) + '/', output), { recursive: true });
  const source = modules.includes(file) ? versionModule(original.toString('utf8'), file)
    : file.endsWith('.css') ? original.toString('utf8').replace(/(url\(\s*)(["'])(\.\/[^"']+)\2(\s*\))/gu,
      (_, prefix, quote, value, suffix) => prefix + quote + versionURL(value, file) + quote + suffix) : original;
  await writeFile(new URL(file, output), source);
}
await writeFile(new URL('.nojekyll', output), '');
console.log(`Built ${catalog.length} launcher destinations; content version ${version}.`);
