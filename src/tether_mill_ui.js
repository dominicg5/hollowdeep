/* ---------- Tether Mill: Brannick's dialogue, the mill panel and the rolling queue (Tethercraft; Dominic, Mia's SPEC + mock) ----------
   Ingots go in, braid spools (100 m single strand, tether:<grade>) or Wren's Tethers (tool:tlink_<grade>) come out on a timer. A FIFO queue of up to 5 jobs
   runs while the player is away (credited from S.mill.seen, at most 72 h); ingots are taken when a job is queued and refunded for unfinished spools on cancel;
   Tethercraft XP is paid as each spool finishes (Skills.awardMill). Spool time = base / (1 + 0.005 * max(0, Lv - unlock)), at the level the spool starts.
   Save: S.mill = { intro, jobs: [{ id, tab: 'braid'|'climb', grade, n, done, cur, len }], rack: { itemId: amount }, seen, nid, climb, newG }. */
const MillUI = (() => {
  const GRADES = ['bronze', 'iron', 'steel', 'gold', 'mithril', 'rune', 'lumen', 'onyx'], MAXJ = 5, CAP = 72 * 3600, SPOOL_M = 100;
  const T = (k) => Craft.MILL[k], NM = (k) => (Skills.BAR_NAMES && Skills.BAR_NAMES[k]) || k;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const num = (n) => Math.round(n).toLocaleString('en-US'), fx = (n) => Skills.fmtXp(n);
  const dur = (s) => { s = Math.max(0, Math.round(s)); return s >= 3600 ? `${Math.floor(s / 3600)}h ${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}m` : s >= 60 ? `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s` : `${s}s`; };
  const say = (m) => typeof toast === 'function' && toast(m);

  /* ---- state + queue ---- */
  function st() { if (typeof S === 'undefined' || !S) return null; let m = S.mill; if (!m || typeof m !== 'object') m = S.mill = {};
    if (!Array.isArray(m.jobs)) m.jobs = []; if (!m.rack || typeof m.rack !== 'object') m.rack = {}; if (!(m.seen > 0)) m.seen = Date.now(); if (!(m.nid > 0)) m.nid = 1; if (!m.intro) m.intro = 0; return m; }
  const lv = () => Skills.level('tethercraft');
  const bonus = (k, L) => 1 + 0.005 * Math.max(0, (L == null ? lv() : L) - T(k).u);
  const base = (tab, k) => (tab === 'climb' ? T(k).cs : T(k).s);
  const unitLen = (tab, k, L) => base(tab, k) / bonus(k, L);
  const ingOf = (tab, k) => (tab === 'climb' ? T(k).ci : T(k).ips);
  const xpOf = (tab, k) => (tab === 'climb' ? T(k).cx : T(k).xp);
  const outId = (tab, k) => (tab === 'climb' ? 'tool:tlink_' : 'tether:') + k;
  const unlocked = (k) => lv() >= T(k).u;
  const running = () => { const m = st(); return !!(m && m.jobs.length); };
  // advance the queue by dt seconds; returns the units finished
  function advance(dt) { const m = st(); if (!m) return 0; let done = 0;
    while (dt > 0 && m.jobs.length) { const j = m.jobs[0]; if (!(j.len > 0)) j.len = unitLen(j.tab, j.grade); const left = j.len - (j.cur || 0);
      if (dt < left) { j.cur = (j.cur || 0) + dt; break; }
      dt -= left; j.cur = 0; j.len = 0; j.done++; done++; const id = outId(j.tab, j.grade); m.rack[id] = (m.rack[id] || 0) + (j.tab === 'climb' ? 1 : SPOOL_M);
      const L0 = lv(); Skills.awardMill(j.tab, j.grade, 1); const L1 = lv(); GRADES.forEach((k) => { if (T(k).u > L0 && T(k).u <= L1) m.newG = k; });
      if (j.done >= j.n) m.jobs.shift(); }
    return done; }
  let lastT = 0;
  function tick() { const m = st(); if (!m || typeof Craft === 'undefined' || !Craft.MILL || typeof Skills === 'undefined') return; const now = Date.now(); let dt = (now - m.seen) / 1000; m.seen = now;
    if (!(dt > 0)) return; const capped = dt > CAP; dt = Math.min(dt, CAP); const had = m.jobs.length, n = had ? advance(dt) : 0;
    if (dt > 20 && n > 0) { m.capped = capped && !!m.jobs.length; say(`🪢 The mill rolled ${n} ${n === 1 ? 'spool' : 'spools'} while you were away${capped ? ' (capped at 72 h)' : ''}`); }
    if (typeof MILL !== 'undefined' && MILL.setRate) MILL.setRate(running(), m.jobs[0] ? m.jobs[0].grade : null);
    if (P.on && now - lastT > 450) { lastT = now; drawQueue(); if (n) draw(); }
    if (G.on) drawProgress(); if (typeof Explore !== 'undefined' && Explore.millHud) Explore.millHud(); }
  function queue(tab, k, n) { const m = st(); if (!m || !(n > 0) || !unlocked(k) || tab === 'climb') return false; const need = n * ingOf(tab, k), last = m.jobs[m.jobs.length - 1], join = last && last.tab === tab && last.grade === k;
    if (!join && m.jobs.length >= MAXJ) return false; if (Craft.have('ingot:' + k) < need || !Craft.take('ingot:' + k, need)) return false;
    if (join) last.n += n; else m.jobs.push({ id: m.nid++, tab, grade: k, n, done: 0, cur: 0, len: 0 }); if (typeof save === 'function') save(); return true; }
  function cancel(id) { const m = st(); const i = m ? m.jobs.findIndex((j) => j.id === id) : -1; if (i < 0) return 0; const j = m.jobs[i], back = (j.n - j.done) * ingOf(j.tab, j.grade), ing = 'ingot:' + j.grade;
    m.jobs.splice(i, 1); if (back > 0 && !Craft.add('bag', ing, back)) Craft.add('vault', ing, back); if (typeof save === 'function') save(); return back; }
  function jobLeft(j, L) { const u = unitLen(j.tab, j.grade, L); return (j.len > 0 ? j.len - (j.cur || 0) : u) + (j.n - j.done - 1) * u; }
  function queueLeft() { const m = st(); return m ? m.jobs.reduce((a, j, i) => a + (i ? (j.n - j.done) * unitLen(j.tab, j.grade) : jobLeft(j)), 0) : 0; }
  function rackCount() { const m = st(); if (!m) return 0; let c = 0; for (const id in m.rack) c += id.startsWith('tether:') ? Math.round(m.rack[id] / SPOOL_M) : m.rack[id]; return c; }
  function collect() { const m = st(); if (!m) return 0; let got = 0;
    for (const id of Object.keys(m.rack)) { const n = m.rack[id]; if (!(n > 0)) { delete m.rack[id]; continue; } if (!Craft.add('bag', id, n) && !Craft.add('vault', id, n)) { say('🎒 Backpack is full - free a slot first'); break; }
      delete m.rack[id]; got++; const k = id.split(/[:_]/).pop(); say(id.startsWith('tether:') ? `🪢 +${num(n)} m ${NM(k)} Ledge Tether` : `🔗 +${num(n)} ${NM(k)} Wren's Tether`); }
    if (got && typeof save === 'function') save(); if (!Object.keys(m.rack).length) m.capped = false; return got; }

  /* ---- icons: Art's item atlas (ICONS), the svg glyph as fallback ---- */
  function ico(id, cls) { const i = typeof ICONS !== 'undefined' && ICONS.map ? ICONS.map[id] : null; if (i == null) return `<i class="mlIco mlSv ${cls || ''}">${Craft.svgIco(id)}</i>`;
    return `<i class="mlIco ${cls || ''}" style="--ix:${i % ICONS.cols};--iy:${(i / ICONS.cols) | 0}"></i>`; }

  /* ---- Brannick's dialogue (the town dialogue look: porthole, leather bar, parchment well, page pip, kBtn buttons) ---- */
  const LINES = {
    intro: ["So you're the one hanging lines off the Ledge. Brannick. I keep the hammers, and now I keep this mill.",
      "Feed her ingots, she rolls 'em thin. Every spool's a hundred metres of single strand. A Ledge Tether wants two strands: one to push, one to pull.",
      "Start on Bronze. A line that holds is a line that's honest. Go on, then."],
    idle: ["Wheel's idling and so am I. Bring me ingots.", "Water's free. Ingots aren't. What are we rolling?"],
    run: (n, t) => `She's turning. ${n} spools to go, near enough ${t}.`, rack: "Spools are cooling on the rack. Take 'em before I trip on 'em.",
    cap: "Wheel ran itself dry waiting on you. Rack's full, though.", short: (h, n) => `That's ${h} of ${n}. Mill won't roll air.`,
    newG: (g) => `${g}, eh? Steady hands now. She bites harder.`, climb: "Wren's lines, for the climb. No length to 'em. You wear one.",
    lock: (n) => `Not yet. Come back at Tethercraft ${n}.` };
  const D = { el: null, pages: [], page: 0, on: false, faceT: 0 };
  function dlg() { if (D.el) return D.el; css(); const d = document.createElement('div'); d.id = 'millDlg'; d.className = 'kKit hidden'; d.setAttribute('role', 'dialog');
    d.innerHTML = '<div class="tdPort"></div><div class="tdBar"><span class="tdC1"></span><span class="tdC2"></span><div class="tdName">Brannick<small>Hammer Keeper</small></div><div class="tdWell"><p></p><i class="tdPip"></i><div class="tdBtns"></div></div></div>';
    const port = d.querySelector('.tdPort'); for (let i = 0; i < 8; i++) { const a = (i / 8) * 6.283, b = document.createElement('i'); b.style.left = 44 + Math.cos(a) * 48.5 - 2.5 + 'px'; b.style.top = 44 + Math.sin(a) * 48.5 - 2.5 + 'px'; port.appendChild(b); }
    for (const e of ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'mousedown', 'mouseup']) d.addEventListener(e, (ev) => ev.stopPropagation());
    d.addEventListener('click', (e) => { e.stopPropagation(); const b = e.target.closest('button'); if (b) return act(b.dataset.a); if (D.page < D.pages.length - 1) { D.page++; show(); } });
    (document.getElementById('cityWrap') || document.body).appendChild(d); return (D.el = d); }
  function face(ex) { if (D.el) D.el.querySelector('.tdPort').style.backgroundImage = `url(assets/ui/npc/brannick_${ex}.webp)`; }
  function stateLine() { const m = st(), n = rackCount(); if (m.capped && n) return LINES.cap; if (m.newG) { const g = NM(m.newG); m.newG = null; return LINES.newG(g); }
    if (m.jobs.length) { const left = m.jobs.reduce((a, j) => a + j.n - j.done, 0); return LINES.run(left, dur(queueLeft())); } if (n) return LINES.rack; return LINES.idle[Math.floor(Math.random() * 2)]; }
  function talk() { const m = st(); if (!m) return; tick(); D.pages = m.intro ? [stateLine()] : LINES.intro.slice(); D.page = 0; D.on = true; const d = dlg(); d.classList.remove('hidden'); show(); }
  function show() { const d = D.el, last = D.page >= D.pages.length - 1, n = rackCount(), line = D.pages[D.page]; d.querySelector('.tdWell p').textContent = line; face('talk'); clearTimeout(D.faceT);
    D.faceT = setTimeout(() => D.on && face(/Go on|honest|eh\?/.test(line) ? 'pleased' : 'neutral'), 1400); d.querySelector('.tdPip').style.display = last ? 'none' : '';
    d.querySelector('.tdBtns').innerHTML = last ? '<button class="kBtn kGreen" data-a="open">Open the mill</button>' + (st().intro && n ? `<button class="kBtn kGold" data-a="collect">Collect ${n} ${n === 1 ? 'spool' : 'spools'}</button>` : '') + '<button class="kBtn kCream" data-a="bye">Goodbye</button>' : ''; }
  function close() { if (D.on) { const m = st(); if (m && D.pages.length > 1) m.intro = 1; } D.on = false; if (D.el) D.el.classList.add('hidden'); }
  function act(a) { if (a === 'bye') return close(); if (a === 'collect') { collect(); D.pages = [stateLine()]; D.page = 0; return show(); } if (a === 'open') { close(); open(); } }

  /* ---- the mill panel ---- */
  const P = { on: false, tab: 'braid', grade: null, qty: 1, ask: null };
  function open() { if (!st() || typeof openModal !== 'function') return; tick(); css(); if (!P.grade || !unlocked(P.grade)) P.grade = GRADES.filter(unlocked).pop() || 'bronze'; P.on = true; P.ask = null;
    openModal('<div class="mlP" data-mill></div>', 'mill'); const root = document.querySelector('#modalBody [data-mill]');
    root.addEventListener('click', onClick); draw(); }
  function shut() { P.on = false; if (typeof ui !== 'undefined' && ui.modal === 'mill' && typeof closeModal === 'function') closeModal(); }
  function rootEl() { const r = document.querySelector('#modalBody [data-mill]'); if (!r || typeof ui === 'undefined' || ui.modal !== 'mill') { P.on = false; return null; } return r; }
  function qtyOf(owned, ips) { return P.qty === 'max' ? Math.max(1, Math.floor(owned / ips)) : P.qty; }
  function draw() { const r = rootEl(); if (!r) return; const m = st(), L = lv(), a = Skills.xpToReach(L), b = Skills.xpToReach(L + 1), xp = Skills.xp('tethercraft'), need = Math.max(1, b - a), into = Math.max(0, xp - a), pct = Math.min(100, Math.floor((100 * into) / need));
    const tab = (P.tab = 'braid'), k = P.grade, /* (climbing tethers are no longer rolled; their looks are skins at the Lumen Crystal) */ g = T(k), ips = ingOf(tab, k), owned = Craft.have('ingot:' + k), maxN = Math.floor(owned / ips), q = qtyOf(owned, ips), needI = q * ips, short = Math.max(0, needI - owned), unit = unitLen(tab, k, L), ux = xpOf(tab, k);
    const last = m.jobs[m.jobs.length - 1], full = m.jobs.length >= MAXJ && !(last && last.tab === tab && last.grade === k), cl = tab === 'climb';
    const tiles = GRADES.map((gk) => { const t = T(gk), lock = L < t.u, n = NM(gk); return `<button type="button" class="mlT${lock ? ' lock' : ''}${gk === k ? ' on' : ''}" data-ml="g" data-v="${gk}">${ico(outId(tab, gk), 'mlTI')}`
      + `<b class="${n.length > 8 ? 'sm' : ''}">${esc(n)}</b><small>${lock ? 'Unlock Lv ' + t.u : ingOf(tab, gk) + ' ingots'}</small>${lock ? '<i class="mlLock"></i>' : ''}</button>`; }).join('');
    const qb = [1, 5, 10, 'max'].map((v) => { const n = v === 'max' ? maxN : v, dis = n < 1 || n * ips > owned; return `<button type="button" class="mlQb${P.qty === v ? ' on' : ''}" data-ml="q" data-v="${v}"${dis ? ' disabled' : ''}>${v === 'max' ? 'Max ' + maxN : v}</button>`; }).join('');
    const go = full ? 'Queue full' : short ? `Need ${num(short)} more ingots` : 'Start rolling';
    r.innerHTML = `<i class="mlCap tl"></i><i class="mlCap tr"></i><i class="mlCap bl"></i><i class="mlCap br"></i><div class="mlScroll">`
      + `<div class="mlHead"><div class="mlPort"></div><div class="mlTit"><h2>Tether Mill</h2><small>Brannick · Hammer Keeper</small></div><button type="button" class="mlX" data-ml="x" aria-label="Close"></button></div>`
      + `<div class="mlCard mlLv"><div class="mlMed"><small>LV</small><b>${L}</b></div><div class="mlLvB"><div class="mlRow"><h3>Tethercraft</h3><span class="mlPct">${pct}% to Lv ${L + 1}</span></div>`
      + `<div class="mlBar"><i style="width:${Math.max(3, pct)}%"></i></div><div class="mlRow"><span class="mlXp">${fx(into)} / ${fx(need)} XP</span><span class="mlSpd">Mill speed&nbsp; +${Math.round((bonus(k, L) - 1) * 100)}%</span></div></div></div>`
      + `<div class="mlCard mlMake"><div class="mlLab">GRADE</div><div class="mlGrid">${tiles}</div><hr>`
      + `<div class="mlRec">${ico(outId(tab, k), 'mlRI')}<div><h3>${esc(NM(k))} ${cl ? 'Wren\'s Tether' : 'braid spool'}</h3><p>${cl ? 'equipped climbing line' : SPOOL_M + ' m single strand'}&nbsp; · &nbsp;${cl ? dur(unit) : unit.toFixed(1) + ' s'}&nbsp; · &nbsp;${fx(ux)} XP</p></div></div>`
      + `<div class="mlIng">${ico('ingot:' + k, 'mlII')}<div class="mlIngL"><small>${esc(NM(k))} ingots</small><b>${num(owned)} owned</b></div><div class="mlIngR"><small>NEEDED</small><b class="${short ? 'short' : 'ok'}">${num(needI)}</b></div></div>`
      + `<div class="mlLab">QUANTITY</div><div class="mlQty">${qb}</div>`
      + `<div class="mlSum"><b>${cl ? `${q} × ${esc(NM(k))} Wren's Tether` : `${q} ${q === 1 ? 'spool' : 'spools'}&nbsp; → &nbsp;${num(q * SPOOL_M)} m ${esc(NM(k))} coil`}</b><span>${dur(unit * q)}&nbsp; · &nbsp;+${fx(ux * q)} XP</span></div>`
      + `<button type="button" class="mlGo${full || short ? ' off' : ''}" data-ml="go">${go}</button></div>`
      + `<div class="mlCard mlQ"></div><div class="mlFoot"></div></div>`;
    r.querySelector('.mlPort').style.backgroundImage = 'url(assets/ui/npc/brannick.webp)'; drawQueue(); }
  function drawQueue() { const r = rootEl(); if (!r) return; const box = r.querySelector('.mlQ'), foot = r.querySelector('.mlFoot'); if (!box) return; const m = st(), L = lv();
    let h = `<div class="mlRow mlQh"><span class="mlLab">ROLLING · ${m.jobs.length} of ${MAXJ} slots</span><span class="mlAway">Runs while you're away · 72 h</span></div>`;
    if (!m.jobs.length) h += `<div class="mlEmpty">The wheel's idling. Queue a job above.</div>`;
    m.jobs.forEach((j, i) => { const cl = j.tab === 'climb', nm = esc(NM(j.grade)), ux = xpOf(j.tab, j.grade);
      if (P.ask === j.id) { const back = (j.n - j.done) * ingOf(j.tab, j.grade); h += `<div class="mlJob mlAsk"><span>Cancel and get back ${num(back)} ${nm} ingots?</span><button type="button" class="mlSm red" data-ml="cx" data-v="${j.id}">Cancel job</button><button type="button" class="mlSm" data-ml="keep">Keep</button></div>`; return; }
      if (!i) { const len = j.len > 0 ? j.len : unitLen(j.tab, j.grade, L), f = Math.min(1, (j.cur || 0) / len);
        h += `<div class="mlJob mlAct">${ico(outId(j.tab, j.grade), 'mlJI')}<div class="mlJb"><div class="mlRow"><b>${cl ? `${nm} Wren's Tether&nbsp; · &nbsp;${j.done + 1} of ${j.n}` : `${nm}&nbsp; · &nbsp;spool ${j.done + 1} of ${j.n}`}</b><b>${dur(jobLeft(j, L))} left</b></div>`
          + `<div class="mlBar"><i style="width:${Math.max(2, f * 100).toFixed(1)}%"></i></div><div class="mlRow"><small>${fx(ux)} XP per ${cl ? 'tether' : 'spool'}&nbsp; · &nbsp;${fx(ux * j.n)} XP total</small><button type="button" class="mlDot" data-ml="ask" data-v="${j.id}" aria-label="Job options">⋯</button></div></div></div>`; }
      else h += `<div class="mlJob mlWait">${ico(outId(j.tab, j.grade), 'mlJI sm')}<b>${nm}${cl ? ' Wren\'s Tether' : ''}&nbsp; · &nbsp;${j.n} ${cl ? '' : j.n === 1 ? 'spool' : 'spools'}${cl ? '' : '&nbsp; · '}&nbsp;waiting</b><small>${dur(j.n * unitLen(j.tab, j.grade, L))}&nbsp; · &nbsp;${fx(ux * j.n)} XP</small><button type="button" class="mlDot" data-ml="ask" data-v="${j.id}" aria-label="Job options">⋯</button></div>`; });
    const ids = Object.keys(m.rack).filter((id) => m.rack[id] > 0);
    if (ids.length) { const n = rackCount(), one = ids.length === 1, id = ids[0], k = id.split(/[:_]/).pop();
      const what = one ? (id.startsWith('tether:') ? `${num(m.rack[id])} m ${esc(NM(k))}` : `${m.rack[id]} ${esc(NM(k))} Wren's Tether`) : `${ids.length} grades`;
      h += `<div class="mlRack"><b>On the rack:&nbsp; ${n} ${id.startsWith('tether:') || !one ? (n === 1 ? 'spool' : 'spools') : ''}&nbsp; · &nbsp;${what}</b><button type="button" class="mlCol" data-ml="col">${one ? 'Collect' : 'Collect all'}</button></div>`; }
    box.innerHTML = h; foot.innerHTML = m.jobs.length ? `Queue total ${dur(queueLeft())}&nbsp; · &nbsp;ingots are held when you queue` : 'Ingots are held when you queue · refunded on cancel'; }
  function onClick(e) { const b = e.target.closest('[data-ml]'); if (!b) return; e.stopPropagation(); const a = b.dataset.ml, v = b.dataset.v, m = st();
    if (a === 'x') return shut();
    if (a === 'tab') { P.tab = v === 'climb' ? 'climb' : 'braid'; if (P.tab === 'climb' && !m.climb) { m.climb = 1; say(LINES.climb); } }
    else if (a === 'g') { if (!unlocked(v)) { say(LINES.lock(T(v).u)); return; } P.grade = v; }
    else if (a === 'q') P.qty = v === 'max' ? 'max' : +v;
    else if (a === 'go') { const ips = ingOf(P.tab, P.grade), owned = Craft.have('ingot:' + P.grade), q = qtyOf(owned, ips);
      if (owned < q * ips) { say(LINES.short(num(owned), num(q * ips))); return; } if (!queue(P.tab, P.grade, q)) { say('The queue is full - 5 jobs at most'); return; } tick(); }
    else if (a === 'ask') { P.ask = +v; return drawQueue(); } else if (a === 'keep') { P.ask = null; return drawQueue(); }
    else if (a === 'cx') { P.ask = null; const back = cancel(+v); if (back) say(`🧱 ${num(back)} ingots back in your pack`); tick(); }
    else if (a === 'col') { collect(); return drawQueue(); }
    draw(); }

  /* ---- the HUD mill button's compact progress view (Art's SPEC §7, mill_progress_mock.png): read-only - no start, cancel or Collect here;
     Dominic: "spools are collected from Brannick at the mill only" ---- */
  const G = { on: false, el: null };
  function progress(on) { if (typeof document === 'undefined') return; css(); if (!G.el) { const d = document.createElement('div'); d.id = 'millProgress'; d.className = 'mlP mlG'; d.setAttribute('role', 'dialog');
      for (const e of ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'mousedown', 'mouseup', 'wheel']) d.addEventListener(e, (ev) => ev.stopPropagation());
      d.addEventListener('click', (e) => { e.stopPropagation(); if (e.target.closest('[data-ml=x]')) progress(false); }); (document.getElementById('cityWrap') || document.body).appendChild(d); G.el = d; }
    G.on = !!on; G.el.classList.toggle('on', G.on); if (G.on) { tick(); drawProgress(); } if (typeof Explore !== 'undefined' && Explore.drillHud) Explore.drillHud(); }
  function drawProgress() { if (!G.el || !G.on) return; const m = st(), L = lv(), n = rackCount();
    let q = '';
    if (!m.jobs.length) q = `<div class="mlRow mlQh"><span class="mlLab">QUEUE</span></div><div class="mlDone">Queue finished</div>`;
    else { q = `<div class="mlRow mlQh"><span class="mlLab">QUEUE · ${m.jobs.length} ${m.jobs.length === 1 ? 'job' : 'jobs'}</span><b class="mlTot">${dur(queueLeft())} left</b></div>`;
      m.jobs.forEach((j, i) => { const cl = j.tab === 'climb', nm = esc(NM(j.grade));
        if (!i) { const len = j.len > 0 ? j.len : unitLen(j.tab, j.grade, L), f = Math.min(1, (j.cur || 0) / len);
          q += `<div class="mlGAct"><div class="mlGJ">${ico(outId(j.tab, j.grade), 'mlJI')}<b>${nm}${cl ? ' Wren\'s Tether' : ''}&nbsp; · &nbsp;${cl ? '' : 'spool '}${j.done + 1} of ${j.n}</b></div><div class="mlGL">${dur(jobLeft(j, L))} left</div>`
            + `<div class="mlBar"><i style="width:${Math.max(2, f * 100).toFixed(1)}%"></i></div><small>Current ${cl ? 'tether' : 'spool'} · ${Math.floor(f * 100)}%</small></div>`; }
        else q += `<div class="mlGW">${ico(outId(j.tab, j.grade), 'mlJI sm')}<b>${nm}${cl ? ' Wren\'s Tether' : ''}&nbsp; · &nbsp;${j.n} ${cl ? '' : j.n === 1 ? 'spool' : 'spools'}${cl ? '' : '&nbsp; · '}&nbsp;waiting</b><small>${dur(j.n * unitLen(j.tab, j.grade, L))}</small></div>`; }); }
    const ids = Object.keys(m.rack).filter((id) => m.rack[id] > 0);
    const rk = ids.length ? ids.map((id) => { const k = id.split(/[:_]/).pop(); return id.startsWith('tether:') ? `${Math.round(m.rack[id] / SPOOL_M)} spools&nbsp; · &nbsp;${num(m.rack[id])} m ${esc(NM(k))}` : `${m.rack[id]} ${esc(NM(k))} Wren's Tether${m.rack[id] === 1 ? '' : 's'}`; }).map((t) => `<b class="mlGR">${t}</b>`).join('') : '<b class="mlGR dim">Nothing ready yet</b>';
    G.el.innerHTML = `<i class="mlCap tl"></i><i class="mlCap tr"></i><i class="mlCap bl"></i><i class="mlCap br"></i><div class="mlScroll"><div class="mlHead mlGH"><div class="mlTit"><h2>Tether Mill</h2><small>Rolling while you're away · up to 72 h</small></div><button type="button" class="mlX" data-ml="x" aria-label="Close"></button></div>`
      + `<div class="mlCard">${q}</div><div class="mlCard"><div class="mlLab">READY ON THE RACK</div>${rk}${ids.length && ids.some((id) => id.startsWith('tether:')) ? '<small class="mlGS">Collected as coil metres, not separate items.</small>' : ''}<div class="mlGC">Collect from Brannick at the Tether Mill</div></div>`
      + `<p class="mlGF">Finished spools stay safe on the rack.<br>New jobs: talk to Brannick at the mill.</p></div>`; void n; }

  let CSSdone = false;
  function css() { if (CSSdone || typeof document === 'undefined') return; CSSdone = true; const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s); }
  const BRASS = 'linear-gradient(160deg,#f3d78f,#9a6c2c)', PARCH = 'linear-gradient(#f4e8c8,#dcc79a)', BREE = '"Bree Serif",Georgia,serif', SANS = 'system-ui,-apple-system,"Segoe UI",sans-serif';
  const CSS = `#millDlg{position:absolute;left:50%;bottom:calc(env(safe-area-inset-bottom) + 92px);transform:translateX(-50%);width:min(540px,calc(100% - 16px));z-index:60;font:16px Georgia,"Iowan Old Style",serif;color:#33200f;pointer-events:auto;filter:drop-shadow(0 6px 10px rgba(0,0,0,.45))}
#millDlg.hidden{display:none}#millDlg .tdBar{position:relative;margin-top:46px;border:18px solid transparent;border-image:url(assets/ui/kit_leather.webp) 62 fill / 18px stretch;border-radius:10px}
#millDlg .tdBar:before,#millDlg .tdBar:after,#millDlg .tdC1,#millDlg .tdC2{content:'';position:absolute;width:22px;height:22px;border:5px solid #c99a45;filter:drop-shadow(0 1px 1px rgba(0,0,0,.5))}
#millDlg .tdBar:before{left:-14px;top:-14px;border-right:0;border-bottom:0;border-radius:6px 0 0 0}#millDlg .tdBar:after{right:-14px;top:-14px;border-left:0;border-bottom:0;border-radius:0 6px 0 0}
#millDlg .tdC1{left:-14px;bottom:-14px;border-right:0;border-top:0;border-radius:0 0 0 6px}#millDlg .tdC2{right:-14px;bottom:-14px;border-left:0;border-top:0;border-radius:0 0 6px 0}
#millDlg .tdWell{position:relative;min-height:74px;padding:12px 44px 12px 84px;border-radius:8px;background:linear-gradient(#f8ecd0,#ecd9b0);box-shadow:inset 0 2px 5px rgba(90,50,20,.35);outline:1.5px dashed rgba(140,96,48,.7);outline-offset:-6px}
#millDlg .tdWell p{margin:0;line-height:1.38;min-height:44px}#millDlg .tdName{position:absolute;left:96px;top:-34px;padding:3px 14px;border-radius:8px;background:linear-gradient(#e7c27a,#b9863e);color:#3a2412;font:700 14px Georgia,serif;box-shadow:0 0 0 2px #6e4a1c,0 2px 4px rgba(0,0,0,.4)}
#millDlg .tdName small{font:italic 400 12px Georgia,serif;margin-left:6px;opacity:.8}
#millDlg .tdPort{position:absolute;left:-4px;top:-2px;width:88px;height:88px;border-radius:50%;z-index:2;background:#f6efe0 center/cover no-repeat;box-shadow:0 0 0 5px #b07a34,0 0 0 7px #e6bb68,0 0 0 9px #6e4a1c,inset 0 2px 6px rgba(0,0,0,.35)}
#millDlg .tdPort i{position:absolute;width:5px;height:5px;border-radius:50%;background:#f3d28a;box-shadow:0 0 0 1px #6e4a1c}
#millDlg .tdPip{position:absolute;right:10px;bottom:10px;width:24px;height:24px;border-radius:50%;background:radial-gradient(circle at 50% 40%,#e6bb68,#9a6a2a);box-shadow:0 0 0 2px #6e4a1c;animation:mlBob 1s ease-in-out infinite}
#millDlg .tdPip:after{content:'';position:absolute;left:7px;top:6px;width:7px;height:7px;border-right:2.5px solid #3a2412;border-bottom:2.5px solid #3a2412;transform:rotate(45deg)}
@keyframes mlBob{50%{transform:translateY(3px)}}#millDlg .tdBtns{display:flex;flex-wrap:wrap;gap:10px;justify-content:flex-end;margin-top:10px}#millDlg .tdBtns button{min-height:44px;padding:4px 16px}
#millDlg .kGreen,.mlP .mlGo{background:radial-gradient(120% 95% at 50% 22%,#9cc25a,#5f8f32 55%,#3f6a20)}#millDlg .kGold{color:#2b1a10;text-shadow:0 1px 0 rgba(255,240,200,.5);background:radial-gradient(120% 95% at 50% 25%,#f6dc8e,#d4a64e 60%,#9a6c2c)}
#modal[data-k=mill]{align-items:center}#modal[data-k=mill] .sheet{background:none;box-shadow:none;padding:0;max-width:none;width:auto;max-height:none;overflow:visible;animation:none}
.mlP{position:relative;box-sizing:border-box;width:min(470px,calc(100vw - 14px));max-height:calc(100dvh - 16px);display:flex;flex-direction:column;padding:11px;border-radius:12px;background:linear-gradient(160deg,#5a6e30,#2f3b18);box-shadow:0 0 0 2px #2b1a10,0 8px 22px rgba(0,0,0,.55);color:#2b1a10;font:400 14px/1.25 ${BREE};-webkit-user-select:none;user-select:none}
.mlP .mlScroll{position:relative;flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:10px 11px 8px;border-radius:9px;background:url(assets/ui/kit_leather.webp) center/cover,#9a5a2c;box-shadow:0 0 0 1.5px #4a2a12,inset 0 0 18px rgba(40,18,6,.45);scrollbar-width:none}
.mlP .mlScroll::-webkit-scrollbar{display:none}
.mlP .mlCap{position:absolute;width:24px;height:24px;border-radius:6px;background:${BRASS};box-shadow:0 0 0 1.5px #2b1a10;z-index:3;pointer-events:none}.mlP .mlCap:before,.mlP .mlCap:after{content:"";position:absolute;width:5px;height:5px;border-radius:50%;background:#f3d78f;box-shadow:0 0 0 1px #2b1a10}
.mlP .mlCap:before{left:4px;top:4px}.mlP .mlCap:after{right:4px;bottom:4px}.mlP .tl{left:-4px;top:-4px}.mlP .tr{right:-4px;top:-4px}.mlP .bl{left:-4px;bottom:-4px}.mlP .br{right:-4px;bottom:-4px}
.mlP .mlHead{display:flex;align-items:center;gap:12px;margin:-3px 0 6px;position:relative}
.mlP .mlPort{flex:none;width:60px;height:60px;border-radius:50%;background:#f4e8c8 center/112% no-repeat;box-shadow:0 0 0 5px #c48a3a,0 0 0 6.5px #2b1a10,inset 0 0 0 1.5px #2b1a10,0 3px 6px rgba(0,0,0,.4);margin:6px}
.mlP .mlTit{flex:1;min-width:0}.mlP .mlTit h2{margin:0;font:400 22px/1.05 ${BREE};color:#2b1a10;text-shadow:0 1px 0 rgba(255,228,180,.35)}.mlP .mlTit small{font:700 10.5px ${SANS};color:#3a2414}
.mlP .mlX{position:absolute;right:-4px;top:-4px;width:40px;height:40px;border:0;padding:0;border-radius:50%;background:url(assets/ui/icons/btn_close_idle.webp) center/contain no-repeat;cursor:pointer}.mlP .mlX:active{background-image:url(assets/ui/icons/btn_close_pressed.webp)}
.mlP .mlCard{position:relative;border-radius:8px;background:${PARCH};box-shadow:0 0 0 1.5px #8c6428;padding:8px 10px;margin-bottom:6px}
.mlP .mlCard:before{content:"";position:absolute;left:8px;right:8px;top:4px;height:1px;background:repeating-linear-gradient(90deg,#b08a50 0 4px,transparent 4px 8px);opacity:.8;pointer-events:none}
.mlP .mlRow{display:flex;justify-content:space-between;align-items:baseline;gap:8px}
.mlP .mlLv{display:flex;align-items:center;gap:12px;padding:7px 10px}
.mlP .mlMed{flex:none;width:44px;height:44px;margin:4px;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(circle at 50% 38%,#fbf2da,#dcc79a 70%);box-shadow:0 0 0 5px #c48a3a,0 0 0 6.5px #2b1a10,inset 0 0 0 1px #2b1a10}
.mlP .mlMed small{font:700 7px ${SANS};color:#7a5a3a;letter-spacing:.06em}.mlP .mlMed b{font:400 17px/1 ${BREE}}
.mlP .mlLvB{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}.mlP h3{margin:0;font:400 15px/1.1 ${BREE};color:#2b1a10}
.mlP .mlPct{font:400 10px ${SANS};color:#5a3a1e}.mlP .mlXp{font:400 11px ${BREE}}.mlP .mlSpd{font:700 10px ${SANS};color:#2a6a5a}
.mlP .mlBar{height:12px;border-radius:99px;background:linear-gradient(#2a1a10,#140c06);box-shadow:0 0 0 2.5px #c48a3a,0 0 0 4px #2b1a10;overflow:hidden;margin:3px 2px}
.mlP .mlBar i{display:block;height:100%;border-radius:99px;max-width:100%;background:repeating-linear-gradient(90deg,transparent 0 13px,rgba(0,0,0,.14) 13px 14px),linear-gradient(180deg,#bff9ff,#2a9a9a);box-shadow:inset 0 1.5px 0 rgba(255,255,255,.45);transition:width .4s linear}
.mlP .mlTabs{display:flex;gap:10px;margin:0 0 7px}.mlP .mlTabs button{flex:1;min-height:30px;border:0;border-radius:10px;cursor:pointer;font:400 13.5px/1 ${BREE};color:#f3e4c2;background:linear-gradient(#8a5a2e,#5e3a1a);box-shadow:0 0 0 1.5px #2b1a10,0 3px 0 rgba(20,10,4,.45),inset 0 1px 0 rgba(255,255,255,.18)}
.mlP .mlTabs button.on{color:#2b1a10;background:linear-gradient(#f4e8c8,#d8c08c);box-shadow:0 0 0 2px #ffd36a,0 0 0 3.2px #2b1a10,0 3px 0 rgba(20,10,4,.35),inset 0 1px 0 rgba(255,255,255,.5)}
.mlP .mlLab{font:700 8.5px ${SANS};letter-spacing:.06em;color:#7a5a3a;margin:1px 0 4px}
.mlP .mlGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px 5px}
.mlP .mlT{position:relative;display:flex;flex-direction:column;align-items:center;gap:0;padding:3px 2px 3px;border:0;border-radius:5px;background:${PARCH};box-shadow:0 0 0 1.2px #8c6428;cursor:pointer;color:#2b1a10;font:inherit;min-width:0}
.mlP .mlT b{font:400 11px/1.15 ${BREE};margin-top:1px;white-space:nowrap}.mlP .mlT b.sm{font-size:9.5px}.mlP .mlT small{font:400 8px ${SANS};color:#5a3a1e;white-space:nowrap}
.mlP .mlT.lock{background:linear-gradient(#c9b896,#a8977a)}.mlP .mlT.lock b{color:#4a4036}.mlP .mlT.lock small{font-weight:700;color:#5a5046}.mlP .mlT.lock .mlIco{filter:grayscale(.85) brightness(.7)}
.mlP .mlT.on{box-shadow:0 0 0 2.6px #e6a830,inset 0 0 0 2.6px #fff0b0,inset 0 0 0 3.4px rgba(230,168,48,.6)}
.mlP .mlLock{position:absolute;right:2px;top:2px;width:22px;height:22px;background:url(assets/ui/icons/btn_locked_idle.webp) center/contain no-repeat}
.mlP .mlIco{display:block;flex:none;width:40px;height:40px;background-image:url(assets/ui/icons/items.webp);background-repeat:no-repeat;background-size:calc(var(--icols,9)*100%) calc(var(--irows,8)*100%);background-position:calc(var(--ix)*100% / (var(--icols,9) - 1)) calc(var(--iy)*100% / (var(--irows,8) - 1))}
.mlP .mlSv{background:none}.mlP .mlSv svg{width:100%;height:100%;position:static}
.mlP .mlTI{width:36px;height:36px}.mlP .mlRI{width:42px;height:42px}.mlP .mlII{width:30px;height:30px}.mlP .mlJI{width:34px;height:34px}.mlP .mlJI.sm{width:28px;height:28px}
.mlP hr{border:0;height:1px;background:#b08a50;margin:7px 0 6px}
.mlP .mlRec{display:flex;align-items:center;gap:10px;margin-bottom:7px}.mlP .mlRec h3{font-size:14px}.mlP .mlRec p{margin:2px 0 0;font:400 10px ${SANS};color:#3a2414}
.mlP .mlIng{display:flex;align-items:center;gap:9px;padding:5px 10px;border-radius:5px;background:${PARCH};box-shadow:0 0 0 1.2px #8c6428;margin-bottom:6px;position:relative}
.mlP .mlIng:before{content:"";position:absolute;left:6px;right:6px;top:3px;height:1px;background:repeating-linear-gradient(90deg,#b08a50 0 4px,transparent 4px 8px);opacity:.7}
.mlP .mlIngL{flex:1;display:flex;flex-direction:column}.mlP .mlIngR{display:flex;flex-direction:column;align-items:flex-end}.mlP .mlIng small{font:700 9px ${SANS};color:#7a5a3a}.mlP .mlIngR small{letter-spacing:.06em}
.mlP .mlIng b{font:400 14px/1.2 ${BREE}}.mlP .mlIng b.ok{color:#2f6a2a}.mlP .mlIng b.short{color:#a8381c}
.mlP .mlQty{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:6px}
.mlP .mlQb{min-height:28px;border:0;border-radius:9px;cursor:pointer;font:400 13px ${BREE};color:#2b1a10;background:linear-gradient(#f4e8c8,#d8c08c);box-shadow:0 0 0 1.2px #2b1a10,0 2.5px 0 rgba(20,10,4,.4),inset 0 1px 0 rgba(255,255,255,.55)}
.mlP .mlQb.on{background:linear-gradient(#ecc976,#9a6c2c);box-shadow:0 0 0 2px #ffd36a,0 0 0 3px #2b1a10,0 2.5px 0 rgba(20,10,4,.4)}.mlP .mlQb:disabled{opacity:.45;cursor:default}
.mlP .mlSum{display:flex;justify-content:space-between;align-items:baseline;gap:6px;margin-bottom:7px}.mlP .mlSum b{font:400 12px ${BREE}}.mlP .mlSum span{font:700 10.5px ${SANS};color:#3a2414;white-space:nowrap}
.mlP .mlGo{display:block;width:100%;min-height:35px;border:0;border-radius:11px;cursor:pointer;font:400 16px ${BREE};color:#f8ecd2;text-shadow:0 1px 1px rgba(0,0,0,.4);box-shadow:0 0 0 1.5px #2b1a10,0 3px 0 rgba(20,10,4,.45),inset 0 1.5px 0 rgba(255,255,255,.35)}
.mlP .mlGo.off{background:linear-gradient(#b8ad98,#8a8070);color:#4a4238;text-shadow:none}
.mlP .mlQh{margin-bottom:5px}.mlP .mlQh .mlLab{margin:0}.mlP .mlAway{font:700 9px ${SANS};color:#2a6a5a}.mlP .mlEmpty{font:400 11px ${SANS};color:#5a4a38;padding:4px 0 2px}
.mlP .mlJob{display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid #b08a50}.mlP .mlJob:last-child{border-bottom:0}
.mlP .mlJb{flex:1;min-width:0}.mlP .mlAct b{font:400 12.5px ${BREE}}.mlP .mlAct small{font:400 9.5px ${SANS};color:#3a2414}
.mlP .mlWait b{flex:1;font:400 11.5px ${BREE};color:#4a3a28}.mlP .mlWait small{font:400 9.5px ${SANS};color:#5a3a1e;white-space:nowrap}
.mlP .mlDot{border:0;background:none;font:700 15px/1 ${SANS};color:#5a3a1e;padding:0 4px;min-width:26px;min-height:22px;cursor:pointer}
.mlP .mlAsk span{flex:1;font:400 11px ${SANS}}.mlP .mlSm{border:0;border-radius:8px;padding:5px 9px;font:400 11px ${BREE};color:#2b1a10;background:linear-gradient(#f4e8c8,#d8c08c);box-shadow:0 0 0 1.2px #2b1a10;cursor:pointer}.mlP .mlSm.red{color:#f8ecd2;background:linear-gradient(#c8603a,#8a3418)}
.mlP .mlRack{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 0 1px;border-top:1px solid #b08a50;margin-top:2px}.mlP .mlRack b{font:400 12px ${BREE}}
.mlP .mlCol{flex:none;min-height:28px;min-width:84px;border:0;border-radius:9px;cursor:pointer;font:400 13px ${BREE};color:#2b1a10;background:linear-gradient(#ecc976,#9a6c2c);box-shadow:0 0 0 1.2px #2b1a10,0 2.5px 0 rgba(20,10,4,.4),inset 0 1px 0 rgba(255,255,255,.5)}
.mlP .mlFoot{width:max-content;max-width:100%;margin:2px auto 0;padding:4px 10px;border-radius:5px;background:linear-gradient(#c98a48,#8a5426);box-shadow:0 0 0 1.2px #2b1a10;font:700 10px ${SANS};color:#2b1a10;text-align:center}
#millProgress{position:absolute;left:50%;top:calc(env(safe-area-inset-top) + 64px);transform:translateX(-50%);z-index:40;display:none;width:min(440px,calc(100% - 20px));max-height:calc(100% - 150px)}#millProgress.on{display:flex}
.mlG .mlGH{margin:2px 0 8px 6px}.mlG .mlGH h2{font-size:21px}.mlG .mlGH small{font-weight:400;font-size:10.5px}.mlG .mlTot{font:400 12.5px ${BREE}}
.mlG .mlGAct{padding:4px 0 7px;border-bottom:1px solid #b08a50}.mlG .mlGJ{display:flex;align-items:center;gap:8px}.mlG .mlGJ b{font:400 13px ${BREE}}.mlG .mlGL{text-align:right;font:400 10.5px ${SANS};color:#3a2414;margin:-2px 0 3px}
.mlG .mlGAct small{font:400 10px ${SANS};color:#3a2414}.mlG .mlGW{display:flex;align-items:center;gap:8px;padding:6px 0 0}.mlG .mlGW b{flex:1;font:400 12px ${BREE};color:#2b1a10}.mlG .mlGW small{font:400 10px ${SANS};color:#5a3a1e}
.mlG .mlDone{font:400 14px ${BREE};padding:2px 0 4px}.mlG .mlGR{display:block;font:400 15px/1.35 ${BREE}}.mlG .mlGR.dim{color:#6a5a48;font-size:13px}.mlG .mlGS{display:block;font:400 10px ${SANS};color:#3a2414;margin-top:2px}
.mlG .mlGC{margin-top:9px;padding:9px 10px;border-radius:9px;text-align:center;font:400 13.5px ${BREE};color:#3a2414;background:rgba(140,100,40,.14);box-shadow:inset 0 0 0 1.2px rgba(140,100,40,.55)}
.mlG .mlGF{margin:8px 0 2px;text-align:center;font:400 10.5px/1.7 ${SANS};color:#f3e4c2;text-shadow:0 1px 1px rgba(0,0,0,.4)}
@media (min-width:900px){.mlP{width:500px}#millProgress{width:460px}}`;

  if (typeof window !== 'undefined') setInterval(() => { try { tick(); } catch (e) { /* never break the game loop */ } }, 500);
  return { GRADES, MAXJ, CAP, st, tick, advance, queue, cancel, collect, rackCount, running, unitLen, ingOf, xpOf, outId, queueLeft, jobLeft, talk, close, open, shut, progress,
    get talking() { return D.on; }, get progressOn() { return G.on; }, get panelOn() { return P.on && !!rootEl(); }, P, D, LINES, dur };
})();
