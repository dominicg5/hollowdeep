// Pickaxe tiers (was lumen_tiers.js; OLD_URL = the previous build for the T0-unchanged check): Lumenite 3D tiers + Art's painted tier icons for all eight grades. Lumenite pickaxe tiers (Dominic; Mia's lumenite_pick_tiers sheet): T0 is today's pick unchanged; only the crystal head (shards, core gems), its glow and light take the
// tier colour (handle / wrap / cyan binding identical at every tier); glints grow +8 per tier and get brighter + faster; T10 pulses and adds teal sparks; icons: every grade's T1..T10 are Art's painted cells (one lazy 10x1 sheet per grade), T0 the atlas cell, no CSS tint.
const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8765/index.html';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(URL + '?t=' + Date.now(), { timeout: 90000, waitUntil: 'commit' }); await p.waitForFunction(() => typeof CharView !== 'undefined' && CharView.makePickaxe && typeof Craft !== 'undefined', null, { timeout: 120000 });
  const R = await p.evaluate(() => { const info = (t) => { const px = CharView.makePickaxe('lumen', t), mats = [], pts = []; px.traverse((o) => { if (o.isPoints) pts.push([o.geometry.attributes.position.count, o.material.uniforms && o.material.uniforms.uCol ? o.material.uniforms.uCol.value.getHexString() : '?']); else if (o.isMesh) { const m = Array.isArray(o.material) ? o.material[0] : o.material; mats.push(m && m.color ? m.color.getHexString() + (m.emissive ? '/' + m.emissive.getHexString() : '') : (m ? m.type : '-')); } });
      return { mats, pts, fl: px.userData.fl || 1, pulse: !!px.userData.pulse, glowMap: px.userData.glow.material.map.uuid, light: px.userData.light.color.getHexString(), tierCol: px.userData.tierCol }; };
    const A = Array.from({ length: 11 }, (_, t) => info(t)); S.pickGrade = 'bronze'; const plain = info(undefined);
    const box = document.createElement('div'); box.style.cssText = 'position:fixed;left:0;top:0;width:48px'; document.body.appendChild(box);
    const cell = (id) => { box.innerHTML = itemIco(id); const e = box.firstChild, cs = getComputedStyle(e); return [e.className, cs.backgroundImage.replace(/.*\/(\w+)\.webp.*/, '$1'), cs.backgroundPosition, cs.backgroundSize, cs.filter]; };
    const sheets = () => performance.getEntriesByType('resource').filter((e) => /items_\w+_tiers/.test(e.name)).map((e) => e.name.replace(/.*items_(\w+)_tiers.*/, '$1'));
    const G = ['bronze', 'iron', 'steel', 'gold', 'mithril', 'rune', 'lumen', 'onyx'], pre = sheets(), ic = {}, t0 = {}; for (const g of G) { t0[g] = cell('tool:pick_' + g); ic[g] = Array.from({ length: 11 }, (_, t) => cell('tool:pick_' + g + '@t' + t)); }
    const keep = document.createElement('div'); keep.style.cssText = 'position:fixed;left:0;top:60px;width:48px;z-index:99999'; keep.innerHTML = G.map((g) => itemIco('tool:pick_' + g + '@t1')).join(''); document.body.appendChild(keep);
    S.tpicks = S.tpicks || {}; Craft.add('bag', Craft.TPICK('onyx'), 1); S.tpicks.onyx = 5; const bag = Craft.bagHTML(false);
    return { A, plain, ic, t0, pre, bag: [/items_onyx_tiers\.webp/.test(bag), /--ix:4/.test(bag), /hue-rotate|data-tier/.test(bag)], gone: [typeof Craft.tintIco, typeof Craft.onyxFilter, typeof Craft.lumenFilter] }; });
  await p.waitForTimeout(2000); const sheet = await p.evaluate(() => performance.getEntriesByType('resource').filter((q) => /items_\w+_tiers/.test(q.name)).map((q) => [q.name.replace(/.*items_(\w+)_tiers.*/, '$1'), q.decodedBodySize]));
  const A = R.A, T0 = A[0], H = new Set(['8ff6ff/1d93ad', 'bffcff']);
  ok(JSON.stringify(R.plain.mats) === JSON.stringify(T0.mats) && JSON.stringify(R.plain.pts) === JSON.stringify(T0.pts) && R.plain.light === T0.light, 'unequipped Lumenite = T0 build');
  ok(T0.pts.length === 1 && T0.pts[0][0] === 40 && T0.pts[0][1] === '7ff4ff' && T0.fl === 1 && !T0.pulse && T0.light === '7ff4ff' && T0.mats.includes('8ff6ff/1d93ad'), 'T0 = today (40 glints, #7ff4ff, original crystal colours) ' + JSON.stringify(T0.pts));
  let onlyHead = true; for (let t = 1; t <= 10; t++) A[t].mats.forEach((m, i) => { if (m !== T0.mats[i] && !H.has(T0.mats[i])) onlyHead = false; }); ok(onlyHead && A.every((a) => a.mats.length === T0.mats.length), 'only the crystal head recolours (handle, wrap, binding identical at every tier)');
  ok(A.slice(1).every((a) => a.mats.filter((m) => !T0.mats.includes(m)).length > 0 && a.glowMap !== T0.glowMap), 'T1..T10 crystal + glow take the tier colour');
  ok(A.every((a, t) => a.pts[0][0] === 40 + 8 * t) && A.every((a, t) => !t || a.fl > A[t - 1].fl), 'glints +8 per tier, faster each tier: ' + A.map((a) => a.pts[0][0] + '@' + a.fl.toFixed(2)).join(' '));
  ok(A[10].pulse && A[10].pts.length === 2 && A[10].pts[1][0] === 24 && A[10].pts[1][1] === '2fe8d8' && A.slice(0, 10).every((a) => !a.pulse && a.pts.length === 1), 'T10 only: pulse + 24 teal sparks; light ' + A[10].light + ' / T7 ' + A[7].light);
  const GR = Object.keys(R.ic); ok(GR.length === 8 && GR.every((g) => JSON.stringify(R.ic[g][0]) === JSON.stringify(R.t0[g]) && R.t0[g][1] === 'items'), 'T0 icon = each pick\'s own atlas cell (8 grades)');
  ok(GR.every((g) => R.ic[g].slice(1).every((c, i) => /cxpt/.test(c[0]) && c[1] === 'items_' + g + '_tiers' && c[3] === '1000% 100%' && c[4] === 'none' && Math.abs(parseFloat(c[2]) - i * 100 / 9) < 0.01)), 'T1..T10 = Art\'s painted cells for every grade, no tint');
  ok(!R.pre.length && GR.every((g) => sheet.filter((q) => q[0] === g).length === 1), 'sheets lazy (none before an icon shows), each fetched once: ' + sheet.map((q) => q[0] + ' ' + q[1]).join(', '));
  ok(R.bag[0] && R.bag[1] && !R.bag[2] && R.gone.every((x) => x === 'undefined'), 'backpack T5 Ember Onyx uses its painted cell; tintIco / onyxFilter / lumenFilter gone ' + JSON.stringify([R.bag, R.gone]));
  // (Art's tier_ladders, t387s1456) Bronze..Rune 3D tiers: T0 identical to the previous build, handle + bindings identical at every tier, head / glow / veins / sparkles by tier
  const FP = () => { const G = ['bronze', 'iron', 'steel', 'gold', 'mithril', 'rune', 'lumen', 'onyx', 'stick'], hx = (c) => (c && c.getHexString ? c.getHexString() : '-');
    const fp = (g, t) => { const px = CharView.makePickaxe(g, t), head = px.children.find((c) => c.isGroup && Math.abs(c.position.y - 0.68) < 1e-6), out = { head: [], rest: [], pts: [], map: 0, light: px.userData.light ? hx(px.userData.light.color) : '-', rune: px.userData.runeM ? hx(px.userData.runeM.color) : '-' };
      px.traverse((o) => { if (o.isPoints) { out.pts.push(o.geometry.attributes.position.count); return; } if (!o.isMesh) return; let h = false; for (let q = o; q; q = q.parent) if (q === head) h = true; const m = [].concat(o.material)[0] || {};
        const f = [m.type, hx(m.color), hx(m.emissive), hx(m.specular), m.shininess != null ? +m.shininess.toFixed(2) : '-', m.map ? (m.map.image ? m.map.image.width : 1) : 0, o.geometry.attributes.position.count].join('/'); if (h) { out.head.push(f); if (m.map && t >= 8 && m.map.image && m.map.image.width === 128) out.map++; /* (the vein canvas; Rune's rune decal is 256) */ } else out.rest.push(f); });
      px.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); return out; };
    const o = {}; for (const g of G) o[g] = Array.from({ length: g === 'stick' ? 1 : 11 }, (_, t) => fp(g, t)); return o; };
  const NEW = await p.evaluate(FP); let OLD = null;
  if (process.env.OLD_URL) { const q = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); await q.goto(process.env.OLD_URL + '?t=' + Date.now(), { timeout: 90000, waitUntil: 'commit' }); await q.waitForFunction(() => typeof CharView !== 'undefined' && CharView.makePickaxe, null, { timeout: 120000 }); OLD = await q.evaluate(FP); }
  const GT = ['bronze', 'iron', 'steel', 'gold', 'mithril', 'rune'], J = JSON.stringify;
  const F0 = (x) => J([x.head, x.rest, x.pts, x.light]); ok(OLD && Object.keys(NEW).every((g) => F0(NEW[g][0]) === F0(OLD[g][0])), 'every grade\'s T0 identical to the previous build (' + (OLD ? Object.keys(NEW).filter((g) => F0(NEW[g][0]) !== F0(OLD[g][0])).join(',') || 'all 9 match' : 'OLD_URL not set') + ')');
  ok(GT.every((g) => NEW[g].every((x) => J(x.rest) === J(NEW[g][0].rest))), 'Bronze..Rune: handle, wraps and bindings identical at every tier (Ember Onyx\'s handle cracks are tier-lit by design)');
  ok(GT.every((g) => NEW[g].slice(1).every((x) => J(x.head) !== J(NEW[g][0].head))) && GT.every((g) => NEW[g].every((x, t) => x.head.length === NEW[g][0].head.length)), 'Bronze..Rune: T1..T10 heads take their tier look (same parts as T0)');
  ok(['bronze', 'iron', 'steel', 'gold'].every((g) => NEW[g].every((x, t) => t >= 8 ? x.map > 0 : x.map === 0)) && NEW.mithril.every((x) => !x.map) && NEW.rune.every((x) => !x.map), 'veins on T8..T10 only (bronze / iron Damascus / steel / gold)');
  ok(NEW.mithril.every((x, t) => (x.pts[0] || 0) === 4 * t) && NEW.rune[10].pts[0] === 22 && NEW.rune[10].rune === 'ffcf5a' && NEW.rune[0].rune === 'b48cff' && NEW.rune[10].light === 'ffcf5a', 'mithril blue sparkles 4/tier; rune glow b48cff -> ffcf5a, gold motes at T10 ' + J([NEW.mithril.map((x) => x.pts[0] || 0), NEW.rune.map((x) => x.rune)]));
  console.log('steel heads: ' + NEW.steel.map((x) => x.head[0].split('/')[1]).join(' ') + ' | rune: ' + NEW.rune.map((x) => x.head[0].split('/')[1]).join(' '));
  ok(!errs.length, 'no page errors ' + errs.slice(0, 2).join(' | '));
  console.log(fails ? `${fails} FAILED` : 'ALL PASS'); await b.close(); process.exit(fails ? 1 : 0);
})();
