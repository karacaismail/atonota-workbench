# Atonota Workbench

İkonlu, aramalı, mobil öncelikli statik uygulama başlatıcısı. Uygulamalar yeni sekmede açılır. Güncel tasarım, kullanıcının 1 Ekim 2026 tarihli workbench.zip dosyasından birebir aktarılmıştır: Josefin Sans, açık/koyu neumorphic yüzeyler, iki uygulama grubu, bileşen hattı ve alttaki arama/filtre alanı. SVG ikonlar dosyadan alınan temsilî şekillerdir; resmî marka logosu değildir.

Gösterim: [GitHub Pages](https://karacaismail.github.io/atonota-workbench/). Üretim hedefi `wb.atonota.net`; bu repo DNS veya Hetzner kurulumu yapmaz. Başlatıcı çalışması bağlı servislerin kurulmuş/erişilebilir olduğunu göstermez.

Uygulama görevi: [Workbench — mobile320px, UX-first](docs/workbench-mobile-320-ux-first.md).

| Uygulama | Hedef | Kaynak politikası |
| --- | --- | --- |
| Pen | `https://pen.atonota.net/` | İsmail Karaca'nın public ürün reposu |
| Penpot | `https://wb.atonota.net/pp` | [penpot/penpot](https://github.com/penpot/penpot) |
| Open Design | `https://wb.atonota.net/od` | [nexu-io/open-design](https://github.com/nexu-io/open-design) |
| Affinity Designer | `https://wb.atonota.net/ad` | Workbench bağlantı kaydı; Linux web uygulaması varsayılmaz |
| Blender | `https://wb.atonota.net/b3d` | Blender upstream + İsmail'in gerekli public altyapı reposu |
| Storybook Beta | `https://wb.atonota.net/sbbeta` | Pen ile aynı bileşen kaynağının beta çıktısı |
| Storybook RC | `https://wb.atonota.net/sbrc` | Aynı kaynağın onaylanmış RC çıktısı |

Hazır uygulamalar varsa kendi repolarından alınır; özel geliştirmeler `karacaismail` public repolarındadır. Upstream lisansları/yazarlığı korunur. Bu yeni başlatıcının açık kaynak lisansı İsmail Karaca'nın seçimini bekler; public görünürlük lisans yerine geçmez.

## Geliştirme

Node24.19.0; manifest `>=24 <25`. Playwright1.63.0 kilitlidir. Container gerekmez. Mac'te ihtiyaç oluşursa Colima factory kullanılır; Docker Desktop kullanılmaz.

```sh
npm ci --ignore-scripts
npm run check
npm test
npm run build
npx --no-install playwright install chromium firefox webkit
npm run qa
```

`site/` yayın çıktısıdır. `catalog.mjs` uygulama/adres/grup/arama takma adları kaynağıdır; yeni uygulamayı burada ekle, testte beklenen hedefleri güncelle. `page-template.html` görsel yapıyı, `render.mjs` güvenli HTML üretimini, `styles.css` semantik tokenları içerir. Arama ad/amaç/grup/adresi yerel filtreler; API/AI çağrısı, analytics, dış font veya servis worker yoktur. Bütün bağlantılar JavaScript olmadan da çalışır.

ZIP'in genel yerleşimi değiştirilmedi. Somut düzeltmeler: soluk metin/placeholder kontrastı, tema kontrolünün kenarda kesilen odağı, bozuk kayıt verisi, düzenlenebilir alanda kısayol ve grup bağlamını koruyan temizleme. Inline tema/ikon stilleri güvenli self dosyalarına taşındı; görünüm korunuyor. İki yerel font dosyası ve üçüncü taraf SIL OFL lisansı `fonts/` altında değişmeden korunur; bu, başlatıcının henüz seçilmemiş proje lisansı değildir.

## Kabul ve yayın

CI main değişikliklerinde check/unit/build ve Chromium/Firefox/WebKit QA sonrasında yalnız `site/` artefaktını GitHub Pages'e yayınlar. PR sadece kontrolleri çalıştırır. Workflow commit üretmez; author/committer kişisel Git politikasına bağlıdır. Gerçek cihaz/ekran okuyucu sonuçları emülasyondan ayrı tutulur.

- Kritik yol: 320→360→375→390; yatay/kısa yükseklik, tablet/desktop; 600px grid eşiğinde 599/600/601; fare/dokunma/klavye; arama/grup/temizleme/boş sonuç/tema ve bozuk kayıt; yön değişiminde odak ve sorgu devamı.
- Kontroller44px, coarse48px; marka uyumlu tek kontrol odağı. Uygulama adları hover olmadan görünür. Sticky barlar klavye odağını örtemez; kısa yatay ekranda tüm tile sığmıyorsa uygulama adı görünür tutulur.
- İlk rota cold-context decoded toplam<=100KiB, JS<=15KiB; dış origin isteği0 (uygulama açma hariç). Ağ girişimleri, decoded/transfer ölçümleri `qa-results/results.json` içinde kaydedilir.
- Screenshotlar aynı sabit ortamdaki aday görsel kanıtlardır. WebKit'te Playwright1.63.0'ın inline screenshot stili için sürüm korumalı, geçici test-only private API uyarlaması kullanılır; uygulama CSP'si ve filtresiz güvenlik hata kontrolü değişmez. Sürüm değişirse uyarlama yeniden doğrulanmadan test durur. Otomatik tarayıcı kontrolü gerçek iOS/Android/macOS Safari veya ekran okuyucu sertifikası değildir.
- Geri alma: son başarılı sürümün kaynak commitini doğrula; `git revert` ile hatalı değişikliği geri al, aynı kontrol/yayın hattını yeniden çalıştır. Guard/hook atlanmaz; CI başarısızsa deploy edilmez.

İsmail Karaca geliştirme/kabulü; Hüseyin Cengiz üretim server/deploy/güvenliği; Asistan Hüseyin Cengiz'in verdiği GoDaddy/DNS kaydını uygular. Pages yayını özel domain veya hizmet erişim kurallarını değiştirmez.
