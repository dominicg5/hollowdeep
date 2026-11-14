# Hollowdeep: playable prototype

One self-contained file: `hollowdeep-prototype.html`. It has no dependencies and works offline. Open it in any modern browser (Safari/Chrome on a phone, or desktop). Progress saves to the browser's localStorage.

**Test mode is ON by default:** 1 game hour = 1 real minute. Training thresholds are also scaled ×0.01 (+100% boost at 3,000 taps, daily cap 600). Toggle it, skip time, or reset in ⚙️ Settings.

## How to play
- **🗺️ Rim City** (opens first): a huge painted top-down map (world radius 11,000; about 20,000 AI homes). The **Hollow** is a vast open chasm (radius 1,800, nothing built over it) on the summit of a raised plateau. A dense metropolis of red-tile-roofed homes rings its lip; cliffs and switchback stairs fall away to the lowlands, where deep cracks spread out from the foot of the plateau in every direction and split the land into plateaus with outlying towns, rivers pouring into the cracks, frontier outposts with farm patches at the open ends of the outer cracks, **Lake Falls Town** (a stilt village whose lake drains into a new chasm) and **the Rift Pass** (a mountain split in two) in the mountain ring at the edge. Flat green grass, a sparse sprinkling of trees, haze over the far lowlands. Drag to pan, pinch or scroll to zoom, and use ＋/－, 🏠 (fly home), 🌐 (whole map), 📖 (legend), 📔 (Wren's journal), 🍂 (seasons and debug) or the round minimap. Homes, called **Lanternholds**, carry their owners' names and come in 8 tiers (Rimside Hut, Lantern Croft, Ropewalk Cottage, Tetherwright House, Ladderstack, Spinehouse, Lumenworks, Deepwarden Hall). Yours is ringed in gold and drawn from your real save. Tap anything:
  - a **home**: owner, level, power, its history, and a **Raid** button. The raid uses the same hero raid system; it costs 10 Lumen, is a 30 min march, and leaves a 6h shield.
  - Bazaars and public vaults are no longer on the map; the buildable 🏦 Rim Vault lives in the Capital tab.
  - (map labels stay fixed to the world; there are no region labels or region looks)
  - **Tether lifts, landmarks** (Statue of the First Descent, the Memorial Wall, the sealed Undergate), **frontier outposts**, **Lake Falls Town**, **the Rift Pass**, **rift mouths**, static **named townsfolk**, and the **Hollow** itself.
  - The economy still has 🖤 **Obsidian** (Bellows layer, raids); region logic only drives loot behind the scenes.
  - Living world (kept calm and light): pets on porches, lifts riding up and down, chimney smoke, gentle clouds and light mist, day/night with the Hollow's Lumen glow pulsing at night, and the Rim Mole event. No storms, no flying fish, no roads or walkers, and no glowing lines in the crevices.
  - Seasons (Bloomtide, Lumen Summer, Ambertide, Frostfall; one game day each in test mode) bring the Lumen Festival lanterns, the Harvest Fair and winter frost. A rumor ticker hints at real upcoming raids, moles, price spikes and festivals.
- **🏰 Capital**: one builder at a time. Upgrade the Lantern Hall (income), Storehouse (caps and raid protection), Training Grounds, Tether Lift (how deep your Spine reaches, lift capacity, and a cheaper Pull), Guardian Wall (rock golems; from Lv 6 it also needs Obsidian), Kennel (pet slots), and Rim Forge (smelts raw ore at the top). Obsidian comes from the Bellows layer, raids on Emberwound homes, or the Cinderglass Bazaar.
- **🕳️ Hollow**: send Wren on timed expeditions. The Lip takes 1h, Terraces 3h, Rootfall 6h, and the Bellows 10h. Deeper trips pay better but are riskier. A failed run leaves her "stranded" (half loot, home later, or pay Lumen for a rescue line). Expeditions can also find pet eggs.
- **🐢 Outposts**: your Strider *Longstep* mines a vein and lifts its goods to the Rim every hour. Hauling costs Lumen (**the Pull** = weight × depth × layer pull). Install a **Smelter** (iron + coal → steel) or a **Lumen Still** (moss → lumen) to refine below, and set shipping to "Refined only". Moving means packing up, traveling, and settling, all on timers. It costs Crowns plus Lumen that scales with depth, and the outpost is raid bait while it's moving. At Tether Lift Lv 2 you can build a second outpost, the Tetherdrill. Outposts burn Lumen to stay lit, and they "go dark" if the capital runs out.
- **⚔️ Raids**: auto-resolved raids on 3 AI rival bases, scored by your hero + pets vs. their defense, for 0 to 3 stars of loot. AI raiders hit you every 8 to 14 game hours (the first, at 1.5h, is a tutorial raid you win). That's when the **wall stands up** and the golems wake. Raiders sometimes go after an outpost that's moving or has a full stockhold instead.
- **🗡️ Training**: tap the dummy (or hold Space). Taps feed a rolling 7-day bank: boost = 100% × (bank ÷ 300k)^0.75, with a daily cap of 60k. Taps over the cap earn cosmetic Spar Marks, and anything faster than 12 taps/sec is ignored. The boost multiplies all hero XP.
- **Offline**: close the tab and come back (more than 45s later). The game simulates the gap (up to 72 game hours) and shows a "While you were away" summary.

## What to test
1. Tap the dummy 20 to 30 times. The counter, boost %, and next-milestone line should update, and the sword should swing.
2. Send Wren to The Lip and wait about 1 minute. Loot and XP should show up as a toast and in the Chronicle (Raids tab).
3. Wait about 90 seconds from a new game for the tutorial raid and the golem reveal. You can also use Raids → "Test: trigger a raid on me".
4. The full chain: upgrade the Tether Lift to Lv 3 (needs Steel from Rootfall/Bellows expeditions or rival raids), move Longstep to the Iron Seam (layer 4), add a Smelter, choose "Refined only", and compare the two Pull numbers on the card.
5. Close the tab for a few minutes and reopen it (or use ⚙️ → Skip +8h). Check the away summary.
6. Feel: does a 2 to 3 minute check-in feel worth it? Is moving a real decision? Is the tap boost worth tapping?

## Tuning
Every number lives in the `CONFIG` object at the top of the `<script>`: layers, loot, timers, costs, the tap curve, Pull weights, raid odds, and pets.

## Dev
- Source pieces are in `src/`: `head.html`, `game.js`, `ui.js`, and the Rim City map files `map_gen.js` (seeded generation), `map_draw.js` (procedural fallback painter), `art_manifest.js` + `map_art.js` (painted-art renderer), `map_life.js` (time, seasons, agents) and `map_ui.js` (camera, input, overlays, cards). Rebuild `index.html` with `./build.sh`.
- Painted art lives in `assets/` (about 3.8 MB of WebP): three sprite atlases (homes in 8 tiers, mountains, lifts, landmarks, set pieces for the frontier outpost, Lake Falls Town and the Rift Pass, trees, townsfolk, pets, the Rim Mole), seamless ground, cliff and crop textures, the Hollow, and painted UI art in `assets/ui/` for the other tabs.
- Because of the image assets, serve the folder over http for local testing (for example `python3 -m http.server 8765`). `test/city.js` defaults to `http://localhost:8765/index.html`. `test/shots.js` takes quick review screenshots.
- Headless tests: `cd test && node test.js` (Playwright-core + system Chrome; about 100s because it waits for a real 1-hour test-mode expedition and the tutorial raid), and `node city.js` for the map (mobile viewport: render, drag, wheel, pinch, tap a home then raid, market, vault, lore, ticker, tabs, screenshots).
- The map is Canvas 2D. The static world is pre-rendered into 256px tiles at 8 zoom levels from 1/64 to 2 (an LRU cache with a per-frame render budget, crossfades, and prewarmed coarse levels). Far zoom draws homes as roof specks, and night lights merge into settlement glows. Plants are scattered at paint time from a world hash, so they cost no memory. Everything alive is a deterministic function of time. The map is seeded (`CITY.seed`), so every player sees the same world. `test/perf.js` benchmarks frame time under a 4x CPU throttle.

## Known limitations
- 2D only, no 3D and no sound. Sprites are not rotated, so homes all face the camera. The Hollow is a single painted image, so it softens at the closest zoom. Rift mouths are lore only for now; you cannot descend through them.
- Single-player: rivals, raiders and every Rim City Lanternhold are simulated AI. No server and no real PvP. Bazaar prices are local.
- Saves are per browser/device (localStorage). Clearing site data wipes them.
- The balance is a first pass and untested with real players.
- Not included yet: Gates and Wardens, Captains, line cutting/splice repair, Mother Veins, capital capture, Shellbacks, pet Moults.
