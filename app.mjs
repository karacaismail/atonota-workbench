// Local launcher preferences only. No service, account or availability requests.
import { catalog, groups } from './catalog.mjs';
import { filterApps, normalizeState, normalizeTheme } from './model.mjs';

const key = 'wb:state';
const root = document.documentElement;
const search = document.querySelector('#q');
const clear = document.querySelector('#clear');
const empty = document.querySelector('#empty');
const live = document.querySelector('#live');
const theme = document.querySelector('#theme');
const tabs = [...document.querySelectorAll('.tab[data-seg]')];
const skip = document.querySelector('.skip-link');
const divider = document.querySelector('[data-divider]');
const items = catalog.map(app => ({ app, element: document.querySelector(`.tile[data-id="${app.id}"]`) }));

function readState() {
  try { return normalizeState(JSON.parse(sessionStorage.getItem(key)), catalog); }
  catch { return normalizeState(null, catalog); }
}
let state = readState();
function save() {
  try { sessionStorage.setItem(key, JSON.stringify(state)); }
  catch { /* Nonessential preferences; the launcher remains usable without storage. */ }
}
const firstVisible = () => items.find(item => item.element && !item.element.closest('[hidden]'))?.element;

function revealFocusedTile(tile, force = false) {
  if (!root.classList.contains('js') || !tile?.matches('.tile') || (!force && !tile.matches(':focus-visible'))) return;
  const top = document.querySelector('.bar--top').getBoundingClientRect().bottom;
  const bottom = document.querySelector('.bar--bottom').getBoundingClientRect().top;
  const bounds = tile.getBoundingClientRect();
  // In short landscape windows the label, rather than an impossible full tile, must fit.
  const target = bounds.height <= bottom - top ? bounds : tile.querySelector('.name').getBoundingClientRect();
  const delta = target.top < top ? target.top - top : target.bottom > bottom ? target.bottom - bottom : 0;
  if (delta) window.scrollBy(0, Math.sign(delta) * Math.ceil(Math.abs(delta)));
}
document.addEventListener('focusin', event => {
  const tile = event.target;
  requestAnimationFrame(() => {
    if (document.activeElement === tile) revealFocusedTile(tile);
  });
});
window.addEventListener('resize', () => {
  requestAnimationFrame(() => revealFocusedTile(document.activeElement));
});

function refresh() {
  const matching = filterApps(catalog, state.q);
  const visible = new Set(filterApps(catalog, state.q, state.seg).map(app => app.id));
  for (const item of items) if (item.element) item.element.hidden = !visible.has(item.app.id);
  for (const group of groups) {
    const count = matching.filter(app => app.group === group.id && visible.has(app.id)).length;
    document.querySelector(`.group[data-group="${group.id}"]`).hidden = count === 0;
    document.querySelector(`[data-count="${group.id}"]`).textContent = count;
  }
  if (divider) divider.hidden = !groups.every(group => matching.some(app => app.group === group.id && visible.has(app.id)));
  for (const tab of tabs) {
    tab.setAttribute('aria-pressed', String(tab.dataset.seg === state.seg));
    const count = tab.dataset.seg === 'all' ? matching.length : matching.filter(app => app.group === tab.dataset.seg).length;
    tab.querySelector('[data-n]').textContent = count;
  }
  empty.hidden = visible.size !== 0;
  clear.hidden = state.q.length === 0;
  live.textContent = visible.size ? `${visible.size} uygulama` : 'Eşleşen uygulama yok';
  if (skip) skip.href = firstVisible() ? `#${firstVisible().id}` : '#q';
  save();
}
function set(patch) {
  state = normalizeState({ ...state, ...patch }, catalog);
  search.value = state.q;
  refresh();
}
function clearQuery(resetGroup = false) {
  set(resetGroup ? { q: '', seg: 'all' } : { q: '' });
  search.focus();
}

search.addEventListener('input', () => set({ q: search.value }));
search.addEventListener('keydown', event => {
  if (event.isComposing) return;
  if (event.key === 'Escape') {
    if (search.value) { event.preventDefault(); clearQuery(); }
    else search.blur();
  } else if (event.key === 'Enter') {
    event.preventDefault();
    firstVisible()?.focus();
  }
});
clear.addEventListener('click', () => clearQuery());
document.querySelector('#empty-clear').addEventListener('click', () => clearQuery(true));
for (const tab of tabs) tab.addEventListener('click', () => set({ seg: tab.dataset.seg }));
document.addEventListener('keydown', event => {
  if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey || event.repeat || event.isComposing) return;
  const target = event.target;
  if (!(target instanceof Element) || target.isContentEditable || target.closest('input, textarea, select')) return;
  event.preventDefault();
  search.focus();
});
skip?.addEventListener('click', event => {
  event.preventDefault();
  const target = firstVisible() ?? search;
  target.focus();
  revealFocusedTile(target, true);
});
for (const item of items) item.element?.addEventListener('click', () => {
  state = normalizeState({ ...state, last: item.app.id, y: window.scrollY }, catalog);
  save();
});

const scheme = matchMedia('(prefers-color-scheme: dark)');
const isDark = () => normalizeTheme(root.dataset.theme) ? root.dataset.theme === 'dark' : scheme.matches;
function syncThemeLabel() {
  theme.setAttribute('aria-label', isDark() ? 'Açık temaya geç' : 'Koyu temaya geç');
  for (const meta of document.querySelectorAll('meta[name="theme-color"]')) meta.setAttribute('content', isDark() ? '#1F2227' : '#E8EBF0');
}
theme.addEventListener('click', () => {
  root.dataset.theme = isDark() ? 'light' : 'dark';
  try { localStorage.setItem('wb:theme', root.dataset.theme); }
  catch { /* The selected theme still applies during this visit. */ }
  syncThemeLabel();
});
scheme.addEventListener('change', syncThemeLabel);
window.addEventListener('storage', event => {
  if (event.key !== 'wb:theme') return;
  const selected = normalizeTheme(event.newValue);
  if (selected) root.dataset.theme = selected;
  else delete root.dataset.theme;
  syncThemeLabel();
});

function restore() {
  state = readState();
  search.value = state.q;
  refresh();
  window.scrollTo(0, state.y);
  const last = items.find(item => item.app.id === state.last)?.element;
  if (last && !last.closest('[hidden]') && document.activeElement === document.body) last.focus({ preventScroll: true });
}
window.addEventListener('pageshow', event => { if (event.persisted) restore(); });
window.addEventListener('pagehide', () => {
  state = normalizeState({ ...state, y: window.scrollY }, catalog);
  save();
});

syncThemeLabel();
restore();
theme.hidden = false;
root.classList.replace('no-js', 'js');
revealFocusedTile(document.activeElement);
root.dataset.ready = 'true';
