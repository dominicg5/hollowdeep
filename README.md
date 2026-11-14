# Hollowdeep: playable prototype

One self-contained file: `hollowdeep-prototype.html`. It has no dependencies and works offline. Open it in any modern browser (Safari/Chrome on a phone, or desktop). Progress saves to the browser's localStorage.

**Test mode is ON by default:** 1 game hour = 1 real minute. Training thresholds are also scaled ×0.01 (+100% boost at 3,000 taps, daily cap 600). Toggle it, skip time, or reset in ⚙️ Settings.

## How to play
- **🏰 Capital**: one builder at a time. Upgrade the Lantern Hall (income), Storehouse (caps and raid protection), Training Grounds, Tether Lift (how deep your Spine reaches, lift capacity, and a cheaper Pull), Guardian Wall (rock golems), Kennel (pet slots), and Rim Forge (smelts raw ore at the top).
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
- Source pieces are in `src/` (`head.html`, `game.js`, `ui.js`). Rebuild with:
  `{ cat src/head.html; echo '<script>'; cat src/game.js src/ui.js; echo '</script>'; echo '</body></html>'; } > hollowdeep-prototype.html`
- Headless tests: `cd test && node test.js` (Playwright-core + system Chrome; about 100s because it waits for a real 1-hour test-mode expedition and the tutorial raid).

## Known limitations
- 2D only: painterly CSS/SVG with emoji placeholders, no 3D and no sound.
- Single-player: rivals and raiders are simulated AI. No server, no market, no real PvP.
- Saves are per browser/device (localStorage). Clearing site data wipes them.
- The balance is a first pass and untested with real players.
- Not included yet: Gates and Wardens, Captains, line cutting/splice repair, Mother Veins, capital capture, Shellbacks, pet Moults.
