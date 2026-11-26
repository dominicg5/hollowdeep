/* (GD-32, Dominic t548u: 'push the map role out for the golems' / '100m radius around those fields. They can't walk up a slope greater than 30 degrees')
   Art's overworld golem plan (hd-notes/golem_placement/golem_placement.json, built against main 9987ff2, city seed 20261114): 2 golems per mining field, matching its ore -
   12 Tin, 12 Copper, 36 Coal - spawned just outside the ore on ground of 20 deg or less, each wandering its field's edge + 100 m, never up more than 30 deg, passive until
   provoked (the playground's creature rows: src/creatures/data.js). Map units: x / y = world x / z, WS = 6.35 per metre. Runtime: src/creatures/world_golems.js. */
const WORLD_GOLEMS = {
  WANDER_M: 100,         // metres past the field's edge (field radius + 100 m from its centre)
  MAX_SLOPE_DEG: 30,     // a golem never steps onto ground steeper than this
  SPAWN_SLOPE_DEG: 20,   // Art's spawn rule (his footprint check); the loader re-checks it
  // (GD-32 steering b) slope = Art's footprint_slope() (golem_placement/place_golems.py): the height gradient at his heightmap's own spacing (colossus_map grid: 2 x 13200 / 1599 =
  // 16.51 map units = 2.6 m, central differences like np.gradient), taken as the max over the centre + 8 points on a 2 m ring, and the footprint's height span over its 4 m width
  SLOPE_GRID_M: 2.6,     // gradient step (Art's grid spacing)
  FOOTPRINT_R_M: 2.0,    // footprint radius (Art's FOOTPRINT_R_M) - used for both the spawn re-check and every wander step
  // (GD-32 steering c) fields whose radius comes from the live game (Explore.oreSpots() R, its runtime fitR) instead of the table: Art's colossus_map.json matches the live
  // MINE_SPOTS centres exactly (all 30 within 0.06 map units) but its offline pass skips the bridge / Lumen-stream / forge-prune shrinks, so 7 (79.1 m) and 24 (cliff, 47.5 m) read big
  LIVE_R: [7, 24],
  LOAD_M: 240,           // her distance at which a golem's GLB starts loading (once per ore, lazily)
  SPAWN_M: 170,          // a golem is built (a clone of its ore's template) and drawn within this distance of her
  DESPAWN_M: 200,        // ...and released past this (hysteresis); farther golems are only a position
  ANIM_M: 90,            // its animation mixer and wander / fight AI run only within this
  MAX_LIVE: 6,           // at most this many built at once (the nearest)
  WALK_PAUSE_S: [2, 6],  // idle pause between wander legs
  LEG_M: [6, 22],        // length of one wander leg
  REACH_M: 1.7, STAND_M: 0.9, ATTACK_INTERVAL_S: 3, STRIKE_AT_S: 0.45, KEEP_REACH_M: 0.6, // her side (the playground's PGA.REACH / STAND, PLAYGROUND_COMBAT.CHASE)
  REPATH_S: 0.5,         // how often she re-aims at a moving target
  KO_CALM_S: 4,          // knocked out on the map: every golem calms down and she is back on her feet at full HP after this
  ORE_KIND: { tin: 'tin_golem', copper: 'copper_golem', coal: 'coal_golem' },
  // [field id, ore, centre x, centre y, radius] - Art's field table (the game's Explore.oreSpots(), the same seed)
  FIELDS: [
    [0, 'coal', 56.2, 4985.1, 502.3],
    [1, 'tin', -2158.7, -9459.9, 502.3],
    [2, 'tin', 10296.1, -953.4, 502.3],
    [3, 'coal', -10167.7, -359.5, 502.3],
    [4, 'tin', 7904.6, 6766.7, 502.3],
    [5, 'tin', -7487.3, 6975.3, 502.3],
    [6, 'coal', -1741.4, -4328.7, 502.3],
    [7, 'coal', -7840.4, -6410.4, 502.3],
    [8, 'copper', -4389.7, -70.6, 502.3],
    [9, 'coal', -2656.3, 9992.7, 502.3],
    [10, 'coal', 3121.7, 9511.2, 502.3],
    [11, 'copper', 4871.2, 2224.5, 502.3],
    [12, 'copper', 3234.1, -9010.5, 502.3],
    [13, 'copper', -4378.4, -1942, 502.3],
    [14, 'coal', -5617.5, 802.5, 502.3],
    [15, 'coal', 9830.6, 3139.4, 502.3],
    [16, 'copper', -3683.5, 6108.6, 502.3],
    [17, 'tin', -5768.4, -608.3, 502.3],
    [18, 'coal', 5900, -1178.1, 235.6],
    [19, 'coal', -2271.1, 2545.5, 502.3],
    [20, 'coal', 314.6, -4611.2, 502.3],
    [21, 'coal', -5095.9, -8111.7, 502.3],
    [22, 'copper', 3202, 4904.9, 502.3],
    [23, 'tin', 56.2, 8435.9, 502.3],
    [24, 'coal', 8177.5, 876.3, 301.4],
    [25, 'coal', 5753.9, 8580.3, 502.3],
    [26, 'coal', 5994.7, 4760.4, 502.3],
    [27, 'coal', 2158.7, 2401.1, 502.3],
    [28, 'coal', -7037.9, 89.9, 502.3],
    [29, 'coal', -2816.8, -2349.7, 502.3],
  ],
  // [id, field id, x, y, spawn slope deg] - Art's 60 placements (hard fields: 18 only 35% walkable, 24 / 26 not fully opposite - see his notes)
  SPAWNS: [
    ['golem_coal_f00_a', 0, 370.1, 5528.9, 1.1],
    ['golem_coal_f00_b', 0, -199.2, 4411.5, 0.5],
    ['golem_tin_f01_a', 1, -2702.5, -9146.0, 1.1],
    ['golem_tin_f01_b', 1, -1538.6, -9558.1, 3.8],
    ['golem_tin_f02_a', 2, 9736.7, -668.4, 3.6],
    ['golem_tin_f02_b', 2, 10855.5, -1238.4, 0.8],
    ['golem_coal_f03_a', 3, -9798.6, 148.5, 2.8],
    ['golem_coal_f03_b', 3, -10536.8, -867.5, 3.4],
    ['golem_tin_f04_a', 4, 8348.6, 7210.7, 1.5],
    ['golem_tin_f04_b', 4, 7460.6, 6322.7, 2.3],
    ['golem_tin_f05_a', 5, -7520.2, 7602.3, 0.3],
    ['golem_tin_f05_b', 5, -7454.4, 6348.3, 2.1],
    ['golem_coal_f06_a', 6, -1155.2, -4103.7, 2.5],
    ['golem_coal_f06_b', 6, -2365.8, -4394.3, 3.4],
    ['golem_coal_f07_a', 7, -8125.4, -5851.0, 3.2],
    ['golem_coal_f07_b', 7, -7313.8, -6752.4, 2.6],
    ['golem_copper_f08_a', 8, -4784.8, 417.4, 0.5],
    ['golem_copper_f08_b', 8, -3994.6, -558.6, 0.3],
    ['golem_coal_f09_a', 9, -2656.3, 10620.6, 0.8],
    ['golem_coal_f09_b', 9, -2656.3, 9364.8, 1.1],
    ['golem_coal_f10_a', 10, 3435.6, 10055.0, 3.0],
    ['golem_coal_f10_b', 10, 2807.8, 8967.4, 1.1],
    ['golem_copper_f11_a', 11, 5477.7, 2387.0, 10.9],
    ['golem_copper_f11_b', 11, 4264.7, 2062.0, 10.0],
    ['golem_copper_f12_a', 12, 3858.5, -8944.9, 6.4],
    ['golem_copper_f12_b', 12, 2609.7, -9076.1, 3.7],
    ['golem_copper_f13_a', 13, -4036.4, -1415.4, 0.6],
    ['golem_copper_f13_b', 13, -4720.4, -2468.6, 8.0],
    ['golem_coal_f14_a', 14, -5109.5, 1171.6, 4.3],
    ['golem_coal_f14_b', 14, -5872.9, 228.9, 12.4],
    ['golem_coal_f15_a', 15, 9257.0, 3394.8, 0.9],
    ['golem_coal_f15_b', 15, 10404.2, 2884.0, 2.4],
    ['golem_copper_f16_a', 16, -3968.5, 6668.0, 1.5],
    ['golem_copper_f16_b', 16, -3716.4, 5481.6, 4.8],
    ['golem_tin_f17_a', 17, -5194.8, -352.9, 2.0],
    ['golem_tin_f17_b', 17, -6333.9, -934.8, 6.2],
    ['golem_coal_f18_a', 18, 6482.6, -988.8, 9.5],
    ['golem_coal_f18_b', 18, 5652.2, -1358.1, 19.2],
    ['golem_coal_f19_a', 19, -1651.0, 2643.7, 0.7],
    ['golem_coal_f19_b', 19, -2891.2, 2447.3, 0.3],
    ['golem_coal_f20_a', 20, 508.6, -4014.1, 0.5],
    ['golem_coal_f20_b', 20, 120.6, -5208.3, 7.3],
    ['golem_coal_f21_a', 21, -4471.5, -8046.1, 5.3],
    ['golem_coal_f21_b', 21, -5693.0, -7917.7, 3.9],
    ['golem_copper_f22_a', 22, 3071.5, 5519.1, 16.4],
    ['golem_copper_f22_b', 22, 3332.5, 4290.7, 2.6],
    ['golem_tin_f23_a', 23, 425.3, 8943.9, 18.4],
    ['golem_tin_f23_b', 23, -540.3, 8170.3, 6.5],
    ['golem_coal_f24_a', 24, 8362.2, 1238.8, 17.9],
    ['golem_coal_f24_b', 24, 8369.1, 500.3, 19.5],
    ['golem_coal_f25_a', 25, 5147.4, 8742.8, 3.3],
    ['golem_coal_f25_b', 25, 6360.4, 8417.8, 1.7],
    ['golem_coal_f26_a', 26, 6279.7, 5319.8, 2.1],
    ['golem_coal_f26_b', 26, 6256.9, 4245.7, 18.2],
    ['golem_coal_f27_a', 27, 1763.6, 2889.1, 0.5],
    ['golem_coal_f27_b', 27, 2553.8, 1913.1, 0.8],
    ['golem_coal_f28_a', 28, -6792.7, 640.5, 9.3],
    ['golem_coal_f28_b', 28, -7525.5, -264.4, 8.0],
    ['golem_coal_f29_a', 29, -3324.8, -1980.6, 0.4],
    ['golem_coal_f29_b', 29, -2308.8, -2718.8, 0.8],
  ],
};
