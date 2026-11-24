// Vault ⇄ Backpack: open the Ledge vault, Backpack ⇄ Vault, move a Ledge Tether (chosen length and the whole coil)
// and an ordinary item both ways. Vault items stay out of the backpack sheet until they are moved out.
const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8765/index.html', SHOT = process.env.SHOT || '';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 })).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(URL); await p.waitForTimeout(1000); await p.evaluate(() => { try { closeModalQuiet(); } catch (e) {} setTab('city'); });
  await p.waitForFunction(() => typeof M3 !== 'undefined' && M3.st.ok, null, { timeout: 200000 }).catch(() => {}); await p.waitForFunction(() => Explore.on, null, { timeout: 30000 }).catch(() => {});
  const shot = async (f) => { if (SHOT) { await p.waitForTimeout(400); await p.screenshot({ path: SHOT + '/' + f }); } };

  const s0 = await p.evaluate(() => { const seedB = Craft.get('bag', 'tether:bronze'), seedV = Craft.get('vault', 'tether:iron'); Craft.add('vault', 'ore:gold', 7); Craft.add('bag', 'tether:mithril', 4000); Craft.add('vault', 'tether:mithril', 5000); Craft.add('vault', 'tether:iron', 5000); Craft.sheet(true); const sh = document.getElementById('bagSheet');
    return { seedB, seedV, bagM: Craft.get('bag', 'tether:mithril'), vaultM: Craft.get('vault', 'tether:mithril'), vaultFe: Craft.get('vault', 'tether:iron'), vaultG: Craft.get('vault', 'ore:gold'),
      sheetVault: !!(sh && (sh.querySelector('[data-id="tether:iron"]') || sh.querySelector('[data-id="ore:gold"]'))),
      sheetBag: !!(sh && sh.querySelector('[data-id="tether:mithril"]')), drop: !!document.querySelector('#bagSheet .cxdrop') }; });
  console.log(JSON.stringify(s0));
  ok(s0.seedB === 1500 && s0.seedV === 0, `new save: a 1.5 km Bronze starter coil in the backpack (${s0.seedB} m), no free vault coils (Tether Mill rolls the rest)`);
  ok(s0.bagM === 4000 && s0.vaultM >= 5000 && s0.vaultFe >= 5000, `test coils: Mithril in the backpack (${s0.bagM} m), Mithril + Iron in the vault`);
  ok(s0.sheetBag && !s0.sheetVault, 'the backpack sheet shows carried items only, never vault tethers or vault ore');
  await p.evaluate(() => Craft.sheet(false));

  const x0 = await p.evaluate(async () => { const WS = Explore.WS, h = Explore.here(); TetherTap.openVault({ kind: 'drop', name: 'test drop', pts: [[h[0], h[1]], [h[0] + WS, h[1]]] }); await new Promise((r) => setTimeout(r, 200)); /* (t588u) the vault opens straight on Backpack ⇄ Vault; (t591u) opened through a real vault access point (a drop tether at her feet, within its range) so withdrawals are allowed */
    const root = document.querySelector('[data-cxv=xfer]'); const slot = root && root.querySelector('.cxs[data-w=vault][data-id="tether:mithril"]');
    if (slot) slot.click(); await new Promise((r) => setTimeout(r, 150));
    const menu = document.querySelector('#modalBody .cxmenu');
    return { modal: ui.modal, xfer: !!(root), menu: menu && menu.textContent.replace(/\s+/g, ' '), drop: !!document.querySelector('#modalBody .cxdrop'),
      mv: menu ? [...menu.querySelectorAll('[data-cx=mv]')].map((b) => b.textContent.trim()) : [] }; });
  console.log(JSON.stringify(x0));
  ok(x0.modal === 'cx-xfer' && x0.xfer, 'opening the vault shows Backpack ⇄ Vault directly');
  ok(!x0.drop && /m in Vault/.test(x0.menu || '') && x0.mv.some((t) => /All → Backpack/.test(t)), 'tapping a vault tether opens the transfer menu (length / all), not the drop-tether confirm');
  await shot('vault-xfer-tether.png');

  const x1 = await p.evaluate(async () => { const menu = document.querySelector('#modalBody .cxmenu');
    const inp = menu.querySelector('.cxin'); inp.value = '10'; menu.querySelector('[data-cx=mvc]').click(); await new Promise((r) => setTimeout(r, 150));
    return { bagM: Craft.get('bag', 'tether:mithril'), vaultM: Craft.get('vault', 'tether:mithril') }; });
  ok(x1.bagM === s0.bagM + 10 && x1.vaultM === s0.vaultM - 10, `Move 10 m of Mithril Ledge Tether vault → bag (${x1.bagM} / ${x1.vaultM})`);

  const x2 = await p.evaluate(async () => { const root = document.querySelector('[data-cxv=xfer]');
    root.querySelector('.cxs[data-w=vault][data-id="tether:iron"]').click(); await new Promise((r) => setTimeout(r, 120));
    document.querySelector('#modalBody .cxmenu [data-cx=mv][data-n=all]').click(); await new Promise((r) => setTimeout(r, 150));
    const bagFe = Craft.get('bag', 'tether:iron'), vaultFe = Craft.get('vault', 'tether:iron');
    document.querySelector('#modalBody .cxs[data-w=bag][data-id="tether:iron"]').click(); await new Promise((r) => setTimeout(r, 120));
    document.querySelector('#modalBody .cxmenu [data-cx=mv][data-n=all]').click(); await new Promise((r) => setTimeout(r, 150));
    return { bagFe, vaultFe, bagBack: Craft.get('bag', 'tether:iron'), vaultBack: Craft.get('vault', 'tether:iron') }; });
  console.log(JSON.stringify(x2));
  ok(x2.bagFe === s0.vaultFe && x2.vaultFe === 0, 'All → Backpack moves the whole iron coil out of the vault');
  ok(x2.bagBack === 0 && x2.vaultBack === s0.vaultFe, 'All → Vault moves that coil back');

  const x3 = await p.evaluate(async () => { if (Craft.get('vault', 'ore:gold') <= 0) Craft.add('vault', 'ore:gold', 7);
    const g0 = Craft.get('vault', 'ore:gold'), b0 = Craft.get('bag', 'ore:gold');
    const click = (w, id) => { const el = document.querySelector(`#modalBody .cxs[data-w="${w}"][data-id="${id}"]`); if (el) el.click(); return !!el; };
    const hitV = click('vault', 'ore:gold'); await new Promise((r) => setTimeout(r, 150));
    const mid = { bag: Craft.get('bag', 'ore:gold'), vault: Craft.get('vault', 'ore:gold'), hitV,
      vaultIds: [...document.querySelectorAll('#modalBody .cxs[data-w=vault][data-id]')].map((e) => e.dataset.id) };
    const hitB = click('bag', 'ore:gold'); await new Promise((r) => setTimeout(r, 150));
    try { closeModalQuiet(); } catch (e) {} Craft.sheet(true); const sh = document.getElementById('bagSheet');
    return { g0, b0, mid, hitB, after: { bag: Craft.get('bag', 'ore:gold'), vault: Craft.get('vault', 'ore:gold') },
      sheetGold: !!(sh && sh.querySelector('[data-id="ore:gold"]')), sheetFe: !!(sh && sh.querySelector('[data-id="tether:iron"]')) }; });
  console.log(JSON.stringify(x3));
  ok(x3.mid.bag === x3.b0 + x3.g0 && x3.mid.vault === 0, 'tapping a vault ore stack moves all of it to the backpack');
  ok(x3.after.bag === x3.b0 && x3.after.vault === x3.g0, 'tapping it in the backpack grid moves the stack back to the vault');
  ok(!x3.sheetGold && !x3.sheetFe, 'once an item is back in the vault, the backpack sheet does not show it');

  ok(!errs.length, 'no page errors ' + errs.slice(0, 2).join(' | '));
  console.log(fails ? 'SOME FAILED' : 'ALL PASS'); await b.close(); process.exit(fails ? 1 : 0);
})();
