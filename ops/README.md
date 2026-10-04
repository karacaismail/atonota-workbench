# ops — https://wb.atonota.net/ sunucu yayını (Hetzner)

Bu klasör Workbench'in **Hetzner sunucusundaki** yayınını tanımlar (İsmail Karaca onayıyla repoya eklendi;
sahibi Hüseyin Cengiz — server/deploy). Uygulama kodu, build ve GitHub Pages yayını bu klasörden etkilenmez;
`scripts/check.mjs` ve Pages workflow'u bu klasöre bakmaz.

```
İsmail: git push main → GitHub Actions "check" (unit + build + Chromium/Firefox/WebKit QA)
Sunucu: wb-workbench-update.timer (2 dk) → check job'ı success olan son commit
        → node:24-alpine konteynerinde unit test + build → /opt/wb-workbench/releases/<sha> → current (atomik symlink)
Caddy:  wb.atonota.net kökü → current/   (public, statik)
```
- CI'dan geçmeyen commit yayınlanmaz; sunucudaki test/build başarısızsa mevcut sürüm kalır (`/opt/wb-workbench/state/failed`).
- Sunucu GitHub'a sadece dışarı doğru bağlanır (public repo + public API); secret/webhook yok.
- Son 3 sürüm saklanır.

## Alan adı paylaşımı
`wb.atonota.net` ortak site dosyası (`caddy/wb.atonota.net.caddy`, projeler arasında aynı) yoksa yazılır.
Bu proje `/etc/caddy/wb.atonota.net.d/workbench.caddy` ile **kök yolu** (`/*`) alır; `/sbrc`, `/pp` gibi daha
spesifik yollar diğer projelerde kalır. HTML `no-cache`, sürümlü dosyalar 7 gün önbellek.

## Kurulum (sunucuda, root)
```bash
git clone https://github.com/karacaismail/atonota-workbench.git /opt/wb-workbench/repo
bash /opt/wb-workbench/repo/ops/setup.sh
```

## İşletim
| İş | Komut |
|---|---|
| Yayındaki sürüm | `cat /opt/wb-workbench/state/deployed` |
| Güncelleme kaydı | `journalctl -u wb-workbench-update --since today` |
| Hemen güncelle | `systemctl start wb-workbench-update.service` |
| Geri al / sabitle | `echo <sha> > /opt/wb-workbench/state/pin` → hemen güncelle |
| Sabitlemeyi kaldır | `rm /opt/wb-workbench/state/pin` |
| Başarısız sürümü yeniden dene | `rm /opt/wb-workbench/state/failed` → hemen güncelle |

## Notlar
- Workbench kataloğundaki `/b3d`, `/od`, `/ad` hedefleri bu sunucuda henüz yayında değil (Blender `b3d.atonota.net`'tedir).
