import { mkdir, copyFile, writeFile } from 'node:fs/promises';
import { catalog } from '../catalog.mjs';
import { renderPage } from '../render.mjs';

const output = new URL('../site/', import.meta.url);
await mkdir(output, { recursive: true });
await writeFile(new URL('index.html', output), renderPage(catalog));
for (const file of ['styles.css', 'app.mjs', 'catalog.mjs', 'model.mjs', 'favicon.svg']) {
  await copyFile(new URL(`../${file}`, import.meta.url), new URL(file, output));
}
await writeFile(new URL('.nojekyll', output), '');
console.log(`Built ${catalog.length} launcher destinations.`);
