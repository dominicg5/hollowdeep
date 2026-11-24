// Drop tether tap menu: Open vault (next to teleport) opens the same Ledge vault window as at home
// (CharView.openVault: straight to Backpack ⇄ Vault for full in/out). Only within TAP_M of the strand;
// the backpack sheet never shows vault items. The rope hit radius stays 22 px.
const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8765/index.html';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  try {
    const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 })).newPage();
    const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(URL); await p.waitForTimeout(1000);
    await p.evaluate(() => { try { closeModalQuiet(); } catch (e) {} setTab('city'); });
    await p.waitForFunction(() => typeof M3 !== 'undefined' && M3.st.ok, null, { timeout: 200000 }).catch(() => {});
    await p.waitForFunction(() => Explore.on, null, { timeout: 30000 }).catch(() => {});
    await p.evaluate(async () => { for (let i = 0; i < 90 && M3.models !== 'ready'; i++) await new Promise((r) => setTimeout(r, 1000)); });

    const laid = await p.evaluate(() => {
      const WS = Explore.WS, F = Explore.ledgeFront();
      let k = null; for (const [dx, dy] of [[120, 60], [-120, 60], [120, -60], [-120, -60], [60, 140], [0, -150]]) {
        const q = Explore.reach(F.x + WS * dx, F.y + WS * dy); if (Math.hypot(q[0] - F.x, q[1] - F.y) > WS * 50) { k = q; break; }
      }
      Explore.enter(k[0], k[1]); for (let i = 0; i < 20; i++) Explore.tick(1 / 30);
      if (Craft.get('bag', 'tether:mithril') < 3000) Craft.add('bag', 'tether:mithril', 4000);
      const r = Explore.dropCreate(); for (let i = 0; i < 10; i++) Explore.tick(1 / 30);
      const T = TetherTap.routes().find((t) => t.kind === 'drop');
      return { err: r && r.err, hit: TetherTap.HIT, kind: T && T.kind, np: T && T.pts.length };
    });
    console.log(JSON.stringify(laid));
    ok(laid.hit === 22, `the rope hit radius stays a ${laid.hit} px screen-space finger pad`);
    ok(laid.kind === 'drop' && laid.np > 1 && !laid.err, 'a drop tether is laid and tappable');

    const standNear = () => p.evaluate(() => {
      const WS = Explore.WS, T = TetherTap.routes().find((t) => t.kind === 'drop'), P = T.pts, mid = P[Math.floor(P.length / 2)];
      const a = P[Math.max(0, Math.floor(P.length / 2) - 1)], b = P[Math.min(P.length - 1, Math.floor(P.length / 2) + 1)];
      const nx = -(b[1] - a[1]), ny = b[0] - a[0], nl = Math.hypot(nx, ny) || 1;
      const k = Explore.reach(mid[0] + nx / nl * WS * 4, mid[1] + ny / nl * WS * 4);
      Explore.enter(k[0], k[1]); for (let i = 0; i < 8; i++) Explore.tick(1 / 30);
      return { dist: +TetherTap.distToStrand(T).toFixed(2), can: TetherTap.canTeleport(T) };
    });

    const far = await p.evaluate(() => {
      const WS = Explore.WS, T = TetherTap.routes().find((t) => t.kind === 'drop'), P = T.pts, mid = P[Math.floor(P.length / 2)];
      const a = P[Math.max(0, Math.floor(P.length / 2) - 1)], b = P[Math.min(P.length - 1, Math.floor(P.length / 2) + 1)];
      const nx = -(b[1] - a[1]), ny = b[0] - a[0], nl = Math.hypot(nx, ny) || 1;
      const k = Explore.reach(mid[0] + nx / nl * WS * 20, mid[1] + ny / nl * WS * 20);
      Explore.enter(k[0], k[1]); for (let i = 0; i < 8; i++) Explore.tick(1 / 30);
      TetherTap.open(T, 195, 400);
      const v = TetherTap.el && TetherTap.el.querySelector('.tbVault');
      const disabled = !!(v && (v.disabled || v.classList.contains('dis')));
      const hint = v ? v.textContent : '';
      if (v) v.click();
      const opened = typeof ui !== 'undefined' && ui.modal === 'vault';
      TetherTap.close();
      try { closeModalQuiet(); } catch (e) {}
      return { dist: +TetherTap.distToStrand(T).toFixed(2), disabled, hint, opened, can: TetherTap.canTeleport(T) };
    });
    console.log(JSON.stringify({ far }));
    ok(far.dist > 8 && !far.can && far.disabled && !far.opened, `farther than 8 m (${far.dist} m) the menu still opens but Open vault is disabled`);
    ok(/Walk closer to the tether to open the vault/.test(far.hint), 'disabled vault row shows the walk-closer hint');

    const near = await standNear();
    const menu = await p.evaluate(() => {
      const T = TetherTap.routes().find((t) => t.kind === 'drop');
      TetherTap.open(T, 195, 400);
      const el = TetherTap.el, v = el && el.querySelector('.tbVault'), go = el ? [...el.querySelectorAll('.tbGo')] : [];
      return {
        shown: !!(el && !el.classList.contains('hidden')),
        vault: !!(v && /Open vault/.test(v.textContent) && !v.disabled && !v.classList.contains('dis')),
        tele: go.length >= 1 && go.every((b) => !b.disabled && b.dataset.k),
        label: v && v.querySelector('small') && v.querySelector('small').textContent
      };
    });
    console.log(JSON.stringify({ near, menu }));
    ok(near.dist <= 8 && near.can && menu.shown && menu.tele && menu.vault, `within 8 m (${near.dist} m) Open vault sits next to teleport and is enabled`);

    const xfer = await p.evaluate(async () => {
      Craft.add('bag', 'ingot:iron', 1);
      const b0 = Craft.get('bag', 'ingot:iron'), v0 = Craft.get('vault', 'ingot:iron');
      TetherTap.el.querySelector('.tbVault').click();
      await new Promise((r) => setTimeout(r, 150));
      const overview = ui.modal === 'cx-xfer' && !!document.querySelector('#modalBody [data-cxv=xfer]') && !document.querySelector('#modalBody .vsec') && !TetherTap.T; /* (t588u) straight to the exchange, no overview panel */
      const root = document.querySelector('[data-cxv=xfer]');
      const bagSlot = root && root.querySelector('.cxs[data-w=bag][data-id="ingot:iron"]');
      if (bagSlot) bagSlot.click();
      await new Promise((r) => setTimeout(r, 150));
      const afterDep = { bag: Craft.get('bag', 'ingot:iron'), vault: Craft.get('vault', 'ingot:iron') };
      Craft.sheet(true);
      const shDep = document.getElementById('bagSheet');
      const sheetAfterDep = !!(shDep && shDep.querySelector('[data-id="ingot:iron"]'));
      Craft.sheet(false);
      const vaultSlot = document.querySelector('#modalBody .cxs[data-w=vault][data-id="ingot:iron"]');
      if (vaultSlot) vaultSlot.click();
      await new Promise((r) => setTimeout(r, 150));
      const afterWd = { bag: Craft.get('bag', 'ingot:iron'), vault: Craft.get('vault', 'ingot:iron') };
      Craft.sheet(true);
      const shWd = document.getElementById('bagSheet');
      const sheetAfterWd = !!(shWd && shWd.querySelector('[data-id="ingot:iron"]'));
      Craft.sheet(false);
      try { closeModalQuiet(); } catch (e) {}
      return { b0, v0, overview, xfer: ui.modal === 'cx-xfer' || !!root, afterDep, sheetAfterDep, afterWd, sheetAfterWd };
    });
    console.log(JSON.stringify(xfer));
    ok(xfer.overview, 'Open vault closes the bubble and opens the Backpack ⇄ Vault exchange directly (no overview panel)');
    ok(xfer.xfer, 'Backpack ⇄ Vault is the same transfer screen as at the Ledge');
    ok(xfer.b0 === 1 && xfer.afterDep.bag === 0 && xfer.afterDep.vault === xfer.v0 + 1, `deposit moves one iron ingot bag → vault (${xfer.afterDep.bag} / ${xfer.afterDep.vault})`);
    ok(!xfer.sheetAfterDep, 'the backpack sheet does not show the item while it is in the vault');
    ok(xfer.afterWd.bag === 1 && xfer.afterWd.vault === xfer.v0, 'withdraw moves that ingot back vault → bag');
    ok(xfer.sheetAfterWd, 'once withdrawn, the backpack sheet shows the item again');
    ok(!errs.length, 'no page errors ' + errs.slice(0, 2).join(' | '));
  } finally { await b.close(); }
  console.log(fails ? fails + ' FAIL' : 'ALL PASS');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
