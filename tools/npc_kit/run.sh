#!/bin/sh
# bake the given keepers (default: all five) and pack assets/models/npc_kit.glb
cd "$(dirname "$0")"; PY=${NPCKIT_PY:-/workspace/npckit_tools/venv/bin/python}
IDS=${*:-"goldie brannick tess hattie fennick"}
HO=${HANDOFF:-/workspace/mia/handoff/npc}
for k in $IDS; do
  # Art's look kit (handoff/npc/<k>/<k>_preview.glb + <k>_atlas_1024.png) is copied into art/ when it is newer, then baked with bake_art.py
  if [ -f "$HO/$k/${k}_preview.glb" ] && [ -f "$HO/$k/${k}_atlas_1024.png" ] && true; then mkdir -p art; cp -u "$HO/$k/${k}_preview.glb" "$HO/$k/${k}_atlas_1024.png" art/; fi   # each file is copied when it is newer (an atlas-only re-fit lands too)
  B=bake.py; [ -f art/${k}_preview.glb ] && B=bake_art.py; $PY $B $k 2>&1 | grep -E "^TRIS|^EXPORT|Error|Traceback|line [0-9]" || exit 1
  $PY -c "from PIL import Image; Image.open('out/$k''_atlas.png').save('out/$k''_atlas.webp', quality=88, method=6)"; done
ALL=""; for k in goldie brannick tess hattie fennick; do [ -f out/$k/meta.json ] && ALL="$ALL $k"; done
node pack.mjs "${UAL:-/workspace/npckit_src/ual/Universal Animation Library[Standard]/Unreal-Godot/UAL1_Standard.glb}" ../../assets/models/npc_kit.glb $ALL
