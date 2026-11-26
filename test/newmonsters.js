// (26 Nov) the 10 new playground monsters (Stalk Lurker, Mossmaw Toad, Skytalon Hawk + Glassback Dragonfly, Pebblepuff, Skyfin, Reed Crab, Cinder Wisp, Stubwing Drake,
// Stonehide Hog): Tin Golem stats, one each in the Attack Playground, none on the world map; each loads in the browser (WebP maps) with its 5 clips, sRGB maps,
// no tone mapping. Also Art's female v9 player body loads (WebP + mesh quantization). DOM / scene checks only, no renders.
const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8765/index.html';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const IDS = ['stalk_lurker', 'mossmaw_toad', 'skytalon_hawk', 'glassback_dragonfly', 'pebblepuff', 'skyfin', 'reed_crab', 'cinder_wisp', 'stubwing_drake', 'stonehide_hog'];
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 })).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(URL + '?t=' + Date.now(), { timeout: 90000, waitUntil: 'commit' }); await p.waitForFunction(() => typeof setTab === 'function' && typeof CharView !== 'undefined'); await p.evaluate(() => { try { closeModalQuiet(); } catch (e) {} setTab('city'); });
  await p.waitForFunction(() => typeof M3 !== 'undefined' && M3.st && M3.st.ok, null, { timeout: 240000 }).catch(() => {});
  const D = await p.evaluate((IDS) => { const T = CREATURE_DATA.tin_golem, K = ['level', 'hp', 'str', 'def', 'acc', 'xp', 'respawnS', 'atkS', 'leashR', 'walkSpd', 'atkReach', 'aggro'], pg = PLAYGROUND_COMBAT.CREATURES, W = WORLD_GOLEMS;
    const onMap = IDS.filter((id) => JSON.stringify(W).includes(id)); return { rows: IDS.map((id) => { const C = CREATURE_DATA[id]; return [id, !!C, C ? K.filter((k) => C[k] !== T[k]) : null, pg.filter((r) => r.id === id).length]; }), onMap, kinds: [...new Set(WorldGolems.list.map((g) => g.kind))].sort().join() }; }, IDS);
  ok(D.rows.every((r) => r[1] && r[2].length === 0 && r[3] === 1), 'all 10 in CREATURE_DATA with the Tin Golem\'s stats, once each in PLAYGROUND_COMBAT ' + JSON.stringify(D.rows.filter((r) => !(r[1] && r[2].length === 0 && r[3] === 1))));
  ok(D.onMap.length === 0 && D.kinds === 'coal_golem,copper_golem,tin_golem', 'none on the world map (overworld kinds ' + D.kinds + ')');
  // the female v9 body through the game's loader in the browser
  const FB = await p.evaluate(async () => { const id = PLAYER_MODELS.f.id; if (!Creatures.get(id)) Creatures.def(id, PLAYER_MODELS.f); try { await Creatures.load(id); } catch (e) { return { err: String(e) }; } const I = Creatures.make(id); let tris = 0, map = null; I.root.traverse((o) => { if (o.isSkinnedMesh && !o.userData.isInk) { tris += o.geometry.index.count / 3; map = map || o.material.map; } }); return { bones: I.bones.length, clips: Object.keys(I.clips).sort().join(), tris, map: !!(map && map.image && map.image.width) }; });
  ok(!FB.err && FB.bones === 24 && FB.clips === 'Attack,Idle,Mine,Run,Walk' && FB.map, 'female v9 loads in the browser (WebP + quantized mesh): ' + JSON.stringify(FB));
  // the playground: all 10 built next to the mushroom
  await p.waitForFunction(() => Explore.on && CharView.st.gnd, null, { timeout: 120000 }).catch(() => {});
  await p.evaluate(() => setTab('char')); await p.waitForFunction(() => CharView.solo && CharView.rig, null, { timeout: 60000 });
  const tap = (sel) => p.evaluate((sel) => { const e = document.querySelector(sel); if (!e || e.disabled) return false; e.click(); return true; }, sel);
  await tap('#pvBtn'); await p.waitForSelector('#pvPanel [data-pvk="sword"]'); await tap('#pvPanel [data-pvk="sword"]'); await p.waitForSelector('#pvPanel [data-swg]');
  await tap('#pvPanel [data-swg="iron"]'); await tap('#pvPanel [data-swt="3"]'); await tap('#pvPanel [data-swh="R"]'); await p.waitForFunction(() => CharView.sw.w > 0.99, null, { timeout: 30000 }).catch(() => {});
  await tap('#swAtk'); await p.waitForFunction((IDS) => { const g = CharView.pga; return g.on && IDS.every((id) => g.mobs.some((m) => m.id === id && m.ready)); }, IDS, { timeout: 180000 }).catch(() => {});
  const P = await p.evaluate((IDS) => { const g = CharView.pga; return { n: g.mobs.length, rows: IDS.map((id) => { const L = g.mobs.filter((m) => m.id === id), m = L[0]; if (!m || !m.ready) return [id, L.length, false]; const mats = []; m.root.traverse((o) => { if (o.isMesh && !o.userData.isInk) mats.push(o.material); });
      const r = Math.hypot(m.x, m.z), clips = ['Idle', 'Walk', 'Attack', 'Hit', 'Death'].filter((c) => m.clips.includes(c)).length; return [id, L.length, true, clips, +r.toFixed(2), +m.y.toFixed(3), m.root.parent === g.arena, mats.every((q) => q.map && q.map.encoding === THREE.sRGBEncoding && q.toneMapped === false && q.map.image && q.map.image.width > 0)]; }) }; }, IDS);
  for (const r of P.rows) ok(r[1] === 1 && r[2] && r[3] === 5 && r[4] < 7 && Math.abs(r[5]) < 0.01 && r[6] && r[7], `playground: ${r[0]} once, built in the arena with Idle / Walk / Attack / Hit / Death, sRGB WebP maps, no tone mapping ${JSON.stringify(r)}`);
  ok(P.n === 12, 'playground has the mushroom + the Tin Golem + the 10 new monsters: ' + P.n);
  ok(errs.length === 0, 'no page errors ' + errs.slice(0, 3).join(' | '));
  await b.close(); console.log(fails ? `${fails} FAILED` : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
