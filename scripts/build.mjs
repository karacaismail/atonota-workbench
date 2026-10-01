import { mkdir, copyFile, writeFile } from 'node:fs/promises';
import { catalog } from '../catalog.mjs';
import { renderPage } from '../render.mjs';

const output = new URL('../site/', import.meta.url);
await mkdir(output, { recursive: true });
await writeFile(new URL('index.html', output), renderPage(catalog));
for (const file of ['styles.css', 'app.mjs', 'catalog.mjs', 'model.mjs', 'theme.mjs', 'favicon.svg']) {
  await copyFile(new URL(`../${file}`, import.meta.url), new URL(file, output));
}
await mkdir(new URL('fonts/', output), { recursive: true });
for (const file of ['josefin-sans-latin-wght-normal.woff2', 'josefin-sans-latin-ext-wght-normal.woff2', 'OFL.txt']) {
  await copyFile(new URL(`../fonts/${file}`, import.meta.url), new URL(`fonts/${file}`, output));
}
await writeFile(new URL('.nojekyll', output), '');
console.log(`Built ${catalog.length} launcher destinations.`);
