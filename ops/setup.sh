#!/usr/bin/env bash
# Workbench — https://wb.atonota.net/ (kök, public statik site). Kaynak: github.com/karacaismail/atonota-workbench
# Akış: main'e push → GitHub Actions "check" (test/build/QA) → sunucu timer'ı 2 dk içinde CI'dan geçen commit'i
#        Node 24 konteynerinde test + build eder → atomik olarak yayınlar. Başarısız build yayınlanmaz.
# Önkoşul: Docker, host Caddy (tls_dns/common snippet'leri), UFW. Diğer projelerden bağımsızdır.
# Kullanım (root):
#   git clone https://github.com/karacaismail/atonota-workbench.git /opt/wb-workbench/repo
#   bash /opt/wb-workbench/repo/ops/setup.sh        — tekrar çalıştırılabilir
set -euo pipefail
OPS="$(cd "$(dirname "$0")" && pwd)"
BASE="${WB_BASE:-/opt/wb-workbench}"; export WB_BASE="$BASE"
DIR="$BASE"
DOMAIN=wb.atonota.net
log()  { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m[!] %s\033[0m\n' "$*"; }
die()  { printf '\033[1;31m[x] %s\033[0m\n' "$*"; exit 1; }
setenv() { touch "$1"; grep -q "^$2=" "$1" && sed -i "s|^$2=.*|$2=$3|" "$1" || echo "$2=$3" >> "$1"; }

[ "$(id -u)" -eq 0 ] || die "root olarak çalıştır"
for c in docker caddy ufw git curl python3 flock; do command -v $c >/dev/null || die "$c yok"; done

log "1/5 Public erişim: PUBLIC_IP + UFW 443"
CENV=/etc/caddy/caddy.env
PUB=$(grep -s '^PUBLIC_IP=' "$CENV" | cut -d= -f2-)
[ -n "$PUB" ] || { PUB=$(curl -fsS -4 https://ifconfig.me); setenv "$CENV" PUBLIC_IP "$PUB"; chown root:caddy "$CENV"; chmod 640 "$CENV"; }
r=$(dig +short "$DOMAIN" A | tail -1); [ "$r" = "$PUB" ] || warn "$DOMAIN → '$r'; beklenen $PUB"
ufw allow 443/tcp comment 'public https' >/dev/null && echo "PUBLIC_IP=$PUB, UFW 443 açık"

log "2/5 İlk yayın (CI'dan geçen son commit; Node 24 imajı indirilir)"
bash "$OPS/update.sh" || true
[ -L "$DIR/current" ] || die "yayın oluşmadı — yukarıdaki çıktıya bakın (CI bitmemiş olabilir; birkaç dakika sonra tekrar çalıştırın)"
echo "Yayında: $(cat "$DIR/state/deployed" | cut -c1-12)"

log "3/5 Caddy: ortak site + kök (/) parçası"
install -d -m 755 "/etc/caddy/$DOMAIN.d"
SITE="/etc/caddy/sites/$DOMAIN.caddy"
if ! grep -qs 'WB-SHARED-SITE' "$SITE"; then
  [ -f "$SITE" ] && { cp "$SITE" "$SITE.bak.$(date +%s)"; warn "$SITE eski formatta; ortak dosya ile değiştirildi (yedek alındı)"; }
  sed "s|wb.atonota.net|$DOMAIN|g" "$OPS/caddy/wb.atonota.net.caddy" > "$SITE"; chmod 644 "$SITE"
fi
sed "s|__DIR__|$BASE|g" "$OPS/caddy/workbench.caddy.tmpl" > "/etc/caddy/$DOMAIN.d/workbench.caddy"
chmod 644 "/etc/caddy/$DOMAIN.d/workbench.caddy"
chmod o+x "$BASE" 2>/dev/null || true   # caddy kullanıcısı dosyalara ulaşabilsin
install -o caddy -g caddy -m 640 /dev/null "/var/log/caddy/$DOMAIN.log" 2>/dev/null || true
runuser -u caddy -- env HOME=/var/lib/caddy $(grep -v '^#' "$CENV" | xargs) \
  caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
chown -R caddy:caddy /var/log/caddy
systemctl restart caddy

log "4/5 Otomatik yayın zamanlayıcısı (2 dk)"
for u in service timer; do sed -e "s|__OPS__|$OPS|g" -e "s|__BASE__|$BASE|g" "$OPS/systemd/wb-workbench-update.$u" > "/etc/systemd/system/wb-workbench-update.$u"; done
systemctl daemon-reload && systemctl enable --now wb-workbench-update.timer >/dev/null
systemctl list-timers wb-workbench-update.timer --no-pager | head -2

log "5/5 Doğrulama"
code() { curl -s -o /dev/null -w '%{http_code}' --resolve "$DOMAIN:443:$PUB" "$@"; }
[ "$(code "https://$DOMAIN/")" = 200 ] && echo "OK  https://$DOMAIN/ → 200" || warn "https://$DOMAIN/ 200 değil"
curl -s --resolve "$DOMAIN:443:$PUB" "https://$DOMAIN/" | grep -q 'wb.atonota.net/pp' && echo "OK  Workbench içeriği yayında" || warn "içerik Workbench değil"
for p in /sbrc/ /pp/; do echo "    $p → $(code "https://$DOMAIN$p") (diğer projeler etkilenmemeli: /sbrc 401, /pp 200)"; done

cat <<MSG

Workbench: https://$DOMAIN/
Yayındaki sürüm:   cat $DIR/state/deployed
Güncelleme kaydı:  journalctl -u wb-workbench-update --since today
Hemen güncelle:    systemctl start wb-workbench-update.service
Geri al/sabitle:   echo <commit-sha> > $DIR/state/pin && systemctl start wb-workbench-update.service
MSG
