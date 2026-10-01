import { icon } from './icons.mjs';
import { validateCatalog } from './model.mjs';

export function escapeHTML(value) {
  return String(value).replace(/[&<>"']/gu, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

export function renderPage(apps) {
  const errors = validateCatalog(apps);
  if (errors.length) throw new Error(errors.join('\n'));
  const tiles = apps.map(app => `<li class="app-item" data-app-id="${escapeHTML(app.id)}">
    <a class="app-link" id="app-${escapeHTML(app.id)}" href="${escapeHTML(app.url)}" target="_blank" rel="noopener noreferrer">
      <span class="app-icon" data-icon="${escapeHTML(app.id)}">${icon(app.id)}</span>
      <span class="app-name">${escapeHTML(app.name)}</span>
      <span class="app-description">${escapeHTML(app.description)}</span>
      <span class="visually-hidden"> (yeni sekmede açılır)</span>
    </a>
  </li>`).join('\n');
  return `<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="description" content="Atonota Workbench: tasarım ve geliştirme uygulamalarına tek çalışma alanından ulaş.">
  <meta name="theme-color" content="#ffffff">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'none'; base-uri 'none'; form-action 'none'">
  <title>Workbench · Atonota</title>
  <link rel="icon" type="image/svg+xml" href="./favicon.svg">
  <link rel="stylesheet" href="./styles.css">
  <script type="module" src="./app.mjs"></script>
</head>
<body>
  <a class="skip-link" href="#app-pen">Uygulamalara geç</a>
  <header class="site-header">
    <div class="brand">
      <span class="brand-mark">${icon('brand')}</span>
      <span class="brand-copy"><span class="brand-name">Atonota</span><span class="brand-subtitle">Workbench</span></span>
    </div>
    <form class="search-form" role="search" hidden>
      <label class="visually-hidden" for="app-search">Uygulama ara</label>
      <div class="search-shell">
        <span class="search-icon">${icon('search')}</span>
        <input id="app-search" name="q" type="search" placeholder="Uygulama ara" autocomplete="off" spellcheck="false" maxlength="160" aria-controls="app-grid" aria-describedby="search-help">
        <button class="clear-search" id="clear-search" type="button" aria-label="Aramayı temizle" hidden>${icon('close')}</button>
        <button class="search-shortcut" type="button" aria-label="Aramaya odaklan, bölü işareti kısayolu"><span aria-hidden="true">/</span></button>
      </div>
      <span id="search-help" class="visually-hidden">Ad, kullanım amacı veya adresle filtrele. Escape aramayı temizler.</span>
    </form>
    <div class="identity"><span class="identity-name">İsmail Karaca</span><span class="identity-avatar" aria-hidden="true">İK</span></div>
  </header>
  <main class="workspace" aria-labelledby="apps-heading">
    <div class="workspace-heading">
      <div><h1 id="apps-heading">Uygulamaların</h1><p class="workspace-caption">Bir çalışma alanı. Tüm araçların.</p></div>
      <p class="result-count" id="result-count" role="status" aria-live="polite" aria-atomic="true">${apps.length} uygulama</p>
    </div>
    <ul class="app-grid" id="app-grid" aria-label="Uygulamalar">${tiles}</ul>
    <div class="empty-state" hidden><h2>Uygulama bulunamadı</h2><p>Başka bir ad, kullanım amacı veya adres dene.</p><button class="reset-search" type="button">Tüm uygulamaları göster</button></div>
    <noscript><p class="access-note">Arama için JavaScript gerekir. Uygulama bağlantılarını doğrudan açabilirsin.</p></noscript>
    <div class="workspace-footer">
      <p class="access-note">Bağlantılar yeni sekmede açılır. Uygulamalara erişim için servis kurulumu, giriş veya Tailscale gerekebilir.</p>
      <a class="roadmap-link" href="https://karacaismail.github.io/atonota-action-plan/" target="_blank" rel="noopener noreferrer">Yol haritası ${icon('external')}<span class="visually-hidden"> (yeni sekmede açılır)</span></a>
    </div>
  </main>
  <footer class="site-footer"><span>Atonota Workbench</span><a href="https://github.com/karacaismail/atonota-workbench" target="_blank" rel="noopener noreferrer">Kaynak kod ${icon('external')}<span class="visually-hidden"> (yeni sekmede açılır)</span></a></footer>
</body>
</html>`;
}
