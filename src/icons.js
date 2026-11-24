/* Art's inventory icon atlas (128 px cells). Generated — do not hand-edit the map. */
const ICONS = {
  src: 'assets/ui/icons/items.webp',
  cell: 128,
  cols: 9,
  rows: 8,
  map: {
    'currency:gold':0,
    'ingot:bronze':1,
    'ingot:gold':2,
    'ingot:iron':3,
    'ingot:lumen':4,
    'ingot:mithril':5,
    'ingot:onyx':6,
    'ingot:rune':7,
    'ingot:steel':8,
    'ore:coal':9,
    'ore:copper':10,
    'ore:gold':11,
    'ore:iron':12,
    'ore:lumenite':13,
    'ore:mithril':14,
    'ore:onyx':15,
    'ore:runite':16,
    'ore:tin':17,
    'tether:bronze':18,
    'tether:gold':19,
    'tether:iron':20,
    'tether:lumen':21,
    'tether:mithril':22,
    'tether:onyx':23,
    'tether:rune':24,
    'tether:steel':25,
    'tool:climb_bronze':26,
    'tool:climb_gold':27,
    'tool:climb_iron':28,
    'tool:climb_lumen':29,
    'tool:climb_mithril':30,
    'tool:climb_onyx':31,
    'tool:climb_rune':32,
    'tool:climb_steel':33,
    'tool:tlink_bronze':34,
    'tool:tlink_gold':35,
    'tool:tlink_iron':36,
    'tool:tlink_lumen':37,
    'tool:tlink_mithril':38,
    'tool:tlink_onyx':39,
    'tool:tlink_rune':40,
    'tool:tlink_steel':41,
    'tool:pick_bronze':42,
    'tool:pick_gold':43,
    'tool:pick_iron':44,
    'tool:pick_lumen':45,
    'tool:pick_mithril':46,
    'tool:pick_onyx':47,
    'tool:pick_rune':48,
    'tool:pick_steel':49,
    'gear:winch_iron':52,
    'stand:drill':59,
    'stand:timber':59,
    'stand:iron':59,
    'stand:brass':59,
    'stand:lumenite':59,
    'bit:bronze':62,
    'bit:iron':63,
    'bit:steel':64,
    'bit:gold':65,
    'bit:mithril':66,
    'bit:rune':67,
    'bit:lumen':68,
    'bit:onyx':69,
    'drill:mithril':70
  }
};
function itemIco(id) {
  // (Art's painted pickaxe tier icons) tool:pick_<grade>@t1..@t10: one 10x1 sheet per grade (assets/ui/icons/items_<grade>_tiers.webp), a CSS background, so the
  // browser fetches a grade's sheet only the first time one of its tiered icons is shown; @t0 is the pick's own atlas cell
  const pt = /^tool:pick_(\w+)@t(\d+)$/.exec(id);
  if (pt) { const t = Math.max(0, Math.min(10, +pt[2])); id = 'tool:pick_' + pt[1]; if (t && ICONS.map[id] != null) return '<i class="cxsv cxico cxpt" style="--ix:' + (t - 1) + ';--iy:0;background-image:url(assets/ui/icons/items_' + pt[1] + '_tiers.webp)" aria-hidden="true"></i>'; }
  const i = ICONS.map[id];
  if (i == null) return null;
  const ix = i % ICONS.cols, iy = (i / ICONS.cols) | 0;
  return '<i class="cxsv cxico" style="--ix:' + ix + ';--iy:' + iy + '" aria-hidden="true"></i>';
}
