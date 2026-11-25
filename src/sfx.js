/* ===== Sfx: combat sound effects (Dominic, Art's chat 9:01 AM: "all variations of noises utilized in random fashion so it's not in a specific ordered sequence")
   - SFX_TABLE (below) is the one data table: each category's files and volume. Art's CC0 pack (/workspace/mia/audio/combat_sfx, credits in CREDITS.md).
   - shout: her attack effort, only the moment a sword swing starts (male / female set by her sex); swoosh: the blade through the air, ~9 dB under shout / hit;
     hit: a sword landing on a creature (hit_v3), hit_06 is the crit (the game's Heavy blow); normal hits pick from the rest (consecutive crits alternate with a normal impact to avoid repeats).
   - Random variant each time, never the same clip twice in a row in a category. MP3 only (plays on every iPhone Safari; no second format downloaded).
   - Lazy: nothing is fetched until a sword is equipped / first played; Web Audio, resumed on the first tap. Public API: Sfx.swing(opt), Sfx.hit(opt), Sfx.play(cat),
     Sfx.warm(), Sfx.vol / Sfx.mute, Sfx.log (what fired: test hook), Sfx.TABLE. ===== */
const SFX_TABLE = {
  base: 'assets/audio/sfx/', ext: 'mp3',
  shout_m: { files: ['shout_male_01', 'shout_male_02', 'shout_male_03', 'shout_male_04'], db: 0 },
  shout_f: { files: ['shout_female_01', 'shout_female_02', 'shout_female_03', 'shout_female_04'], db: 0 },
  swoosh: { files: ['swoosh_01', 'swoosh_02', 'swoosh_03', 'swoosh_04', 'swoosh_05', 'swoosh_06'], db: -9, at: 0.3 }, // at: fraction of the swing when the blade sweeps
  hit: { files: ['hit_01', 'hit_02', 'hit_03', 'hit_04', 'hit_05'], db: 0 },
  hit_crit: { files: ['hit_06'], db: 0 }
};
const Sfx = (() => {
  const T = SFX_TABLE, A = { ctx: null, out: null, buf: {}, load: {}, last: {}, vol: 0.8, mute: false, log: [], fetches: 0 };
  function ctx() { if (A.ctx) return A.ctx; const C = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext); if (!C) return null; try { A.ctx = new C(); } catch (e) { return null; } A.out = A.ctx.createGain(); A.out.gain.value = A.mute ? 0 : A.vol; A.out.connect(A.ctx.destination); return A.ctx; }
  const resume = () => { if (A.ctx && A.ctx.state !== 'running') A.ctx.resume().catch(() => {}); };
  if (typeof window !== 'undefined') for (const e of ['pointerdown', 'touchend', 'keydown']) window.addEventListener(e, () => { ctx(); resume(); }, { capture: true, passive: true }); /* (iOS: unlocked by the first tap) */
  function get(name) { if (A.buf[name]) return Promise.resolve(A.buf[name]); if (A.load[name]) return A.load[name]; const C = ctx(); if (!C || typeof fetch === 'undefined') return Promise.resolve(null); A.fetches++;
    return (A.load[name] = fetch(T.base + name + '.' + T.ext).then((r) => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
      .then((ab) => new Promise((ok, no) => C.decodeAudioData(ab, ok, no))).then((b) => (A.buf[name] = b)).catch(() => { delete A.load[name]; return null; })); }
  function warm() { for (const k in T) if (T[k] && T[k].files) T[k].files.forEach(get); }
  // A uniform random pick from every variant except the previous one. Crit prefers hit_06, but consecutive crits alternate with a normal impact (never repeat hit_06).
  function pick(cat) { const lane = cat === 'hit_crit' ? 'hit' : cat; let F = T[cat].files.filter((f) => f !== A.last[lane]);
    if (!F.length && cat === 'hit_crit') F = T.hit.files; return F[Math.floor(Math.random() * F.length)]; }
  function play(cat, delay) { const D = T[cat]; if (!D || !D.files) return null; const name = pick(cat); A.last[cat === 'hit_crit' ? 'hit' : cat] = name; A.log.push({ cat, name, delay: delay || 0 }); if (A.log.length > 200) A.log.shift();
    if (A.mute || (typeof document !== 'undefined' && document.hidden)) return name; const C = ctx(); if (!C) return name;
    const when = C.currentTime + Math.max(0, delay || 0); /* cold buffers are warmed, never played late over the next action */
    get(name).then((b) => { if (!b || C.state !== 'running' || C.currentTime > when + 0.08 || A.mute || document.hidden) return; const s = C.createBufferSource(), g = C.createGain(); s.buffer = b; g.gain.value = Math.pow(10, (D.db || 0) / 20); s.connect(g); g.connect(A.out); s.start(Math.max(C.currentTime, when)); s.onended = () => { s.disconnect(); g.disconnect(); }; });
    return name; }
  // a sword swing starts: her shout now, the blade's swoosh as it sweeps (dual wield: one per blade); opt { f: female, T: swing seconds, lag, T2 }
  function swing(opt) { opt = opt || {}; const out = [play(opt.f ? 'shout_f' : 'shout_m')], at = T.swoosh.at; out.push(play('swoosh', (opt.T || 0.6) * at)); if (opt.lag != null && opt.T2) out.push(play('swoosh', opt.lag + opt.T2 * at)); return out; }
  function hit(opt) { return play(opt && opt.crit ? 'hit_crit' : 'hit'); }
  return { TABLE: T, swing, hit, play, warm, pick, get log() { return A.log; }, get fetches() { return A.fetches; },
    get vol() { return A.vol; }, set vol(v) { A.vol = +v || 0; if (A.out) A.out.gain.value = A.mute ? 0 : A.vol; }, get mute() { return A.mute; }, set mute(m) { A.mute = !!m; if (A.out) A.out.gain.value = A.mute ? 0 : A.vol; } };
})();
