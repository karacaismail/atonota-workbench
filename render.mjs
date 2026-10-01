import { readFileSync } from 'node:fs';
import { icon } from './icons.mjs';
import { validateCatalog } from './model.mjs';
const template = readFileSync(new URL('./page-template.html', import.meta.url), 'utf8');

export function escapeHTML(value) {
  return String(value).replace(/[&<>"']/gu, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}
export function renderPage(apps) {
  const errors = validateCatalog(apps);
  if (errors.length) throw new Error(errors.join('\n'));
  return template.replace(/\{\{(tiles|count):(design|comp|all)\}\}/gu, (_, kind, group) => {
    const selected = group === 'all' ? apps : apps.filter(app => app.group === group);
    if (kind === 'count') return String(selected.length);
    return selected.map(app => `<a class="tile" data-id="${escapeHTML(app.id)}" id="app-${escapeHTML(app.id)}" href="${escapeHTML(app.url)}" target="_blank" rel="noopener noreferrer">
          <span class="ic">${icon(app.id)}</span>
          <span class="name">${escapeHTML(app.name)}</span>
          <span class="sr-only"> (yeni sekmede açılır)</span>
        </a>`).join('\n');
  });
}
