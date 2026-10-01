import { catalog, groups } from './catalog.mjs';

const groupIDs = new Set(groups.map(group => group.id));
const groupSearch = Object.fromEntries(groups.map(group => [group.id, [group.id, group.name, ...group.aliases].join(' ')]));

export function normalizeSearch(value) {
  return (typeof value === 'string' ? value : '').trim().normalize('NFKD').replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('en-US').replace(/ı/g, 'i');
}

export function filterApps(apps, query, segment = 'all') {
  const selected = groupIDs.has(segment) ? segment : 'all';
  const terms = normalizeSearch(query).split(/\s+/u).filter(Boolean);
  return apps.filter(app => {
    const index = normalizeSearch([app.name, app.description, app.url, groupSearch[app.group], ...app.aliases].join(' '));
    return (selected === 'all' || app.group === selected) && terms.every(term => index.includes(term));
  });
}

export function normalizeState(raw, apps = catalog) {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  return {
    q: typeof source.q === 'string' ? source.q.slice(0, 160) : '',
    seg: groupIDs.has(source.seg) ? source.seg : 'all',
    last: typeof source.last === 'string' && apps.some(app => app.id === source.last) ? source.last : '',
    y: typeof source.y === 'number' && Number.isFinite(source.y) && source.y >= 0 && source.y <= Number.MAX_SAFE_INTEGER ? source.y : 0,
  };
}

export const normalizeTheme = value => value === 'light' || value === 'dark' ? value : null;

export function validateCatalog(apps) {
  const errors = [];
  const ids = new Set();
  if (!Array.isArray(apps)) return ['Invalid catalog'];
  for (const app of apps) {
    if (!app || typeof app !== 'object') { errors.push('Invalid catalog entry'); continue; }
    if (typeof app.id !== 'string' || !/^[a-z][a-z0-9-]*$/u.test(app.id) || ids.has(app.id)) errors.push(`Invalid or duplicate id: ${app.id}`);
    ids.add(app.id);
    if (typeof app.name !== 'string' || !app.name.trim() || typeof app.description !== 'string' || !app.description.trim()
      || !Array.isArray(app.aliases) || app.aliases.some(alias => typeof alias !== 'string') || !groupIDs.has(app.group)) errors.push(`Invalid metadata: ${app.id}`);
    try {
      const url = new URL(app.url);
      if (url.protocol !== 'https:' || !['wb.atonota.net', 'pen.atonota.net'].includes(url.hostname) || url.username || url.password || url.port || url.search || url.hash) errors.push(`Unsafe target: ${app.id}`);
    } catch { errors.push(`Invalid URL: ${app.id}`); }
  }
  return errors;
}
