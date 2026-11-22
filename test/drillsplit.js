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
  await p.evaluate(() => { Skills.migrate(); S.skills.mining = Math.max(S.skills.mining || 0, Skills.xpToReach(90)); }); // existing tests predate drill-slot unlocks; give all 9 slots so deploy checks stay about stands, bits and tethers

  // 1. save migration: an old Mithril Drill stack and a placed drill become a Drill Stand + Mithril bit (placed bit is kept)
  const mig = await p.evaluate(() => {
    const bag0 = { 'drill:mithril': 4, 'ore:copper': 2 };
    const placed = { id: 'd99', node: 0, type: 'copper', tier: 'bronze', coal: 50, hop: 0, acc: 0, port: null, len: 0 };
    S.drillSplit = 0; S.mdSeed = 1; S.backpack = bag0; S.bagOrder = ['drill:mithril', 'ore:copper'];
    S.drills = { left: 4, tetherM: 3000, list: [placed], nid: 2, bit: 'bronze' };
    Craft.migrateDrillSplit();
    const camp = S.drills.list.find((d) => d.id === 'd99');
    return { flag: S.drillSplit, drillLeft: S.backpack['drill:mithril'] || 0, stand: Craft.get('bag', 'stand:drill'), bit: Craft.get('bag', 'bit:mithril'),
      copper: Craft.get('bag', 'ore:copper'), pStand: camp && camp.stand, pTier: camp && camp.tier, order: S.bagOrder.slice() };
  });
  console.log(JSON.stringify(mig));
  ok(mig.flag === 1 && mig.drillLeft === 0, 'migration flag is set and the legacy drill:mithril stack is gone');
  ok(mig.stand === 4 && mig.bit === 4 && mig.copper === 2, `4 stands + 4 Mithril bits in the bag, other items kept (${mig.stand} / ${mig.bit} / ${mig.copper})`);
  ok(mig.pStand === 'drill' && mig.pTier === 'bronze', 'the already-placed drill gets a Drill Stand and keeps its bronze bit');
  ok(mig.order.includes('stand:drill') && mig.order.includes('bit:mithril') && !mig.order.includes('drill:mithril'), 'bag slot order replaces the old drill id');

  const uni = await p.evaluate(() => {
    S.standUnify = 0; S.mdSeed = 1;
    S.backpack = { 'stand:timber': 2, 'stand:iron': 3, 'stand:brass': 1, 'bit:mithril': 1 };
    S.bagOrder = ['stand:timber', 'stand:iron', 'stand:brass', 'bit:mithril'];
    S.ledgeVault = { ores: {}, ingots: {}, gear: { lumenite: 4 }, lines: {}, coils: {} };
    S.drills = { left: 0, list: [{ id: 'd1', stand: 'lumenite', tier: 'gold' }], nid: 2 };
    Craft.migrateStandUnify();
    return { flag: S.standUnify, bag: Craft.get('bag', 'stand:drill'), old: ['timber', 'iron', 'brass', 'lumenite'].map((k) => S.backpack['stand:' + k] || 0),
      vault: Craft.get('vault', 'stand:drill'), pStand: S.drills.list[0].stand, order: S.bagOrder.filter((x) => x), bits: Craft.get('bag', 'bit:mithril') };
  });
  console.log(JSON.stringify(uni));
  ok(uni.flag === 1 && uni.bag === 6 && uni.old.every((n) => n === 0) && uni.bits === 1, `saved stands of every material fold into ${uni.bag} Drill Stands (bits kept)`);
  ok(uni.vault === 4 && uni.pStand === 'drill' && uni.order.filter((x) => String(x).startsWith('stand:')).length === 1 && uni.order.includes('stand:drill'), 'vault stands and placed drills migrate too, one bag slot');

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
    for (const k of ['drill']) {
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
  ok(geo.stands.drill, 'the Drill Stand builds the yaw/yoke/hubPivot/bitSocket/port rig');
  ok(geo.stands.drillCyl, 'the hub is a cylinder, not a ball');
  ok(geo.ironTip === 4, `the iron bit tip is a 4-sided pyramid (${geo.ironTip})`);
  const over = Object.entries(geo.tris).filter(([, n]) => n > 600);
  ok(!over.length, `every bit is under 600 tris (${JSON.stringify(geo.tris)})`);

  // 3. gameplay: a stand is required; swap returns the old bit; out-of-range placement is invalid
  const play = await p.evaluate(() => {
    Explore.build();
    const D = Explore.drillState();
    // seed a known inventory
    S.backpack = { 'stand:drill': 2, 'bit:mithril': 2, 'bit:bronze': 1 };
    S.bagOrder = ['stand:drill', 'bit:mithril', 'bit:bronze'];
    S.mdSeed = 1; S.drillSplit = 1; S.standUnify = 1;
    if (S.ledgeVault && S.ledgeVault.gear) { delete S.ledgeVault.gear.drill; for (const k of ['timber', 'iron', 'brass', 'lumenite']) delete S.ledgeVault.gear[k]; }
    D.list = D.list.filter((d) => d.camp); D.left = 2; D.bit = 'mithril';
    const N = Explore.ORE.nodes, tgt = N.filter((n) => !n.cliff && Explore.oreStand(n)).sort((a, b) => a.x - b.x)[0];
    const st = Explore.oreStand(tgt);
    Explore.enter(st[0], st[1]);
    for (let i = 0; i < 8; i++) Explore.tick(1 / 30);
    const before = { stand: Craft.get('bag', 'stand:drill'), mith: Craft.get('bag', 'bit:mithril'), bronze: Craft.get('bag', 'bit:bronze') };
    const d = Explore.drillDeploy(tgt);
    const after = { stand: Craft.get('bag', 'stand:drill'), mith: Craft.get('bag', 'bit:mithril'), bronze: Craft.get('bag', 'bit:bronze'), ok: !!d, tier: d && d.tier, standK: d && d.stand, pitch: d && Math.round(d.pitch * 180 / Math.PI), inNotch: d && CharView.DRILL_ANG.pitches.some((p) => Math.abs(p - d.pitch) < 1e-6) };
    const sw = d && Explore.drillSwapBit(d, 'bronze');
    const swapped = { sw, tier: d && d.tier, mith: Craft.get('bag', 'bit:mithril'), bronze: Craft.get('bag', 'bit:bronze') };
    // no stands left after using both? we used 1, try placing without stands
    Craft.take('stand:drill', Craft.get('bag', 'stand:drill'));
    const other = N.filter((n) => n !== tgt && !n.cliff && Explore.oreStand(n))[0];
    const none = other ? Explore.drillDeploy(other) : 'skip';
    const noStand = { none: none == null || none === 'skip', stands: Craft.get('bag', 'stand:drill') };
    // restore a stand, aim math out of range
    Craft.add('bag', 'stand:drill', 1);
    const aim = CharView.drillAim(0, 10, 1); // nearly straight up
    // pitch nudge stays in the 6 notches
    const p0 = d.pitch, p1 = Explore.drillPitch(d, 1), p2 = Explore.drillPitch(d, -1);
    const notches = CharView.DRILL_ANG.pitches;
    const nudged = { p0: Math.round(p0 * 180 / Math.PI), p1: Math.round(p1 * 180 / Math.PI), p2: Math.round(p2 * 180 / Math.PI), ok: notches.includes(p1) && notches.includes(p2) };
    return { before, after, swapped, noStand, aimOut: !aim.inRange, nudged, min: Explore.ORE_MIN };
  });
  console.log(JSON.stringify(play));
  ok(play.after.ok && play.after.stand === play.before.stand - 1 && play.after.mith === play.before.mith - 1, 'placing a drill consumes one stand and one bit');
  ok(play.after.tier === 'mithril' && play.after.standK === 'drill' && play.after.inNotch, `placed with a mithril bit, a Drill Stand, pitch snapped (${play.after.pitch}°)`);
  ok(play.swapped.sw && play.swapped.tier === 'bronze' && play.swapped.mith === play.before.mith && play.swapped.bronze === play.before.bronze - 1, 'swapping to bronze returns the mithril bit and consumes the bronze bit');
  ok(play.noStand.none && play.noStand.stands === 0, 'placing with no stand left fails and consumes nothing further');
  ok(play.aimOut, 'an elevation above +15° is reported out of range');
  ok(play.nudged.ok, `pitch nudge stays on a 15° notch (${play.nudged.p0} → ${play.nudged.p1} → ${play.nudged.p2})`);
  ok(play.min.mithril === 3 && play.min.onyx === 6 && play.min.copper === 0, 'ore minimum bit tiers: copper any, mithril needs gold+, onyx needs lumen+');

  // Ledge Tether strand must end in the yoke port (within 2 cm), at every pitch and yaw, on the Drill Stand, and on a far drill
  const seat = await p.evaluate(() => {
    const WS = Explore.WS, A = CharView.DRILL_ANG, DEG = 180 / Math.PI, lim = WS * 0.02, seatY = A.portSeatY;
    Explore.build();
    if (Craft.get('bag', 'stand:drill') < 2) Craft.add('bag', 'stand:drill', 2);
    if (Craft.get('bag', 'bit:bronze') < 4) Craft.add('bag', 'bit:bronze', 4);
    for (const id of Object.keys(Craft.ITEMS)) if (Craft.ITEMS[id].kind === 'teth') {
      const have = Craft.have(id); if (have < 8000) Craft.add('bag', id, 8000 - (Craft.get('bag', id) || 0));
    }
    const door = Explore.doorSpots().find((q) => q.type === 'ledge'), N = Explore.ORE.nodes;
    const near = N.filter((n) => !n.cliff && Explore.oreStand(n))
      .sort((a, b) => Math.hypot(a.x - door.x, a.y - door.y) - Math.hypot(b.x - door.x, b.y - door.y))[0];
    const ni = N.indexOf(near);
    let d = Explore.drillState().list.find((q) => !q.camp && q.node === ni) || Explore.drillDeploy(near, { bit: 'bronze', stand: 'stand:drill' });
    if (!d) return { ok: false, err: 'no-near-deploy' };
    const st = Explore.oreStand(near);
    Explore.enter(st[0], st[1]);
    for (let i = 0; i < 8; i++) Explore.tick(1 / 30);
    if (!d.port) Explore.drillWire(d, true);
    const measure = (mesh, drill) => {
      mesh.updateMatrixWorld(true);
      const port = mesh.userData.tetherPort;
      if (!port) return { err: 'no-port', dist: 99, cm: 99, leaveOk: false };
      const bore = port.localToWorld(new THREE.Vector3(0, seatY, 0));
      const r = Explore.drillRoute(drill);
      if (!r || !r.end3) return { err: 'no-end3', dist: 99, cm: 99, leaveOk: false };
      const end = new THREE.Vector3(r.end3[0], r.end3[1], r.end3[2]);
      const dist = end.distanceTo(bore);
      const leave = CharView.drillPlugLeave(r);
      const leaveDeg = leave ? +leave.deg.toFixed(1) : 0;
      return { dist, cm: dist / WS * 100, leaveDeg, leaveOk: !!(leave && leave.deg >= 45) };
    };
    const mesh0 = Explore.DRILL.meshes.get(d.id);
    if (!mesh0) return { ok: false, err: 'no-mesh' };
    const yaw0 = d.yaw || 0, pitch0 = d.pitch != null ? d.pitch : A.pitchDef;
    const pitches = [], yaws = [], stands = [];
    for (const p of A.pitches) {
      CharView.setDrillPose(mesh0, yaw0, p); d.pitch = p;
      const m = measure(mesh0, d);
      pitches.push({ deg: Math.round(p * DEG), cm: +m.cm.toFixed(3), leaveDeg: m.leaveDeg, ok: m.dist <= lim && m.leaveOk });
    }
    for (let i = 0; i < 24; i++) {
      const yaw = i * A.yawStep;
      CharView.setDrillPose(mesh0, yaw, A.pitchDef); d.yaw = yaw; d.pitch = A.pitchDef;
      const m = measure(mesh0, d);
      yaws.push({ deg: Math.round(yaw * DEG), cm: +m.cm.toFixed(3), leaveDeg: m.leaveDeg, ok: m.dist <= lim && m.leaveOk });
    }
    CharView.setDrillPose(mesh0, yaw0, pitch0); d.yaw = yaw0; d.pitch = pitch0;
    const parent = mesh0.parent, pos = mesh0.position.clone(), sc = mesh0.scale.x;
    for (const stand of ['drill']) {
      const m = CharView.mapDrill('bronze', 'copper', stand, { pitch: A.pitchDef, yaw: yaw0 });
      m.position.copy(pos); m.scale.setScalar(sc); if (parent) parent.add(m); m.updateMatrixWorld(true);
      const prev = Explore.DRILL.meshes.get(d.id);
      Explore.DRILL.meshes.set(d.id, m);
      const q = measure(m, d);
      stands.push({ stand, cm: +q.cm.toFixed(3), leaveDeg: q.leaveDeg, ok: q.dist <= lim && q.leaveOk });
      Explore.DRILL.meshes.set(d.id, prev);
      if (m.parent) m.parent.remove(m);
    }
    const farN = N.filter((n) => !n.cliff && Explore.oreStand(n) && n !== near)
      .map((n) => ({ n, d: Math.hypot(n.x - door.x, n.y - door.y) / WS }))
      .filter((q) => q.d >= 200)
      .sort((a, b) => a.d - b.d);
    let far = { ok: false };
    for (const c of farN) {
      const fd = Explore.drillDeploy(c.n, { bit: 'bronze', stand: 'stand:drill' });
      if (!fd) continue;
      for (let i = 0; i < 4; i++) Explore.tick(1 / 30);
      const fm = Explore.DRILL.meshes.get(fd.id);
      if (!fm) { Explore.drillPickUp(fd); continue; }
      const r = Explore.drillRoute(fd); if (!r) { Explore.drillPickUp(fd); continue; }
      if (!fd.port) Explore.drillWire(fd, true);
      const q = measure(fm, fd);
      far = { ok: q.dist <= lim && q.leaveOk, cm: +q.cm.toFixed(3), leaveDeg: q.leaveDeg, m: Math.round(c.d), len: r.len, wired: !!fd.port };
      break;
    }
    const all = pitches.concat(yaws, stands);
    return {
      wired: !!d.port, sockY: mesh0.userData.sock && +mesh0.userData.sock.y.toFixed(4),
      pitches, yaws, stands, far,
      pitchOk: pitches.every((q) => q.ok), yawOk: yaws.every((q) => q.ok), standOk: stands.every((q) => q.ok),
      leaveOk: pitches.every((q) => q.leaveDeg >= 45) && yaws.every((q) => q.leaveDeg >= 45) && stands.every((q) => q.leaveDeg >= 45),
      minLeave: Math.min(...all.map((q) => q.leaveDeg), far.leaveDeg != null ? far.leaveDeg : 90),
      maxCm: Math.max(...all.map((q) => q.cm), far.cm || 0)
    };
  }, { timeout: 120000 });
  console.log(JSON.stringify({ seat: { wired: seat.wired, sockY: seat.sockY, pitchOk: seat.pitchOk, yawOk: seat.yawOk, standOk: seat.standOk, leaveOk: seat.leaveOk, minLeave: seat.minLeave, far: seat.far, maxCm: seat.maxCm } }));
  ok(seat.wired && seat.pitchOk, `strand end is within 2 cm of the port at every pitch notch (max ${seat.maxCm} cm)`);
  ok(seat.yawOk, 'strand end stays in the port at every 15° yaw');
  ok(seat.standOk, `strand end seats on the Drill Stand (${(seat.stands || []).map((q) => q.stand).join(', ')})`);
  ok(seat.far && seat.far.ok && seat.far.m >= 200, `far drill (${seat.far.m} m, route ${seat.far.len} m) also seats within 2 cm (${seat.far.cm} cm)`);
  ok(seat.leaveOk && seat.far && seat.far.leaveDeg >= 45, `strand leaves the port sideways (≥45° from vertical; tightest ${seat.minLeave}°, far ${seat.far && seat.far.leaveDeg}°)`);

  ok(!errs.length, 'no page errors ' + errs.slice(0, 2).join(' | '));
  console.log(fails ? 'SOME FAILED' : 'ALL PASS');
  await b.close();
})();
