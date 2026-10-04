#!/usr/bin/env bash
# atonota-workbench'in main dalındaki son commit'ini, CI'ı ("check" job'ı) başarılıysa build edip yayınlar.
# wb-workbench-update.timer 2 dakikada bir çalıştırır. Elle çalıştırmak güvenlidir.
#   Sabitleme / geri alma: commit SHA'yı $BASE/state/pin dosyasına yaz. Silince main'i takip eder.
# Çalışma dosyaları repo dışında: $BASE (varsayılan /opt/wb-workbench) → src/ (build kopyası), releases/, current, state/
set -euo pipefail
BASE="${WB_BASE:-/opt/wb-workbench}"
DIR="$BASE"
REPO_URL=https://github.com/karacaismail/atonota-workbench.git
API=https://api.github.com/repos/karacaismail/atonota-workbench
NODE_IMAGE=node:24-alpine
SRC="$BASE/src"; REL="$BASE/releases"; mkdir -p "$BASE/state" "$REL"
exec 9>"$DIR/state/lock"; flock -n 9 || { echo "başka bir güncelleme çalışıyor"; exit 0; }

[ -d "$SRC/.git" ] || git clone --quiet "$REPO_URL" "$SRC"
git -C "$SRC" fetch --quiet origin main
if [ -s "$DIR/state/pin" ]; then SHA=$(cat "$DIR/state/pin"); else SHA=$(git -C "$SRC" rev-parse origin/main); fi
CUR=$(cat "$DIR/state/deployed" 2>/dev/null || true)
[ "$SHA" = "$CUR" ] && exit 0
[ "$SHA" = "$(cat "$DIR/state/failed" 2>/dev/null || true)" ] && exit 0

# CI kapısı: "check" job'ı bu commit için success olmalı (pin'li sürümde atlanır)
if [ ! -s "$DIR/state/pin" ]; then
  C=$(curl -fsS -H 'Accept: application/vnd.github+json' "$API/commits/$SHA/check-runs?check_name=check" \
      | python3 -c "import json,sys;r=json.load(sys.stdin)['check_runs'];print(r[0]['status']+':'+str(r[0]['conclusion']) if r else 'none')") || { echo "GitHub API'ye ulaşılamadı, sonra denenecek"; exit 0; }
  case "$C" in
    completed:success) ;;
    completed:*) echo "${SHA:0:12} CI başarısız ($C), yayınlanmıyor"; echo "$SHA" > "$DIR/state/failed"; exit 0;;
    *) echo "${SHA:0:12} CI henüz bitmedi ($C)"; exit 0;;
  esac
fi

echo "build: ${SHA:0:12}"
git -C "$SRC" checkout --quiet --detach "$SHA"
OUT="$REL/$SHA"; rm -rf "$OUT"
if docker run --rm -v "$SRC:/src:ro" -v "$REL:/out" -u "$(id -u):$(id -g)" "$NODE_IMAGE" \
     sh -c "cp -r /src /tmp/w && cd /tmp/w && node --test tests/*.test.mjs >/dev/null && node scripts/build.mjs && cp -r site /out/$SHA"; then
  chmod -R a+rX "$OUT"
  ln -sfn "$OUT" "$DIR/current.new" && mv -T "$DIR/current.new" "$DIR/current"
  echo "$SHA" > "$DIR/state/deployed"; rm -f "$DIR/state/failed"
  ls -1dt "$REL"/*/ | tail -n +4 | xargs -r rm -rf   # son 3 sürümü tut
  echo "yayınlandı: ${SHA:0:12}"
else
  echo "${SHA:0:12} build/test başarısız, mevcut sürüm (${CUR:0:12}) korunuyor"; echo "$SHA" > "$DIR/state/failed"; exit 1
fi
