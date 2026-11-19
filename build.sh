#!/bin/sh
# Builds the single-file game from src/
cd "$(dirname "$0")"
SRC="src/game.js src/ui.js src/craft.js src/art_manifest.js src/map_gen.js src/map_draw.js src/map_art.js src/map_life.js src/map_houses.js src/map_grand.js src/map3d.js src/map_ui.js src/char3d.js src/explore.js src/explore_map.js src/pet_mole.js"
# syntax-check every source first (a broken file would ship a blank game)
if command -v node >/dev/null 2>&1; then for f in $SRC; do cp "$f" /tmp/.hd_chk.js; node --check /tmp/.hd_chk.js 2>/dev/null || { echo "build.sh: syntax error in $f" >&2; node --check /tmp/.hd_chk.js 2>&1 | head -4 >&2; exit 1; }; done; fi
# build stamp: a hash of the sources (stable across rebuilds of the same code), shown in the corner and used to bust stale caches
B=$(cat src/head.html $SRC | sha1sum | cut -c1-8)
{ cat src/head.html
  echo "<script>window.HD_BUILD='$B';(function(){try{var u=location.href.split('#')[0].split('?')[0];fetch(u+'?bust='+Date.now(),{cache:'no-store'}).then(function(r){return r.text()}).then(function(t){var m=t.match(/HD_BUILD='([0-9a-f]{8})'/);if(m&&m[1]!==window.HD_BUILD&&sessionStorage.getItem('hdReload')!==m[1]){sessionStorage.setItem('hdReload',m[1]);location.replace(u+'?v='+m[1]+location.hash);}}).catch(function(){});}catch(e){}})();</script>"
  echo "<div id=\"hdBuild\" style=\"position:fixed;left:4px;bottom:2px;font:10px system-ui,sans-serif;color:rgba(255,255,255,.45);pointer-events:none;z-index:99999\">build $B</div>"
  echo "<script src=\"assets/vendor/three.min.js?v=$B\"></script>"; echo '<script>'; cat $SRC; echo '</script>'; echo '</body></html>'; } > index.html
