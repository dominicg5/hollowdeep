#!/bin/sh
# Builds the single-file game from src/
cd "$(dirname "$0")"
{ cat src/head.html; echo '<script>'; cat src/game.js src/ui.js src/map_gen.js src/map_draw.js src/map_life.js src/map_ui.js; echo '</script>'; echo '</body></html>'; } > index.html
