export function normalizeSearch(value) {
  return value.trim().normalize('NFKD').replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('en-US').replace(/ı/g, 'i');
}

export function filterApps(apps, query) {
  const terms = normalizeSearch(query).split(/\s+/u).filter(Boolean);
  return apps.filter(app => {
    const index = normalizeSearch([app.name, app.description, app.url, ...app.aliases].join(' '));
    return terms.every(term => index.includes(term));
  });
}

export function validateCatalog(apps) {
  const errors = [];
  const ids = new Set();
  for (const app of apps) {
    if (!/^[a-z][a-z0-9-]*$/u.test(app.id) || ids.has(app.id)) errors.push(`Invalid or duplicate id: ${app.id}`);
    ids.add(app.id);
    if (!app.name?.trim() || !app.description?.trim() || !Array.isArray(app.aliases) || app.aliases.some(alias => typeof alias !== 'string')) errors.push(`Invalid metadata: ${app.id}`);
    try {
      const url = new URL(app.url);
      if (url.protocol !== 'https:' || !['wb.atonota.net', 'pen.atonota.net'].includes(url.hostname) || url.username || url.password || url.port || url.search || url.hash) errors.push(`Unsafe target: ${app.id}`);
    } catch { errors.push(`Invalid URL: ${app.id}`); }
  }
  return errors;
}
