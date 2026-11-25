#!/bin/sh
# Builds the single-file game from src/
cd "$(dirname "$0")"
SRC="src/game.js src/skills.js src/combat.js src/ui.js src/icons.js src/craft.js src/skilltree.js src/combatstats.js src/art_manifest.js src/map_gen.js src/map_draw.js src/map_art.js src/map_life.js src/map_houses.js src/map_grand.js src/tether_mill.js src/tether_mill_ui.js src/volcanic_forge.js src/npc_kit.js src/town.js src/map3d.js src/map_ui.js src/creatures/data.js src/creatures/creatures.js src/crystalCrown.js src/char3d.js src/explore.js src/explore_map.js src/pet_mole.js src/mosby.js src/mosby_talk.js src/theus.js src/theus_audio.js src/mosby_ride.js src/mosby_veins.js src/tether_tap.js src/home_move.js"
# syntax-check every source first (a broken file would ship a blank game)
if command -v node >/dev/null 2>&1; then for f in $SRC; do cp "$f" /tmp/.hd_chk.js; node --check /tmp/.hd_chk.js 2>/dev/null || { echo "build.sh: syntax error in $f" >&2; node --check /tmp/.hd_chk.js 2>&1 | head -4 >&2; exit 1; }; done; fi
# build stamp: a hash of the sources (stable across rebuilds of the same code), shown in the corner and used to bust stale caches
B=$(cat src/head.html src/version_gate.html $SRC | sha1sum | cut -c1-8)
printf '{"b":"%s"}\n' "$B" > version.json
{ cat src/head.html
  sed "s/__B__/$B/" src/version_gate.html
  echo "<div id=\"hdBuild\" style=\"position:fixed;left:4px;bottom:2px;font:10px system-ui,sans-serif;color:rgba(255,255,255,.45);pointer-events:none;z-index:99999\">build $B</div>"
  echo "<script src=\"assets/vendor/three.min.js?v=$B\"></script>"; echo '<script>'; cat $SRC; echo '</script>'; echo '</body></html>'; } > index.html
