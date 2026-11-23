/* ===== Theus (Prometheus in the old songs): the forge ape's talk and Theus's pickaxe tier upgrades =====
   Talk the Mosby way (MosbyTalk / npc_kit pattern): tap him (screen pick, he has no collider) while standing ON the anvil mountain's top (the platform, z ~26);
   anywhere else a tap on him only gives a short hint. A leather-and-canvas bar with Art's brass porthole portraits (assets/ui/theus: idle by default, talking
   mid-line, pleased on a success or an accepted deal), a few lines in character and "Upgrade pickaxe", which opens the upgrade card: a parchment card on a
   leather frame, the pickaxe kinds on the left with brass tier badges, the selected pickaxe's tier, next multiplier, cost (pickaxes of the same kind, consumed),
   owned / required, ore/h before and after, a brass Upgrade button, a ten-pip tier track, "Mastered" at T10. Tier maths: Skills.pickUpg* (src/skills.js). */
const Theus = (() => {
  const ST = { el: null, step: null, up: null, sel: null, flash: null };
  const GN = { bronze: 'Bronze', iron: 'Iron', steel: 'Steel', gold: 'Gold', mithril: 'Mithril', rune: 'Rune', lumen: 'Lumen', onyx: 'Ember Onyx' }, NAME = (k) => (GN[k] || k) + ' Pickaxe';
  const ico = (k, t) => { const id = 'tool:pick_' + k, h = (typeof itemIco === 'function' && itemIco(id)) || (typeof Craft !== 'undefined' ? Craft.svgIco(id) : ''); return k === 'onyx' && t > 0 && Craft.tintIco ? Craft.tintIco(h, t) : h; }; // (Ember Onyx: its tier's flame colour)
  const have = (k) => (typeof Craft !== 'undefined' ? Craft.have('tool:pick_' + k) : 0);
  // (Dominic: Theus pulls from the vault) owned = plain pickaxes of that kind in the backpack and the vault together, less the one in her hand (never taken; nor is the tiered one)
  // (equipped gear has its own slot now: the pickaxe in her hand is never in the backpack or vault counts, so it is never taken as payment)
  const inHand = (k) => (typeof S !== 'undefined' && S && Craft.worn && Craft.worn().pick === 'tool:pick_' + k ? 1 : 0);
  function split(k) { const id = 'tool:pick_' + k, pv = Craft.get('vault', id), pb = Craft.get('bag', id); return { vault: pv, pack: pb, all: pv + pb }; }
  const owned = (k) => (typeof Craft !== 'undefined' ? split(k).all : 0);
  // payment: the vault first, then the backpack
  function pay(k, n) { const id = 'tool:pick_' + k, sp = split(k); if (sp.all < n) return false; const fv = Math.min(n, sp.vault), fb = n - fv; if (fv) Craft.add('vault', id, -fv); if (fb) Craft.add('bag', id, -fb); return { vault: fv, pack: fb }; }
  const fmt = (n) => (n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M' : n >= 1e4 ? Math.round(n / 1000) + 'k' : n >= 100 ? String(Math.round(n)) : n.toFixed(1).replace(/\.0$/, ''));
  // ---- where she may talk to him: on the platform top (the anvil mountain), nowhere else
  function onAnvil(x, y) { if (typeof FORGE === 'undefined' || !FORGE.M || !FORGE.M.built) return false; const [X, Y] = FORGE.loc(x, y); if (FORGE.platD(X, Y) > 0) return false;
    const h = typeof M3 !== 'undefined' && M3.heightAt ? (M3.heightAt(x, y)[0] - FORGE.HB) / FORGE.U : FORGE.L.plat[3]; return h > FORGE.L.plat[3] - 6; }
  // ---- the pick: his projected silhouette box (head to feet, ~0.45 of his height wide)
  function hit(sx, sy) { const M = typeof FORGE !== 'undefined' && FORGE.M; if (!M || !M.built || !M.ape || !M.ape.visible || typeof M3 === 'undefined' || !M3.camera) return false;
    for (let q = M.ape; q; q = q.parent) if (!q.visible) return false;
    const el = M3.renderer && M3.renderer.domElement, w = el ? el.clientWidth : innerWidth, h = el ? el.clientHeight : innerHeight, rc = new THREE.Raycaster(); rc.setFromCamera(new THREE.Vector2((sx / w) * 2 - 1, -(sy / h) * 2 + 1), M3.camera);
    // his skinned body in its current pose (the bounds refreshed per tap: he walks 60 m between the lava and the bar); only the body, not the fur shells
    if (M.ape.isSkinnedMesh && M.ape.computeBoundingSphere) { M.ape.computeBoundingSphere(); if (M.ape.computeBoundingBox) M.ape.computeBoundingBox(); }
    const hh = rc.intersectObject(M.ape, false)[0]; if (!hh) return false;
    const g = M3.unproject && M3.unproject(sx, sy); if (g && M3.meshH) { const gd = M3.camera.position.distanceTo(new THREE.Vector3(g[0], M3.meshH(g[0], g[1]), g[1])); if (hh.distance > gd + (typeof Explore !== 'undefined' ? Explore.WS : 1) * 0.5) return false; } // (behind the ground / platform: not on him)
    return true; }
  // a tap on him: on the anvil top -> talk; elsewhere -> a short hint (no marker, no walk)
  function tapAt(pos) { const p = pos || (typeof Explore !== 'undefined' && Explore.here && Explore.here()); if (!p) return 'none'; if (!onAnvil(p[0], p[1])) { if (typeof toast === 'function') toast('Climb the anvil to speak with Theus'); return 'hint'; } open(); return 'open'; }
  function wrapTap() { if (typeof Explore === 'undefined' || !Explore.tap || Explore.tap.__theus) return; const t0 = Explore.tap, f = function (sx, sy, ...r) { if (Explore.on && !(ST.el && !ST.el.classList.contains('hidden')) && hit(sx, sy)) { tapAt(); return true; } return t0.call(this, sx, sy, ...r); }; f.__theus = true; for (const k in t0) if (k.startsWith('__')) f[k] = t0[k]; Explore.tap = f; }
  if (typeof window !== 'undefined') setInterval(wrapTap, 1000);
  // ---- styles: Mosby's field-kit bar and card, Theus's own ids
  const CSS = `#thDlg{position:absolute;left:50%;bottom:calc(env(safe-area-inset-bottom) + 92px);transform:translateX(-50%);width:min(540px,calc(100% - 16px));z-index:61;font:16px Georgia,"Iowan Old Style",serif;color:#33200f;filter:drop-shadow(0 6px 10px rgba(0,0,0,.45))}
#thDlg.hidden,#thUp.hidden{display:none}#thDlg .tBar{position:relative;margin-top:54px;border:18px solid transparent;border-image:url(assets/ui/kit_leather.webp) 62 fill / 18px stretch;border-radius:10px;box-shadow:0 0 0 3px #4f5a2e}
#thDlg .tBar:before,#thDlg .tBar:after,#thDlg .tC1,#thDlg .tC2,#thUp .uBox:before,#thUp .uBox:after,#thUp .uC1,#thUp .uC2{content:'';position:absolute;width:22px;height:22px;border:5px solid #c99a45;filter:drop-shadow(0 1px 1px rgba(0,0,0,.5))}
#thDlg .tBar:before,#thUp .uBox:before{left:-14px;top:-14px;border-right:0;border-bottom:0;border-radius:6px 0 0 0}#thDlg .tBar:after,#thUp .uBox:after{right:-14px;top:-14px;border-left:0;border-bottom:0;border-radius:0 6px 0 0}
#thDlg .tC1,#thUp .uC1{left:-14px;bottom:-14px;border-right:0;border-top:0;border-radius:0 0 0 6px}#thDlg .tC2,#thUp .uC2{right:-14px;bottom:-14px;border-left:0;border-top:0;border-radius:0 0 6px 0}
#thDlg .tWell{position:relative;min-height:80px;padding:12px 44px 12px 96px;border-radius:8px;background:linear-gradient(#f8ecd0,#ecd9b0);box-shadow:inset 0 2px 5px rgba(90,50,20,.35);outline:1.5px dashed rgba(140,96,48,.7);outline-offset:-6px}
#thDlg .tWell p{margin:0;line-height:1.38;min-height:44px}#thDlg .tName{position:absolute;left:104px;top:-36px;padding:3px 14px;border-radius:8px;background:linear-gradient(#e7c27a,#b9863e);color:#3a2412;font:700 14px Georgia,serif;box-shadow:0 0 0 2px #6e4a1c,0 2px 4px rgba(0,0,0,.4)}
#thDlg .tPort{position:absolute;left:-6px;top:-4px;width:100px;height:100px;border-radius:50%;z-index:2;background:#f6efe0 center/cover no-repeat}
#thDlg .tPip{position:absolute;right:10px;bottom:10px;width:24px;height:24px;border-radius:50%;background:radial-gradient(circle at 50% 40%,#e6bb68,#9a6a2a);box-shadow:0 0 0 2px #6e4a1c;animation:thBob 1s ease-in-out infinite}
#thDlg .tPip:after{content:'';position:absolute;left:7px;top:6px;width:7px;height:7px;border-right:2.5px solid #3a2412;border-bottom:2.5px solid #3a2412;transform:rotate(45deg)}@keyframes thBob{50%{transform:translateY(3px)}}
#thDlg .tBtns{display:flex;flex-wrap:wrap;gap:12px 14px;justify-content:center;margin:14px 6px 4px}#thDlg .tBtns:empty{display:none}#thDlg .tBtns .thQ{flex:1 1 0;min-width:0;max-width:200px}
@media (max-width:520px){#thDlg .tBtns.n3{flex-direction:column;align-items:center;gap:10px}#thDlg .tBtns.n3 .thQ{flex:none;width:min(100%,280px);max-width:none}#thDlg .tWell{padding-right:40px}}
.thQ{box-sizing:border-box;min-width:78px;min-height:44px;padding:6px 14px;border-radius:24px;border:0;font:700 15px/1.15 Georgia,serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer;box-shadow:0 0 0 3px #b07a34,0 0 0 5px #6e4a1c,0 3px 5px rgba(0,0,0,.45),inset 0 2px 3px rgba(255,255,255,.35)}
.thQ.blue{background:radial-gradient(120% 95% at 50% 22%,#5d8ec4,#2e5f96 55%,#1c3d66);color:#f4f0dc}.thQ.cream{background:radial-gradient(120% 95% at 50% 22%,#fff6e0,#ecd9b0 60%,#cdb486);color:#3a2412}
.thB{box-sizing:border-box;min-height:44px;padding:6px 18px;border-radius:24px;border:0;font:700 16px/1.15 Georgia,serif;cursor:pointer;color:#3a2412;background:radial-gradient(120% 95% at 50% 22%,#f6d88e,#c99a45 55%,#8a5e24);box-shadow:0 0 0 3px #b07a34,0 0 0 5px #6e4a1c,0 3px 5px rgba(0,0,0,.45),inset 0 2px 3px rgba(255,255,255,.45)}.thB[disabled]{filter:grayscale(.7);opacity:.5;cursor:default}
#thUp{position:absolute;inset:0;z-index:62;display:flex;align-items:center;justify-content:center;background:rgba(10,8,6,.4);font:16px Georgia,serif;color:#33200f}
#thUp .uBox{position:relative;box-sizing:border-box;width:min(640px,calc(100% - 24px));max-height:calc(100% - 24px);overflow:auto;padding:10px 12px 12px;border:18px solid transparent;border-image:url(assets/ui/kit_leather.webp) 62 fill / 18px stretch;border-radius:12px;box-shadow:0 0 0 3px #4f5a2e,0 10px 24px rgba(0,0,0,.5)}
#thUp h3{margin:0 0 8px;text-align:center;font:700 24px Georgia,serif;color:#f6e7c4;text-shadow:0 1px 2px #000}#thUp .uX{position:absolute;right:2px;top:0;width:36px;height:36px;border-radius:50%;border:0;font:700 18px Georgia,serif;color:#3a2412;background:radial-gradient(circle at 50% 40%,#f2d28a,#b5813a);box-shadow:0 0 0 2px #6e4a1c;cursor:pointer}
#thUp .uParch{border-radius:10px;padding:12px;background:linear-gradient(#f8ecd0,#ecd9b0);box-shadow:inset 0 2px 6px rgba(90,50,20,.35);outline:1.5px dashed rgba(140,96,48,.7);outline-offset:-6px}
#thUp .uSay{display:flex;align-items:center;gap:10px;margin:0 0 10px;padding:4px 10px 4px 4px;border-radius:30px;background:rgba(120,80,30,.12);font-style:italic;min-height:52px}#thUp .uSay i{flex:none;width:52px;height:52px;border-radius:50%;background:center/cover no-repeat}
#thUp .uMain{display:flex;gap:12px}#thUp .uList{flex:0 0 42%;display:flex;flex-direction:column;gap:6px;max-height:330px;overflow:auto;padding:2px}
#thUp .uK{display:flex;align-items:center;gap:8px;min-height:44px;padding:4px 8px;border:0;border-radius:9px;background:rgba(255,248,230,.7);box-shadow:inset 0 0 0 1.5px rgba(140,96,48,.55);font:15px Georgia,serif;color:#33200f;text-align:left;cursor:pointer}#thUp .uK.on{background:#fff4d6;box-shadow:inset 0 0 0 2.5px #b07a34,0 1px 3px rgba(0,0,0,.25)}
#thUp .uK .cxsv,#thUp .uK img,#thUp .uK svg{position:static;inset:auto;transform:none;margin:0;width:30px;height:30px;flex:none}#thUp .uK span{flex:1;min-width:0;white-space:normal;line-height:1.12;overflow-wrap:break-word}#thUp .uNote{display:block;font-size:12px;color:#6a4520;font-style:italic}
.thBadge{flex:none;min-width:30px;padding:2px 6px;border-radius:7px;text-align:center;font:700 13px Georgia,serif;color:#3a2412;background:linear-gradient(#f2d28a,#b9863e);box-shadow:0 0 0 1.5px #6e4a1c,inset 0 1px 1px rgba(255,255,255,.5)}.thBadge.max{background:linear-gradient(#ffe7a3,#e0a640);color:#5a1a08}
#thUp .uDet{flex:1;min-width:0;display:flex;flex-direction:column;gap:6px}#thUp .uHead{display:flex;align-items:center;gap:10px}#thUp .uIco{position:relative;width:72px;height:72px;flex:none;border-radius:12px;background:radial-gradient(circle,#fff8e6,#e7cf9e);box-shadow:0 0 0 2px #b07a34,inset 0 2px 4px rgba(90,50,20,.3)}
#thUp .uIco .cxsv,#thUp .uIco img,#thUp .uIco svg{position:static;inset:auto;transform:none;width:64px;height:64px;margin:4px}#thUp .uNm{font:700 19px Georgia,serif}#thUp .uCur{font-size:14px;color:#6a4520}
#thUp .uSplit{font-size:11px;font-weight:600;opacity:.72;white-space:nowrap}#thUp .uRow{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:5px 10px;border-radius:8px;background:rgba(255,250,236,.75);box-shadow:inset 0 0 0 1px rgba(140,96,48,.35);font-size:15px}#thUp .uRow b{font-weight:700}#thUp .short{color:#b22a14}#thUp .uMast{text-align:center;padding:14px 8px;font:700 24px Georgia,serif;color:#8a5a14;text-shadow:0 1px 0 #fff3cc}
#thUp .uGo{align-self:center;margin-top:4px;min-width:170px}#thUp .uPips{display:flex;gap:6px;justify-content:center;margin-top:12px}#thUp .uPips i{width:22px;height:22px;border-radius:50%;background:radial-gradient(circle at 50% 35%,#7a6650,#4a3a2a);box-shadow:0 0 0 2px #6e4a1c,inset 0 1px 2px rgba(0,0,0,.5)}
#thUp .uPips i.on{background:radial-gradient(circle at 50% 35%,#ffe7a3,#d6992e 60%,#8a5a14);box-shadow:0 0 0 2px #6e4a1c,0 0 6px rgba(255,190,80,.8)}
#thUp .uFx{position:absolute;inset:0;pointer-events:none}#thUp .uFx .hm{position:absolute;right:-6px;top:-22px;font-size:34px;transform-origin:80% 80%;animation:thHam .5s ease-in 2}#thUp .uFx .sp{position:absolute;left:50%;top:50%;width:6px;height:6px;border-radius:50%;background:#ffd24a;box-shadow:0 0 6px #ff8a1a;animation:thSp .7s ease-out forwards}
#thUp .uIco .cxtb{left:auto;right:-6px;top:-6px;font-size:13px}
.cxtb{position:absolute;left:1px;top:1px;z-index:2;min-width:18px;padding:0 4px;border-radius:6px;font:700 11px/16px Georgia,serif;text-align:center;color:#3a2412;background:linear-gradient(#f6d88e,#b9863e);box-shadow:0 0 0 1.5px #6e4a1c,0 1px 2px rgba(0,0,0,.4);pointer-events:none}
.cxmh{position:relative}.cxmh>.cxtb{left:2px;top:2px}.cxtw{position:relative;display:inline-block;flex:none}.cxtw .cxtb{left:-4px;top:-6px}
.cxdanger{margin:8px 0;padding:10px 12px;border-radius:10px;background:#fbe3dc;border:2px solid #b22a14;box-shadow:0 2px 6px rgba(120,20,10,.25);color:#5a1208}.cxdanger b{display:block;font-size:16px;color:#8e1a0a}.cxdanger p{margin:4px 0 8px;font-weight:700;color:#b22a14}.cxdanger .cxdng{background:linear-gradient(#e2785a,#a8442c);color:#fff;border-color:#702a18}
.thTI{display:inline-block;width:22px;height:22px;vertical-align:-5px;margin-right:6px}.thTI .cxsv,.thTI svg{position:static;inset:auto;transform:none;width:22px;height:22px;margin:0}
.thEx .thExRow{display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(127,127,127,.25)}.thEx .thExN{flex:1;min-width:0;display:flex;flex-direction:column;line-height:1.2}.thEx .thExN small{opacity:.75}.thExI{width:34px;height:34px}.thExI .cxsv,.thExI svg{position:static;inset:auto;transform:none;width:34px;height:34px;margin:0}.thExI .cxtb{left:-5px;top:-5px}
.thExMsg{margin:8px 0;padding:8px 10px;border-radius:9px;font-weight:700;font-size:14px}.thExMsg.bad{background:#fbe3dc;border:2px solid #b22a14;color:#8e1a0a}.thExMsg.good{background:#e3f1d8;border:2px solid #5b7a32;color:#2f4a12}
@keyframes thHam{0%{transform:rotate(-55deg)}70%{transform:rotate(18deg)}100%{transform:rotate(0)}}@keyframes thSp{0%{transform:translate(-50%,-50%) scale(1);opacity:1}100%{transform:translate(calc(-50% + var(--dx)),calc(-50% + var(--dy))) scale(.3);opacity:0}}
@media (max-width:520px){#thUp .uBox{padding:6px 6px 8px;border-width:14px}#thUp h3{font-size:21px;margin-bottom:6px}#thUp .uParch{padding:9px}#thUp .uSay{font-size:14px;min-height:44px}#thUp .uSay i{width:44px;height:44px}#thUp .uMain{flex-direction:column;gap:8px}#thUp .uList{flex:none;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:5px;max-height:none}#thUp .uK{min-width:0;min-height:40px;padding:3px 6px;gap:5px;font-size:13px}#thUp .uK .cxsv{width:24px;height:24px}#thUp .uK span{font-size:12.5px}#thUp .uRow{font-size:14px;padding:4px 9px}#thUp .uPips{gap:5px}#thUp .uPips i{width:20px;height:20px}}`;
  if (typeof document !== 'undefined') { const st = document.createElement('style'); st.id = 'theusCss'; st.textContent = CSS; (document.head || document.documentElement).appendChild(st); } // (at load: the tier badge and the sell warning live on the backpack / vault / sell screens too)
  const face = (f) => `url(assets/ui/theus/${f}.webp)`;
  function el() { if (ST.el) return ST.el; const d = document.createElement('div'); d.id = 'thDlg'; d.className = 'hidden'; d.setAttribute('role', 'dialog');
    d.innerHTML = '<div class="tPort"></div><div class="tBar"><span class="tC1"></span><span class="tC2"></span><div class="tName">Theus</div><div class="tWell"><p></p><i class="tPip"></i></div><div class="tBtns"></div></div>';
    for (const e of ['pointerdown', 'pointerup', 'touchstart']) d.addEventListener(e, (ev) => ev.stopPropagation()); d.addEventListener('click', (e) => { e.stopPropagation(); const b = e.target.closest('button'); if (b) return act(b.dataset.a); if (ST.step && ST.step.next) go(ST.step.next); });
    (document.getElementById('cityWrap') || document.body).appendChild(d); return (ST.el = d); }
  // the talk: gruff, warm, short; idle by default, talking mid-line, pleased on an accepted deal
  const STEPS = {
    // the first meeting (Dominic): only until the gift; tap to continue; closing early restarts it next time, the gift happens once (S.theusMet, saved at the grant)
    first1: { face: 'idle', say: 'Well now! A little miner on my anvil. Careful, that bar is still cherry-red.', next: 'first2' },
    first2: { face: 'talking', say: "Don't mind the singed eyebrows. I have loved fire since I was a wee infant, no bigger than your backpack.", next: 'first3' },
    first3: { face: 'pleased', say: 'My mother found me nose-first in the coals, grinning. Burnt my fingers more times than I can count, and I never once stopped reaching.', next: 'first4' },
    first4: { face: 'talking', say: 'Now I keep the fire of the deep, and it keeps my hammer honest. Here is how it works with me.', next: 'first5' },
    first5: { face: 'talking', say: 'Bring me pickaxes of one kind and I fold them into one. Every tier, half again the bite.', next: 'first6' },
    first6: { face: 'idle', say: 'Mind this, though. I fold only one of each kind. Sell it, and that one starts over from nothing.', next: 'first7' },
    first7: { face: 'pleased', say: 'Here, take this. Every miner starts somewhere. Bronze bites soft, but it bites.', next: '@gift' },
    hello: { face: 'idle', say: 'Up on my anvil, are you? Mind the bar \u2014 it bites.', next: 'menu' },
    menu: { face: 'talking', say: 'The fire is hot and my hammer is idle. What do you want, little miner?', btn: [['Upgrade pickaxe', 'upgrade', 'blue'], ['Who are you?', 'who', 'cream'], ['Goodbye', 'bye', 'cream']] },
    who: { face: 'talking', say: 'Theus. The old songs say Prometheus \u2014 I carried fire up out of the deep, and I kept it.', next: 'who2' },
    who2: { face: 'idle', say: 'Bring me pickaxes of one kind and I fold them into one. Every tier, half again the bite. I fold only one of each kind: sell it, and that one starts over from nothing.', next: 'menu' },
    deal: { face: 'pleased', say: 'Good. Show me what you have brought.', next: '@up' },
    bye: { face: 'idle', say: 'Go on, then. The forge will still be burning.', end: true } };
  function go(id) { if (id === '@gift') { gift(); return go('menu'); } if (id === '@up') return openUp(); if (id === '@close') return close(); const s = STEPS[id]; if (!s) return close(); ST.step = Object.assign({ id }, s); const d = el(); d.classList.remove('hidden'); d.querySelector('.tPort').style.backgroundImage = face(s.face); d.querySelector('.tWell p').textContent = s.say;
    d.querySelector('.tPip').style.display = s.next || s.end ? '' : 'none'; const bt = d.querySelector('.tBtns'); bt.className = 'tBtns n' + (s.btn || []).length; bt.innerHTML = (s.btn || []).map(([t, a, c]) => `<button class="thQ ${c}" data-a="${a}">${t}</button>`).join(''); if (s.end) ST.step.next = '@close'; return ST.step; }
  function act(a) { if (a === 'upgrade') return go('deal'); return go(a); }
  function open() { if (ST.up && !ST.up.classList.contains('hidden')) return true; if (typeof S !== 'undefined' && S && S.theusMet && S.theusGiftDue) gift(); go(typeof S !== 'undefined' && S && !S.theusMet ? 'first1' : 'hello'); return true; }
  // his welcome gift: one plain Bronze Pickaxe to the backpack, once per save; theusMet is saved right here. Backpack full: the gift stays pending (S.theusGiftDue) and is offered again next talk
  function gift() { if (typeof S === 'undefined' || !S || (S.theusMet && !S.theusGiftDue)) return false; S.theusMet = true; const id = 'tool:pick_bronze';
    if (!Craft.add('bag', id, 1)) { S.theusGiftDue = 1; if (typeof save === 'function') save(); if (typeof toast === 'function') toast(Craft.FULL + ': Theus keeps the Bronze Pickaxe for you. Free a slot and talk to him again.'); return false; } /* (Dominic: never to the vault; it stays pending) */
    S.theusGiftDue = 0; if (typeof save === 'function') save();
    if (typeof toast === 'function') { toast('Received: Bronze Pickaxe'); const t = document.querySelector('#toasts .toast:last-child'); if (t) t.insertAdjacentHTML('afterbegin', `<span class="thTI">${ico('bronze')}</span>`); } return true; }
  function close() { if (ST.el) ST.el.classList.add('hidden'); ST.step = null; }
  // ---- the upgrade card
  const KINDS = () => (typeof Skills !== 'undefined' && Skills.PICK_KINDS) || ['bronze', 'iron', 'steel', 'gold', 'mithril', 'rune', 'lumen', 'onyx'];
  const tierOf = (k) => Skills.pickUpgTier(k);
  const bestOre = (k) => Skills.oreReachBest(k); // the best ore that pickaxe can reach (its grade + one above)
  const oreH = (k, t) => { const id = bestOre(k); return Skills.characterOrePerHour(id, KINDS().indexOf(k), Skills.level('mining'), { upg: Skills.tierMult(t) }); };
  // the upgrade itself: consume the pickaxes, raise the tier, save
  // the upgrade (Dominic: the tier lives on the item): the first one turns one plain pickaxe into the kind's single tiered pickaxe (T1) and consumes the T1 cost too;
  // later ones raise that item's tier. Payment is always plain pickaxes of the same kind (the tiered one is its own item and is never taken).
  const need = (k, t) => Skills.pickUpgCost(t + 1) + (t === 0 ? 1 : 0);
  // owned for an upgrade: the spare plain pickaxes, plus the one in her hand only for the first upgrade (T0 -> T1), where it is the one being upgraded (it becomes the tiered one, still in her hand)
  const upOwned = (k, t) => owned(k) + (t === 0 ? inHand(k) : 0);
  function upgrade(k) { const t = tierOf(k); if (t >= Skills.PICK_TIER_MAX) return { ok: false, why: 'max' }; const n = need(k, t), T = Craft.TPICK(k), hand = t === 0 && owned(k) < n && inHand(k) ? 1 : 0; if (upOwned(k, t) < n) return { ok: false, why: 'short', need: n, have: upOwned(k, t) };
    const dest = t > 0 || hand ? null : Craft.fits('bag', T) ? 'bag' : ''; if (dest === '') { if (typeof toast === 'function') toast(Craft.FULL); return { ok: false, why: 'full' }; } /* (Dominic: into the backpack only, never the vault) */
    const paid = pay(k, n - hand); if (!paid) return { ok: false, why: 'short', need: n, have: upOwned(k, t) }; S.tpicks = S.tpicks || {};
    if (hand) { const W = Craft.worn(); W.pick = T; S.pickGrade = k; S.pickEqT = k; paid.hand = 1; }
    if (dest) Craft.add(dest, T, 1); /* (Dominic: into the backpack, not equipped) */ S.tpicks[k] = t + 1; if (S.pickGrade === k && S.pickEqT === k && typeof CharView !== 'undefined' && CharView.setPick) try { CharView.setPick(k); } catch (e) {} /* (Ember Onyx: the flames in her hand take the new tier's colour) */ if (typeof save === 'function') save(); return { ok: true, tier: t + 1, cost: n, made: dest || null, paid }; }
  const LINES = ['Ha! Feel the weight of that.', 'Folded and true. It will bite deeper now.', 'Half again the bite. Go and use it.', 'The fire liked those.', 'Good iron sings. Hear it?'];
  function upHTML() { const ks = KINDS(); if (!ST.sel || !ks.includes(ST.sel)) ST.sel = (typeof S !== 'undefined' && ks.includes(S.pickGrade)) ? S.pickGrade : ks.find((k) => have(k) > 0) || ks[0]; const k = ST.sel, t = tierOf(k), max = t >= Skills.PICK_TIER_MAX, c = max ? 0 : need(k, t), h = upOwned(k, t), sp = split(k), short = !max && h < c, ore = bestOre(k), oreNm = Skills.oreName(ore);
    const list = ks.map((q) => { const tq = tierOf(q); return `<button class="uK${q === k ? ' on' : ''}" data-k="${q}">${ico(q, tq)}<span>${NAME(q)}</span><b class="thBadge${tq >= Skills.PICK_TIER_MAX ? ' max' : ''}">T${tq}</b></button>`; }).join('');
    const say = ST.flash ? ST.flash : max ? 'That one is finished. Nothing left in it to fold.' : short ? `Bring me more ${NAME(k)}s. ${c} of them, all the same kind.` : t === 0 ? `${c} of those. One I fold into yours for good, the rest feed it.` : `${c} of those and I will make it bite half again as hard.`;
    const det = max ? `<div class="uMast">Mastered</div><div class="uRow"><span>Multiplier</span><b>${Skills.multLabel(Skills.tierMult(t))}</b></div><div class="uRow"><span>Ore/h (${oreNm})</span><b>${fmt(oreH(k, t))}</b></div>`
      : `<div class="uRow"><span>Next tier</span><b>T${t + 1} \u00b7 ${Skills.multLabel(Skills.tierMult(t))} \u2192 ${Skills.multLabel(Skills.tierMult(t + 1))}</b></div><div class="uRow"><span>Requires ${fmt(c)} x ${NAME(k)}${t === 0 ? '<small class="uNote">One becomes your T1 pickaxe.</small>' : ''}</span></div><div class="uRow"><span>Owned / required</span><b class="${short ? 'short' : ''}" data-v="own">${fmt(h)}${sp.vault && sp.pack ? ` <small class="uSplit">(vault ${fmt(sp.vault)} \u00b7 pack ${fmt(sp.pack)})</small>` : sp.vault ? ' <small class="uSplit">(vault)</small>' : ''} / ${fmt(c)}</b></div>
        <div class="uRow"><span>Ore/h (${oreNm})</span><b>${fmt(oreH(k, t))} \u2192 ${fmt(oreH(k, t + 1))}</b></div><button class="thB uGo" data-a="go"${short ? ' disabled' : ''}>Upgrade</button>`;
    return `<div class="uBox"><span class="uC1"></span><span class="uC2"></span><h3>Theus's Forge</h3><button class="uX" data-a="x" aria-label="Close">\u2715</button><div class="uParch"><div class="uSay"><i style="background-image:${face(ST.flash ? 'pleased' : 'talking')}"></i><span>${say}</span></div>
      <div class="uMain"><div class="uList">${list}</div><div class="uDet"><div class="uHead"><div class="uIco">${ico(k, t)}${t > 0 ? `<b class="cxtb">T${t}</b>` : ''}<div class="uFx"></div></div><div><div class="uNm">${NAME(k)}</div><div class="uCur">${t > 0 ? `Tier ${t} \u00b7 ${Skills.multLabel(Skills.tierMult(t))} \u00b7 ${S.pickEqT === k && S.pickGrade === k ? 'equipped' : 'not equipped'}` : 'No tiered pickaxe yet \u00b7 T0'}<br>${fmt(h)} plain owned${inHand(k) ? ' \u00b7 +1 in hand (kept)' : ''}</div></div></div>${det}</div></div>
      <div class="uPips">${Array.from({ length: Skills.PICK_TIER_MAX }, (_, i) => `<i class="${i < t ? 'on' : ''}"></i>`).join('')}</div></div></div>`; }
  function render() { const u = ST.up; if (!u) return; u.innerHTML = upHTML(); }
  function fx() { const f = ST.up && ST.up.querySelector('.uFx'); if (!f) return; let h = '<span class="hm">\u{1F528}</span>'; for (let i = 0; i < 14; i++) { const a = (i / 14) * 6.283 + Math.random() * 0.3, r = 34 + Math.random() * 26; h += `<i class="sp" style="--dx:${(Math.cos(a) * r).toFixed(0)}px;--dy:${(Math.sin(a) * r).toFixed(0)}px;animation-delay:${(0.45 + Math.random() * 0.1).toFixed(2)}s"></i>`; } f.innerHTML = h; }
  function upAct(a, k) { if (k) { ST.sel = k; ST.flash = null; return render(); } if (a === 'x') return closeUp(); if (a === 'go') { const r = upgrade(ST.sel); if (r.ok) { ST.flash = LINES[(r.tier - 1) % LINES.length]; render(); fx(); } return r; } }
  function openUp(k) { close(); if (!ST.up) { el(); const u = document.createElement('div'); u.id = 'thUp'; u.className = 'hidden'; (document.getElementById('cityWrap') || document.body).appendChild(u); for (const e of ['pointerdown', 'pointerup', 'touchstart']) u.addEventListener(e, (ev) => ev.stopPropagation());
      u.addEventListener('click', (e) => { e.stopPropagation(); const b = e.target.closest('button'); if (!b) { if (e.target === u) closeUp(); return; } upAct(b.dataset.a, b.dataset.k); }); ST.up = u; }
    if (k) ST.sel = k; ST.flash = null; render(); ST.up.classList.remove('hidden'); return ST.up; }
  function closeUp() { if (ST.up) ST.up.classList.add('hidden'); ST.flash = null; }

  // ---- the Ledgeville Exchange (Dominic): tiered pickaxes trade only between players, at the seller's price; never with the shop. Listing hands the item over
  //      (its tier goes with it; held until cancelled, like the other player listings); buying brings the item with its tier; one tiered pickaxe per kind.
  const XS = { msg: null, conf: null };
  const lum = () => Craft.gold(), CO = () => Craft.COIN, n0 = (v) => Math.round(v).toLocaleString('en-US');
  const ownMsg = (k) => `You already have a tiered ${NAME(k)}. You can only hold one of each kind.`;
  function exState() { const E = S.tpEx || (S.tpEx = { ai: null, mine: [], next: 1, gold: 1 }); if (!E.gold) { E.gold = 1; for (const o of [...(E.ai || []), ...(E.mine || [])]) o.price = Math.round(o.price * Craft.COIN_RATE); } /* (old Lumen prices -> gold, x10) */ if (!E.ai) { const AI = (typeof W !== 'undefined' && W.homes ? W.homes.filter((h) => !h.isPlayer) : []), who = (i) => (AI.length ? AI[(i * 7 + 3) % AI.length].owner : ['Brannoc', 'Ysolde', 'Tamsin', 'Orrin', 'Mabry'][i]);
      const plain = (k) => (typeof Craft !== 'undefined' ? Craft.sellP('tool:pick_' + k) : 10);
      E.ai = [['bronze', 3], ['iron', 2], ['steel', 4], ['gold', 2], ['mithril', 1]].map(([k, t], i) => ({ id: 'ai' + (i + 1), k, tier: t, seller: who(i), price: Math.max(10, Math.round(plain(k) * (1 + 20 * (Math.pow(2, t) - 1)) * (0.55 + 0.1 * i) / 10) * 10) })); } return E; }
  const slotFor = (id) => (Craft.fits('bag', id) ? 'bag' : null); // (Dominic: the backpack only; full -> blocked)
  function give(k, tier) { const id = Craft.TPICK(k), w = slotFor(id); if (!w) return false; Craft.add(w, id, 1); S.tpicks = S.tpicks || {}; S.tpicks[k] = tier; return w; }
  const icoT = (k, t) => `<span class="cxtw thExI">${ico(k, t)}<b class="cxtb">T${t}</b></span>`;
  function exHTML() { if (typeof S === 'undefined' || !S) return ''; const E = exState(), mine = KINDS().filter((k) => Craft.have(Craft.TPICK(k)) > 0), c = XS.conf;
    let h = `<div class="thEx" id="thEx"><h3 style="margin:12px 0 2px">\u26cf\ufe0f Tiered pickaxes</h3><div class="dim small">Traded only between players, at the seller's price. The shop never buys or sells them. You can hold one tiered pickaxe of each kind.</div>`;
    if (XS.msg) h += `<div class="thExMsg ${XS.msg[0]}" role="status">${XS.msg[1]}</div>`;
    h += E.ai.map((o) => `<div class="thExRow">${icoT(o.k, o.tier)}<span class="thExN"><b>${NAME(o.k)} (T${o.tier})</b><small>${o.seller} \u00b7 ${Skills.multLabel(Skills.tierMult(o.tier))} mining</small></span><button class="btn small" data-act="extbuy" data-id="${o.id}">Buy ${n0(o.price)}${CO()}</button></div>`).join('') || '<div class="dim small">No tiered pickaxes listed right now.</div>';
    h += `<h4 style="margin:10px 0 4px">List yours</h4>`;
    if (mine.length) { const sel = c ? c.k : mine[0], sug = (k) => Math.round(Craft.sellP('tool:pick_' + k) * (1 + 20 * (Math.pow(2, Craft.pickTier(k)) - 1)) * 0.6);
      h += `<div class="wrapgap thExList"><select id="thExK" aria-label="Tiered pickaxe">${mine.map((k) => `<option value="${k}"${k === sel ? ' selected' : ''}>${NAME(k)} (T${Craft.pickTier(k)})</option>`).join('')}</select><input id="thExP" type="number" min="1" step="1" value="${c ? c.price : sug(sel)}" style="width:92px" aria-label="Price in gold">${CO()} <button class="btn" data-act="extlist">List</button></div>`;
      if (c && Craft.have(Craft.TPICK(c.k)) > 0) h += `<div class="cxdanger" role="alertdialog"><b>\u26a0\ufe0f List ${NAME(c.k)} (T${Craft.pickTier(c.k)}) for ${n0(c.price)}${CO()}?</b><p>This will lose Tier ${Craft.pickTier(c.k)}. You'll start over at Tier 1.</p><div class="wrapgap"><button class="btn cxdng" data-act="extlistok">List it</button><button class="btn ghost" data-act="extlistno">Keep it</button></div></div>`;
    } else h += '<div class="dim small">You have no tiered pickaxe to list. Theus at the forge makes them.</div>';
    if (E.mine.length) h += `<h4 style="margin:10px 0 4px">Your tiered listings</h4>` + E.mine.map((m) => `<div class="thExRow">${icoT(m.k, m.tier)}<span class="thExN"><b>${NAME(m.k)} (T${m.tier})</b><small>${n0(m.price)}${CO()} \u00b7 waiting for a buyer</small></span><button class="btn ghost small" data-act="extcancel" data-id="${m.id}">Cancel</button></div>`).join('') + '<div class="dim small">Buyers for player listings are coming soon; cancelling returns the pickaxe with its tier.</div>';
    return h + '</div>'; }
  function exAct(act, ds) { const E = exState(); XS.msg = null;
    if (act === 'extbuy') { const o = E.ai.find((q) => q.id === ds.id); if (!o) return false; if (Craft.have(Craft.TPICK(o.k)) > 0) { XS.msg = ['bad', ownMsg(o.k)]; toast(ownMsg(o.k)); return false; }
      if (lum() < o.price) { XS.msg = ['bad', 'Not enough gold.']; return false; } if (!slotFor(Craft.TPICK(o.k))) { XS.msg = ['bad', Craft.FULL + '.']; toast(Craft.FULL); return false; }
      S.gold = lum() - o.price; give(o.k, o.tier); E.ai = E.ai.filter((q) => q !== o); XS.msg = ['good', `Bought ${NAME(o.k)} (T${o.tier}) from ${o.seller}.`]; toast(`\u2696\ufe0f Bought ${NAME(o.k)} (T${o.tier}) from ${o.seller} for ${n0(o.price)} gold`); if (typeof save === 'function') save(); return true; }
    if (act === 'extlist') { const ke = document.getElementById('thExK'), pe = document.getElementById('thExP'), k = ke && ke.value, pr = Math.floor(+(pe && pe.value)); if (!k || !(pr >= 1)) { XS.msg = ['bad', 'Set a price in gold.']; return false; } XS.conf = { k, price: pr }; return true; }
    if (act === 'extlistno') { XS.conf = null; return true; }
    if (act === 'extlistok') { const c = XS.conf; XS.conf = null; if (!c || Craft.have(Craft.TPICK(c.k)) <= 0) return false; if (Craft.equipped(Craft.TPICK(c.k))) { XS.msg = ['bad', 'Unequip it first.']; toast('Unequip it first'); return false; } const t = Craft.pickTier(c.k); Craft.take(Craft.TPICK(c.k), 1); if (S.tpicks) delete S.tpicks[c.k]; if (S.pickEqT === c.k) S.pickEqT = null;
      E.mine.push({ id: E.next++, k: c.k, tier: t, price: c.price }); XS.msg = ['good', `Listed ${NAME(c.k)} (T${t}) at ${n0(c.price)}${CO()}.`]; if (typeof save === 'function') save(); return true; }
    if (act === 'extcancel') { const i = E.mine.findIndex((m) => m.id === +ds.id); if (i < 0) return false; const m = E.mine[i]; if (Craft.have(Craft.TPICK(m.k)) > 0) { XS.msg = ['bad', ownMsg(m.k)]; return false; }
      if (!give(m.k, m.tier)) { XS.msg = ['bad', Craft.FULL + '.']; toast(Craft.FULL); return false; } E.mine.splice(i, 1); XS.msg = ['good', `${NAME(m.k)} (T${m.tier}) is back in your pack.`]; if (typeof save === 'function') save(); return true; }
    return false; }
  return { XS, exHTML, exAct, exState, ST, STEPS, gift, onAnvil, hit, tapAt, open, close, go, act, openUp, closeUp, upgrade, upAct, render, NAME, get step() { return ST.step && ST.step.id; } };
})();
if (typeof window !== 'undefined') window.Theus = Theus;
