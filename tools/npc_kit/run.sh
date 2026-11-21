#!/bin/sh
# bake the given keepers (default: all five) and pack assets/models/npc_kit.glb
cd "$(dirname "$0")"; PY=${NPCKIT_PY:-/workspace/npckit_tools/venv/bin/python}
IDS=${*:-"goldie brannick tess hattie fennick"}
for k in $IDS; do $PY bake.py $k 2>&1 | grep -E "^TRIS|^EXPORT|Error|Traceback|line [0-9]" || exit 1
  $PY -c "from PIL import Image; Image.open('out/$k''_atlas.png').save('out/$k''_atlas.webp', quality=88, method=6)"; done
ALL=""; for k in goldie brannick tess hattie fennick; do [ -f out/$k/meta.json ] && ALL="$ALL $k"; done
node pack.mjs "${UAL:-/workspace/npckit_src/ual/Universal Animation Library[Standard]/Unreal-Godot/UAL1_Standard.glb}" ../../assets/models/npc_kit.glb $ALL
