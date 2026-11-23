// (Dominic) the one-time dev grant: #dev=<token> (only its SHA-256 is in the code). A wrong token does nothing; the right one runs once per save,
// upgrades the Ember Onyx tiered pickaxe he already has to T10 instead of adding a second, sets Mining to Lv 300, strips the hash; a full backpack
// equips it (the old pickaxe to the vault when the backpack has no room). The token is read from /workspace/hd-dev-secret (never in the repo).
// SHOT=1: ember_onyx_t10_mining300.png to /workspace/shots-char/final/.
const { chromium } = require('playwright-core'), fs = require('fs');
const URL = process.env.URL || 'http://localhost:8765/index.html', SHOT = process.env.SHOT || '', OUT = '/workspace/shots-char/final/';
const TOKEN = (/token: (\S+)/.exec(fs.readFileSync(process.env.DEV_SECRET || '/workspace/hd-dev-secret/dominic_grant.txt', 'utf8')) || [])[1];
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  if (!TOKEN) { console.log('FAIL no token file'); process.exit(1); }
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.addInitScript(() => { if (sessionStorage.getItem('dg')) return; sessionStorage.setItem('dg', '1'); localStorage.clear(); });
  await p.goto(URL + '?t=' + Date.now(), { timeout: 90000, waitUntil: 'commit' }); await p.waitForFunction(() => typeof S !== 'undefined' && S && typeof Craft !== 'undefined' && typeof DevGrant !== 'undefined', null, { timeout: 120000 });
  await p.waitForTimeout(3000); await p.evaluate(() => { try { closeModalQuiet(); } catch (e) {} });
  const ID = 'tool:tpick_onyx';
  // the plain one-time claim button (Dominic, on his phone): shown on a save that hasn't claimed, top centre of the screen
  await p.waitForFunction(() => !!document.getElementById('devClaimBtn'), null, { timeout: 8000 }).catch(() => {});
  const B0 = await p.evaluate(() => { const b = document.getElementById('devClaimBtn'), r = b && b.getBoundingClientRect(); return b ? [b.textContent, Math.round(r.top), Math.round(r.left + r.width / 2), getComputedStyle(b).display !== 'none'] : null; });
  ok(!!B0 && /Claim T10 Ember Onyx \+ Mining 300/.test(B0[0]) && B0[1] < 80 && Math.abs(B0[2] - 195) < 10 && B0[3], `an unclaimed save shows the 'Claim T10 Ember Onyx + Mining 300' button at the top centre (${JSON.stringify(B0)})`);
  // a wrong token: nothing happens (no grant, hash left alone)
  await p.evaluate(() => { location.hash = '#dev=not-the-token'; }); await p.waitForTimeout(1500);
  const W = await p.evaluate((ID) => [(S.devGrants || []).length, Craft.have(ID), Skills.level('mining'), /dev=/.test(location.hash)], ID);
  ok(W.join() === '0,0,1,true', `a wrong token does nothing (${W.join(',')})`);
  // he already owns an Ember Onyx tiered pickaxe (T3, in the vault): the grant upgrades it, never a second one
  await p.evaluate((ID) => { Craft.add('vault', ID, 1); S.tpicks = S.tpicks || {}; S.tpicks.onyx = 3; history.replaceState(null, '', location.pathname + location.search); }, ID);
  await p.evaluate((t) => { location.hash = '#dev=' + t; }, TOKEN); await p.waitForFunction(() => (S.devGrants || []).length > 0, null, { timeout: 20000 }).catch(() => {});
  const G = await p.evaluate((ID) => { const g = (S.devGrants || [])[0] || {}; return [S.devGrants.length, Craft.have(ID), Craft.get('vault', ID), Craft.pickTier('onyx'), Skills.level('mining'), /dev=/.test(location.hash), /upgraded T3 -> T10/.test(g.pick), !!g.at, /Dev grant/.test(document.getElementById('toasts').textContent)]; }, ID);
  ok(G.join() === '1,1,1,10,300,false,true,true,true', `the grant upgrades his one Ember Onyx pickaxe to T10 (no second one), Mining Lv 300, logged in S.devGrants with the date, hash stripped, toast (${G.join(',')})`);
  // once per save: the same link again does nothing
  await p.evaluate((t) => { location.hash = '#dev=' + t; }, TOKEN); await p.waitForTimeout(2000);
  const A = await p.evaluate((ID) => [S.devGrants.length, Craft.have(ID), Craft.pickTier('onyx'), /dev=/.test(location.hash)], ID);
  ok(A.join() === '1,1,10,false', `runs once per save: the link again grants nothing more (${A.join(',')})`);
  // the button: gone once claimed (by the link above); on an unclaimed save one tap runs the same grant once and the button is gone for good
  const BC = await p.evaluate(async (ID) => { const o = [!!document.getElementById('devClaimBtn')]; const sv = JSON.stringify({ g: S.devGrants, sk: S.skills }); S.devGrants = []; S.skills.mining = 0; DevGrant.button(); const b = document.getElementById('devClaimBtn'); o.push(!!b); if (b) b.click();
    await new Promise((r) => setTimeout(r, 1300)); o.push(S.devGrants.length, Skills.level('mining'), Craft.pickTier('onyx'), !!document.getElementById('devClaimBtn')); const s = JSON.parse(sv); S.devGrants = s.g; S.skills = s.sk; return o; }, ID);
  ok(BC.join() === 'false,true,1,300,10,false', `claim button: hidden once claimed; on an unclaimed save one tap grants T10 Ember Onyx + Mining 300 once (S.devGrants) and it disappears (${BC.join(',')}) (got claim button)`);
  // a save without one and a full backpack: it is equipped; the old (Iron) pickaxe goes to the vault (no backpack room), logged
  const F = await p.evaluate(async ([ID, T]) => { const sv = JSON.stringify({ b: S.backpack, o: S.bagOrder, v: S.ledgeVault, w: S.worn, t: S.tpicks, g: S.devGrants, pg: S.pickGrade, pe: S.pickEqT, sk: S.skills });
    Craft.take(ID, Craft.spare(ID)); delete S.tpicks.onyx; S.devGrants = []; S.skills.mining = 0; Craft.add('bag', 'tool:pick_iron', 1); Craft.equip('tool:pick_iron'); let n = 0; while (Craft.fits('bag', 'tool:pick_rune') && n++ < 40) Craft.add('bag', 'tool:pick_rune', 1);
    const vi = Craft.get('vault', 'tool:pick_iron'); history.replaceState(null, '', location.pathname + location.search + '#dev=' + T); const r = await DevGrant.check(5); const g = S.devGrants[0] || {}; const o = [r, Craft.worn().pick, Craft.pickTier('onyx'), Craft.get('vault', 'tool:pick_iron') - vi, /equipped/.test(g.pick), /vault/.test(g.old || ''), Skills.level('mining')];
    const s = JSON.parse(sv); S.backpack = s.b; S.bagOrder = s.o; S.ledgeVault = s.v; S.worn = s.w; S.tpicks = s.t; S.devGrants = s.g; S.pickGrade = s.pg; S.pickEqT = s.pe; S.skills = s.sk; Craft.order('bag'); return o; }, [ID, TOKEN]);
  ok(F.join() === 'granted,tool:tpick_onyx,10,1,true,true,300', `full backpack: the T10 pickaxe is equipped, the old Iron Pickaxe goes to the vault (no backpack room), logged (${F.join(',')}) (got dev grant)`);
  if (SHOT) { await p.evaluate((ID) => { Craft.equip(ID); try { closeModalQuiet(); } catch (e) {} document.querySelectorAll('#toasts .toast').forEach((t) => t.remove()); setTab('char'); }, ID);
    await p.waitForFunction(() => typeof CharView !== 'undefined' && CharView.st && CharView.st.ok && CharView.rig, null, { timeout: 120000 }).catch(() => {}); await p.waitForTimeout(2500);
    await p.screenshot({ path: '/tmp/dg_char.png' });
    // Mining Lv 300 in the Skills screen (it opens over the map), stacked under the Character view: one image
    await p.evaluate(() => { setTab('city'); Skills.screen(true); }); await p.waitForTimeout(1500); const row = await p.$('.skRow[data-sk="mining"]'); if (row) await row.screenshot({ path: '/tmp/dg_row.png' });
    require('child_process').execFileSync('python3', ['-c', "from PIL import Image\na=Image.open('/tmp/dg_char.png').convert('RGB');b=Image.open('/tmp/dg_row.png').convert('RGB')\nif b.width!=a.width: b=b.resize((a.width,round(b.height*a.width/b.width)))\no=Image.new('RGB',(a.width,a.height+b.height),'white');o.paste(a,(0,0));o.paste(b,(0,a.height));o.save('" + OUT + "ember_onyx_t10_mining300.png')"]);
    await p.evaluate(() => Skills.screen(false)); }
  ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  console.log(fails ? fails + ' FAILED' : 'ALL PASS'); await b.close(); process.exit(fails ? 1 : 0);
})();
