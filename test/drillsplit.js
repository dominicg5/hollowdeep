// Drill stand + swappable bit: save migration, a stand is required to place, swapping returns the old bit,
// pitch snaps to Art's 15° notches (−60..+15, default −30), the Ledge Tether port stays vertical, and an out-of-range vein is rejected
const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8765/index.html';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 })).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(URL); await p.waitForTimeout(800);
  await p.evaluate(() => { try { closeModalQuiet(); } catch (e) {} setTab('city'); });
  await p.waitForFunction(() => typeof M3 !== 'undefined' && M3.st.ok, null, { timeout: 200000 }).catch(() => {});
  await p.waitForTimeout(500);

  // 1. save migration: an old Mithril Drill stack and a placed drill become a Riveted Iron stand + Mithril bit (placed bit is kept)
  const mig = await p.evaluate(() => {
    const bag0 = { 'drill:mithril': 4, 'ore:copper': 2 };
    const placed = { id: 'd99', node: 0, type: 'copper', tier: 'bronze', coal: 50, hop: 0, acc: 0, port: null, len: 0 };
    S.drillSplit = 0; S.mdSeed = 1; S.backpack = bag0; S.bagOrder = ['drill:mithril', 'ore:copper'];
    S.drills = { left: 4, tetherM: 3000, list: [placed], nid: 2, bit: 'bronze' };
    Craft.migrateDrillSplit();
    const camp = S.drills.list.find((d) => d.id === 'd99');
    return { flag: S.drillSplit, drillLeft: S.backpack['drill:mithril'] || 0, stand: Craft.get('bag', 'stand:iron'), bit: Craft.get('bag', 'bit:mithril'),
      copper: Craft.get('bag', 'ore:copper'), pStand: camp && camp.stand, pTier: camp && camp.tier, order: S.bagOrder.slice() };
  });
  console.log(JSON.stringify(mig));
  ok(mig.flag === 1 && mig.drillLeft === 0, 'migration flag is set and the legacy drill:mithril stack is gone');
  ok(mig.stand === 4 && mig.bit === 4 && mig.copper === 2, `4 stands + 4 Mithril bits in the bag, other items kept (${mig.stand} / ${mig.bit} / ${mig.copper})`);
  ok(mig.pStand === 'iron' && mig.pTier === 'bronze', 'the already-placed drill gets a Riveted Iron stand and keeps its bronze bit');
  ok(mig.order.includes('stand:iron') && mig.order.includes('bit:mithril') && !mig.order.includes('drill:mithril'), 'bag slot order replaces the old drill id');

  // 2. angle math, snaps, port stays vertical, iron tip is a 4-sided pyramid, bit tris under 600
  const geo = await p.evaluate(() => {
    const A = CharView.DRILL_ANG, DEG = Math.PI / 180;
    const a0 = CharView.drillAim(0, 0, -2); // level ahead along -Z? dx=0,dy=0,dz=-2 → target is -Z, elev 0
    const aDown = CharView.drillAim(0, -2, -2); // 45° down
    const aSteep = CharView.drillAim(0, -10, 1); // almost straight down, out of range
    const aHigh = CharView.drillAim(0, 4, -2); // ~63° up, out of range
    const aSnap = CharView.drillAim(0, Math.tan(-38 * DEG) * 2, -2);
    const ups = [], stands = {}, bits = {}, tris = {}; let ironTip = null;
    for (const p of A.pitches) {
      const g = CharView.mapDrill('mithril', 'copper', 'iron', { pitch: p, yaw: 0 });
      CharView.setDrillAngle(g, p, 0);
      const up = CharView.drillPortUp(g);
      ups.push({ p: Math.round(p / DEG), y: +up.y.toFixed(3), xz: Math.hypot(up.x, up.z) });
    }
    for (const k of ['timber', 'iron', 'brass', 'lumenite']) {
      const st = CharView.makeDrillStand(k);
      stands[k] = !!(st && st.userData.yawNode && st.userData.yoke && st.userData.hubPivot && st.userData.bitSocket && st.userData.tetherPort);
      stands[k + 'Cyl'] = false;
      st.userData.hub.traverse((o) => { if (o.geometry && o.geometry.type === 'CylinderGeometry' && o.geometry.parameters && o.geometry.parameters.radiusTop >= 0.14) stands[k + 'Cyl'] = true; });
    }
    const g0 = CharView.mapDrill('iron', 'copper', 'iron', { pitch: A.pitchDef, yaw: 0 });
    // default pose
    const def = { pitch: Math.round((g0.userData.pitch || 0) / DEG), yaw: g0.userData.yaw || 0 };
    for (const k of ['bronze', 'iron', 'steel', 'gold', 'mithril', 'rune', 'lumen', 'onyx']) {
      const bit = CharView.makeDrillBit(k); tris[k] = CharView.countTris(bit, false);
      bits[k] = bit.userData.grade;
      if (k === 'iron') {
        let sides = 0; bit.traverse((o) => { if (o.geometry && o.geometry.type === 'ConeGeometry' && o.geometry.parameters && o.geometry.parameters.radialSegments === 4) sides = 4; });
        ironTip = sides;
      }
    }
    return { A: { min: Math.round(A.pitchMin / DEG), max: Math.round(A.pitchMax / DEG), step: Math.round(A.step / DEG), def: Math.round(A.pitchDef / DEG), n: A.pitches.length, portY: A.portY, socketZ: A.socketZ },
      a0: { in: a0.inRange, p: Math.round(a0.pitch / DEG) }, aDown: { in: aDown.inRange, p: Math.round(aDown.pitch / DEG) },
      aSteep: { in: aSteep.inRange, p: Math.round(aSteep.pitch / DEG) }, aHigh: { in: aHigh.inRange, p: Math.round(aHigh.pitch / DEG) },
      aSnap: Math.round(aSnap.pitch / DEG), ups, stands, bits, tris, ironTip, def };
  });
  console.log(JSON.stringify({ A: geo.A, a0: geo.a0, aDown: geo.aDown, aSteep: geo.aSteep, aHigh: geo.aHigh, aSnap: geo.aSnap, def: geo.def, ironTip: geo.ironTip, tris: geo.tris, ups: geo.ups }));
  ok(geo.A.min === -60 && geo.A.max === 15 && geo.A.step === 15 && geo.A.def === -30 && geo.A.n === 6, `pitch range is −60° to +15° in 15° notches, default −30° (${JSON.stringify(geo.A)})`);
  ok(geo.A.portY === 0.17 && geo.A.socketZ === -0.15, 'port is 0.17 above the pivot, bitSocket is 0.15 forward (−Z)');
  ok(geo.a0.in && geo.a0.p === 0, `level target snaps to 0° (${geo.a0.p})`);
  ok(geo.aDown.in && geo.aDown.p === -45, `45° down snaps to the −45° notch (${geo.aDown.p})`);
  ok(geo.aSnap === -30 || geo.aSnap === -45, `−38° elevation snaps to a 15° notch (${geo.aSnap})`);
  ok(!geo.aSteep.in && !geo.aHigh.in, 'targets steeper than −60° or higher than +15° are out of range');
  ok(geo.def.pitch === -30, `a new stand defaults to −30° pitch (${geo.def.pitch})`);
  ok(geo.ups.every((u) => u.y > 0.98 && u.xz < 0.05), `Ledge Tether port stays vertical at every pitch (ups=${geo.ups.map((u) => u.y).join(',')})`);
  ok(geo.stands.timber && geo.stands.iron && geo.stands.brass && geo.stands.lumenite, 'all four stand tiers build the yaw/yoke/hubPivot/bitSocket/port rig');
  ok(geo.stands.timberCyl && geo.stands.ironCyl, 'the hub is a cylinder, not a ball');
  ok(geo.ironTip === 4, `the iron bit tip is a 4-sided pyramid (${geo.ironTip})`);
  const over = Object.entries(geo.tris).filter(([, n]) => n > 600);
  ok(!over.length, `every bit is under 600 tris (${JSON.stringify(geo.tris)})`);

  // 3. gameplay: a stand is required; swap returns the old bit; out-of-range placement is invalid
  const play = await p.evaluate(() => {
    Explore.build();
    const D = Explore.drillState();
    // seed a known inventory
    S.backpack = { 'stand:iron': 2, 'bit:mithril': 2, 'bit:bronze': 1 };
    S.bagOrder = ['stand:iron', 'bit:mithril', 'bit:bronze'];
    S.mdSeed = 1; S.drillSplit = 1;
    D.list = D.list.filter((d) => d.camp); D.left = 2; D.bit = 'mithril';
    const N = Explore.ORE.nodes, tgt = N.filter((n) => !n.cliff && Explore.oreStand(n)).sort((a, b) => a.x - b.x)[0];
    const st = Explore.oreStand(tgt);
    Explore.enter(st[0], st[1]);
    for (let i = 0; i < 8; i++) Explore.tick(1 / 30);
    const before = { stand: Craft.get('bag', 'stand:iron'), mith: Craft.get('bag', 'bit:mithril'), bronze: Craft.get('bag', 'bit:bronze') };
    const d = Explore.drillDeploy(tgt);
    const after = { stand: Craft.get('bag', 'stand:iron'), mith: Craft.get('bag', 'bit:mithril'), bronze: Craft.get('bag', 'bit:bronze'), ok: !!d, tier: d && d.tier, standK: d && d.stand, pitch: d && Math.round(d.pitch * 180 / Math.PI), inNotch: d && CharView.DRILL_ANG.pitches.some((p) => Math.abs(p - d.pitch) < 1e-6) };
    const sw = d && Explore.drillSwapBit(d, 'bronze');
    const swapped = { sw, tier: d && d.tier, mith: Craft.get('bag', 'bit:mithril'), bronze: Craft.get('bag', 'bit:bronze') };
    // no stands left after using both? we used 1, try placing without stands
    Craft.take('stand:iron', Craft.get('bag', 'stand:iron'));
    const other = N.filter((n) => n !== tgt && !n.cliff && Explore.oreStand(n))[0];
    const none = other ? Explore.drillDeploy(other) : 'skip';
    const noStand = { none: none == null || none === 'skip', stands: Craft.get('bag', 'stand:iron') };
    // restore a stand, aim math out of range
    Craft.add('bag', 'stand:iron', 1);
    const aim = CharView.drillAim(0, 10, 1); // nearly straight up
    // pitch nudge stays in the 6 notches
    const p0 = d.pitch, p1 = Explore.drillPitch(d, 1), p2 = Explore.drillPitch(d, -1);
    const notches = CharView.DRILL_ANG.pitches;
    const nudged = { p0: Math.round(p0 * 180 / Math.PI), p1: Math.round(p1 * 180 / Math.PI), p2: Math.round(p2 * 180 / Math.PI), ok: notches.includes(p1) && notches.includes(p2) };
    return { before, after, swapped, noStand, aimOut: !aim.inRange, nudged, min: Explore.ORE_MIN };
  });
  console.log(JSON.stringify(play));
  ok(play.after.ok && play.after.stand === play.before.stand - 1 && play.after.mith === play.before.mith - 1, 'placing a drill consumes one stand and one bit');
  ok(play.after.tier === 'mithril' && play.after.standK === 'iron' && play.after.inNotch, `placed with a mithril bit, iron stand, pitch snapped (${play.after.pitch}°)`);
  ok(play.swapped.sw && play.swapped.tier === 'bronze' && play.swapped.mith === play.before.mith && play.swapped.bronze === play.before.bronze - 1, 'swapping to bronze returns the mithril bit and consumes the bronze bit');
  ok(play.noStand.none && play.noStand.stands === 0, 'placing with no stand left fails and consumes nothing further');
  ok(play.aimOut, 'an elevation above +15° is reported out of range');
  ok(play.nudged.ok, `pitch nudge stays on a 15° notch (${play.nudged.p0} → ${play.nudged.p1} → ${play.nudged.p2})`);
  ok(play.min.mithril === 3 && play.min.onyx === 6 && play.min.copper === 0, 'ore minimum bit tiers: copper any, mithril needs gold+, onyx needs lumen+');

  ok(!errs.length, 'no page errors ' + errs.slice(0, 2).join(' | '));
  console.log(fails ? 'SOME FAILED' : 'ALL PASS');
  await b.close();
})();
