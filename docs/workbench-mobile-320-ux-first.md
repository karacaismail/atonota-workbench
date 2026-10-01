# Workbench: 320 px UX-first görev tanımı

İsmail Karaca, mevcut statik Workbench başlatıcısında şu yolculuğu önce 320 CSS px'de tamamla: **Workbench'i aç → uygulamayı ikon/ad veya yerel aramayla bul → tek dokunuşla yeni sekmede aç → Workbench'e dön ve bağlamını koru.**

Güncel görsel kaynak kullanıcının `workbench.zip` dosyasıdır. Josefin Sans, açık/koyu neumorphic yüzey, üst marka/tema, iki numaralı grup ve alttaki grup/arama alanını birebir koru; yalnız kanıtlanmış UX hatalarını düzelt.

## Kapsam ve sorumluluk

- İsmail Karaca geliştirme, ürün kararı ve kabul sahibidir. Codex ve Claude Code aynı görevi yürütmek için araçlardır; ayrı ürün sahipleri değildir.
- Hüseyin Cengiz üretim ortamı, deploy, güvenlik ve rollback sahibidir. Asistan Hüseyin, sonraki onaylı DNS işinde Cengiz'in teknik föyünü uygular; Cengiz doğrular.
- Bu görev vanilla ES modules, semantik HTML/CSS ve GitHub Pages çıktısını kapsar. Hetzner kurulumu, DNS/CNAME, servislerin kurulması, login, AI/backend API veya MCP geliştirmesi kapsam dışıdır.
- Yedi uygulama ve hedef adres için tek kaynak [catalog.mjs](../catalog.mjs) olsun. Pen ayrı `pen.atonota.net` hostundadır; kalan altı hedef `wb.atonota.net/*` üzerindedir. Bağlantı göstermek servis erişilebilirliği iddiası değildir.

## Uygulama sırası

1. Mevcut 320 px ekranı, hesaplanan stilleri ve kritik yolculuğu incele; kusuru, beklenen davranışı ve ekran görüntüsünü kaydet. Yeni davranış/hata için anlamlı regresyon testini önce başarısız çalıştır; sonra düzelt.
2. 320 px kabulünü tamamla; ardından 360 → 375 → 390 → yatay telefon/kısa yükseklik → tablet → masaüstü sırasını izle. Değişen içerik eşiklerini N−1/N/N+1 ile kontrol et.
3. Mevcut ortak shell ve `styles.css` semantik tokenlarını kullan. İkon, etkileşim alanı, padding, gutter ve gap ayrı tokenlarla yönetilsin; yeni framework veya cihaz başına paket ekleme.

## Kabul ölçütleri

- 320 px'de sayfa yatay taşmasın; iki yanda en az 12 CSS px gutter kalsın. Uygulamalar iki sütunda, büyük temsilî SVG ikon ve altında sürekli görünür adla sunulsun. SVG'leri resmî marka logosu olarak tanımlama; kart/kenarlık kalabalığı oluşturma.
- Gerçek etkileşim alanı fine girişte en az 44×44, coarse girişte 48×48 CSS px olsun. Mevcut ortak token 48 px'dir; küçültme. Hover, uygulamayı bulmanın veya açmanın tek yolu olmasın.
- Yedi hedefin tamamı JS kapalıyken gerçek anchor olarak açılsın. `target="_blank"` ve `rel="noopener noreferrer"` kullan; tek dokunuş tek sekme açsın, opener bulunmasın. Dönüşte sorgu, filtrelenmiş liste, kaydırma ve uygun odak bağlamı korunsun.
- Arama ad/açıklama/grup/takma ad/adresi yerelde filtrelesin; AI çağrısı yapmasın. Sıfır sonuç ve temizleme açık olsun; normal temizleme seçili grubu korusun, boş durumdaki reset tüm grupları açsın ve sorgu alanına odak dönsün. `/` kısayolu input/textarea/contenteditable veya IME girdisini yakalamasın. Enter ilk görünür sonuca geçsin. Native klavye gezinmesini hedef tarayıcının tam-kontrol gezinme ayarıyla doğrula.
- Yön değişiminde sorgu ve odak kaybolmasın; yazılım klavyesi açıkken ana eylemler erişilebilir kalsın. Genişlikten giriş türü veya cihaz kimliği türetme.
- Odaklanan kontrolde zemine karşı en az 3:1 kontrastlı tek `:focus-visible` göstergesi bulunsun; kapsayıcı çerçevesi veya üst üste ring/shadow üretme. Zoom ve reduced-motion akışı korunmalı.
- ZIP'in iki yerel font alt kümesini ve SIL OFL telif/lisansını koru; fontlar hazır olduktan sonra boyutu ölç. CDN, dış font, analytics veya API isteği ekleme. Soğuk önbellekli üretim ilk rotasında decoded toplam ≤100 KiB, bunun içindeki JS ≤15 KiB olsun. Cache boş, service worker kapalı ölçümde hazır olma ve arama/temizleme penceresini kaydet; transfer baytlarını decoded boyuttan ayrı raporla. Kullanıcının hedef açması dışında dış origin isteği sıfır olsun.

## Doğrulama ve teslim

Proje kökünde `npm run check`, `npm test`, `npm run build`, `npm run qa` çalıştır. Chromium, Firefox ve WebKit'te genişlik sırasını; fare, dokunma, klavye, no-JS, odak, arama ve sekmeden dönüşü doğrula. Sonuçları `pass/fail/not_run/not_applicable`, tarayıcı/OS/sürüm, viewport/giriş ve screenshot/trace/ağ kanıtıyla kaydet.

Bağımsız salt-okunur QA, uygulayıcının kanıtlarını incelesin. Screenshotlar adaydır; uygulayıcı kendi baseline değişikliğinin tek onaylayıcısı olmasın. Gerçek macOS/iOS Safari, Android ve yazılım klavyesi çalıştırılmadıysa `not_run` ve bilinmeyen olarak kaydet; emülasyonu fiziksel cihaz veya WCAG sertifikası sayma. Kanıtlara secret, özel IP, kullanıcı/parola veya kişisel veri koyma.
