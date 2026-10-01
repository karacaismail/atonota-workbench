import { catalog } from './catalog.mjs';
import { filterApps } from './model.mjs';

const search = document.querySelector('#app-search');
const form = document.querySelector('.search-form');
const clear = document.querySelector('#clear-search');
const empty = document.querySelector('.empty-state');
const count = document.querySelector('#result-count');
const items = [...document.querySelectorAll('[data-app-id]')];

function refresh() {
  const visible = new Set(filterApps(catalog, search.value).map(app => app.id));
  items.forEach(item => { item.hidden = !visible.has(item.dataset.appId); });
  empty.hidden = visible.size !== 0;
  clear.hidden = search.value.length === 0;
  count.textContent = search.value.trim() ? `${visible.size} / ${catalog.length} uygulama` : `${catalog.length} uygulama`;
  const first = items.find(item => !item.hidden)?.querySelector('a');
  document.querySelector('.skip-link').href = first ? `#${first.id}` : '#app-search';
}
function reset() {
  search.value = '';
  refresh();
  search.focus();
}

search.addEventListener('input', refresh);
clear.addEventListener('click', reset);
document.querySelector('.reset-search').addEventListener('click', reset);
document.querySelector('.search-shortcut').addEventListener('click', () => search.focus());
form.addEventListener('submit', event => { event.preventDefault(); refresh(); });
document.addEventListener('keydown', event => {
  const editable = event.target.isContentEditable || event.target.closest('input, textarea');
  if (event.key === '/' && !editable && !event.ctrlKey && !event.metaKey && !event.altKey && !event.repeat) {
    event.preventDefault(); search.focus();
  }
  if (event.key === 'Escape' && form.contains(document.activeElement) && search.value) {
    event.preventDefault(); reset();
  }
});
document.querySelector('.skip-link').addEventListener('click', event => {
  event.preventDefault();
  const target = document.querySelector(event.currentTarget.getAttribute('href'));
  target.focus();
  target.scrollIntoView({ block: 'nearest' });
});
window.addEventListener('pageshow', refresh);
refresh();
form.hidden = false;
document.documentElement.dataset.ready = 'true';
