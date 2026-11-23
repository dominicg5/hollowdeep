/* ===== The game music (GameMusic: overworld valley loop by default, zones by priority) and Theus's volcano: the battle music loop and his hammer (Dominic t347u, t351s1277, t352u)
   - Music (assets/audio/theus_battle_loop): only inside the volcano radius on the approach to Theus (AUDIO_R design metres round him); fades in on entering and
     out on leaving; a Web Audio buffer loop (no <audio> gap). Lazy: fetched once, the first time she comes inside the radius.
   - Hammer: theus_swing_whoosh starts with his swing, offset so its whip crack (1.2 s in) lands just before contact; theus_thunder_strike_D on the exact frame the
     hammer meets the metal (FORGE calls TheusAudio.swing / .hit). A new buffer source per swing (overlaps are fine). Loudest at Theus, fading smoothly to silence at
     the edge of the same radius (checked when each sound triggers); silent outside it.
   - One loader and one format pick for all three: Ogg Vorbis where the browser says it plays it, else AAC (.m4a) - only one of the two is downloaded
     (a failed Ogg decode falls back to the .m4a once). The context resumes on the first tap; there is no game mute / volume setting yet (TheusAudio.vol / .mute
     are the hooks; a hidden tab is silent). ===== */
const TheusAudio = (() => {
  const AUDIO_R = 300, MUSIC_LEN = 55.253, FADE = 2.5, BASE = 'assets/audio/', CRACK = 1.2, LEAD = 0.03;
  const A = { ctx: null, master: null, mus: null, musG: null, buf: {}, load: {}, fmt: null, inside: false, fetches: 0, vol: 0.8, mute: false, lastD: Infinity, plays: [] };
  function fmt() { if (A.fmt) return A.fmt; let ogg = ''; try { ogg = document.createElement('audio').canPlayType('audio/ogg; codecs="vorbis"'); } catch (e) {} return (A.fmt = ogg ? 'ogg' : 'm4a'); }
  function ctx() { if (A.ctx) return A.ctx; const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; A.ctx = new C(); A.master = A.ctx.createGain(); A.master.gain.value = A.mute ? 0 : A.vol; A.master.connect(A.ctx.destination); return A.ctx; }
  const resume = () => { if (A.ctx && A.ctx.state !== 'running') A.ctx.resume().catch(() => {}); };
  if (typeof window !== 'undefined') { for (const e of ['pointerdown', 'touchend', 'keydown']) window.addEventListener(e, () => { start(); resume(); }, { capture: true, passive: true }); document.addEventListener('visibilitychange', () => { if (!A.ctx) return; if (document.hidden) A.ctx.suspend().catch(() => {}); else resume(); }); }
  // the one loader: each sound fetched once, in the one format this browser plays
  function get(name) { if (A.buf[name]) return Promise.resolve(A.buf[name]); if (A.load[name]) return A.load[name]; const C = ctx(); if (!C) return Promise.resolve(null);
    const one = (ext) => { A.fetches++; return fetch(BASE + name + '.' + ext).then((r) => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); }).then((ab) => new Promise((ok, no) => C.decodeAudioData(ab, ok, no))); };
    return (A.load[name] = one(fmt()).catch(() => (fmt() === 'ogg' ? one('m4a') : null)).then((b) => { A.buf[name] = b; return b; }).catch(() => null)); }
  // where she is vs Theus (design metres), only out on the map
  function dist() { if (typeof FORGE === 'undefined' || !FORGE.M || !FORGE.M.built || !FORGE.M.ape || typeof Explore === 'undefined' || !Explore.on) return Infinity; const h = Explore.here && Explore.here(); if (!h) return Infinity; const p = FORGE.M.ape.position; return Math.hypot(h[0] - p.x, h[1] - p.z) / FORGE.U; }
  const fall = (d) => (d >= AUDIO_R ? 0 : 0.5 * (1 + Math.cos(Math.PI * Math.max(0, d) / AUDIO_R))); // 1 at Theus, smoothly 0 at the edge
  // ---- the music: a small priority system. Each zone names a looping track, a priority and when it's active; the highest active zone whose track is
  // loaded plays, and a change crossfades over FADE s. The overworld (valley handpan, Dominic t355u) is priority 0 and always active; Theus's volcano radius
  // (priority 10) overrides it; a future area or event adds GameMusic.zone('id', { track, len, prio, active }) and wins while its active() is true.
  const Z = {};
  function zone(id, o) { Z[id] = Object.assign({ id, prio: 0, vol: 0.55, len: 0, active: () => true }, o); return Z[id]; }
  zone('overworld', { track: 'valley_handpan_A_loop', len: 36.0, prio: 0, vol: 0.5 });
  zone('theus', { track: 'theus_battle_loop', len: MUSIC_LEN, prio: 10, vol: 0.55, active: () => A.inside });
  A.cur = null; A.src = {};
  // every music change is an equal-power crossfade over FADE s (never a hard cut): in = sin, out = cos of the same 0..1 sweep, so the sum of power stays level
  function xf(g, from, to) { const C = A.ctx, t = C.currentTime, n = 64, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i / (n - 1); c[i] = to > from ? from + (to - from) * Math.sin(x * Math.PI / 2) : to + (from - to) * Math.cos(x * Math.PI / 2); }
    const P = g.gain; try { if (P.cancelAndHoldAtTime) P.cancelAndHoldAtTime(t); else { P.cancelScheduledValues(t); P.setValueAtTime(from, t); } P.setValueCurveAtTime(c, t + 0.005, FADE); } catch (e) { try { P.cancelScheduledValues(0); P.setValueAtTime(from, t); P.linearRampToValueAtTime(to, t + FADE); } catch (e2) {} } } /* (cancelAndHold: a fade can turn round mid-way without a jump) */
  function startTrack(z) { const C = A.ctx, b = A.buf[z.track]; const s = C.createBufferSource(), g = C.createGain(); s.buffer = b; s.loop = true; const extra = Math.max(0, b.duration - (z.len || b.duration)); if (extra > 0.01) { s.loopStart = Math.min(extra, 2112 / b.sampleRate); s.loopEnd = s.loopStart + z.len; } /* (AAC priming / padding kept out of the loop) */
    g.gain.value = 0; xf(g, 0, z.vol); s.connect(g); g.connect(A.master); s.start(0, s.loopStart || 0); A.src[z.id] = { s, g, tm: null }; }
  function stopTrack(id) { const q = A.src[id]; if (!q) return; delete A.src[id]; q.id = id; A.out = q; xf(q.g, q.g.gain.value, 0); q.tm = setTimeout(() => { try { q.s.stop(); q.s.disconnect(); q.g.disconnect(); } catch (e) {} }, FADE * 1000 + 100); }
  function musicTick() { if (!A.ctx || !A.started) return; const act = Object.values(Z).filter((z) => { try { return z.active(); } catch (e) { return false; } }).sort((a, b) => b.prio - a.prio); let want = null;
    for (const z of act) { if (A.buf[z.track]) { want = z; break; } get(z.track); if (z.id === A.cur) { want = z; break; } } /* (a higher zone still loading: the current one keeps playing until it's ready) */
    const id = want ? want.id : null; if (id === A.cur) { if (id && !A.src[id] && A.buf[want.track]) startTrack(want); return; } if (A.cur) stopTrack(A.cur); A.cur = id; if (want && A.buf[want.track]) startTrack(want); }
  function start() { if (A.started) return; if (!ctx()) return; A.started = true; get(Z.overworld.track).then(() => musicTick()); } /* the first tap: the audio starts up and the overworld loop is fetched (once, kept in memory) */
  function update(dOv) { const d = dOv != null ? dOv : A.dOv != null ? A.dOv : dist(); /* (A.dOv: a test pins her distance) */ A.lastD = d; const inside = d < AUDIO_R; if (inside && !A.ctx) ctx(); if (inside) { get('theus_swing_whoosh'); get('theus_thunder_strike_D'); } if (inside !== A.inside) A.inside = inside; musicTick(); return inside; }
  function play(name, offset, d) { const C = A.ctx, b = A.buf[name], g0 = fall(d != null ? d : A.dOv != null ? A.dOv : dist()); if (!C || !b || g0 <= 0) return 0; const s = C.createBufferSource(), g = C.createGain(); s.buffer = b; g.gain.value = g0; s.connect(g); g.connect(A.master); s.start(0, Math.max(0, Math.min(b.duration - 0.01, offset || 0))); A.plays.push([name, +g0.toFixed(3)]); if (A.plays.length > 20) A.plays.shift(); return g0; }
  // FORGE: lateBy = how far past the swing's start this frame is (s), so the crack still lands LEAD s before contact
  const swing = (lead, lateBy, d) => play('theus_swing_whoosh', CRACK - lead + LEAD + (lateBy || 0), d);
  const hit = (d) => play('theus_thunder_strike_D', 0, d);
  function setVol(v) { A.vol = Math.max(0, Math.min(1, +v || 0)); if (A.master) A.master.gain.value = A.mute ? 0 : A.vol; }
  function setMute(m) { A.mute = !!m; if (A.master) A.master.gain.value = A.mute ? 0 : A.vol; }
  if (typeof window !== 'undefined') setInterval(() => { try { update(); } catch (e) {} }, 250);
  return { A, Z, zone, AUDIO_R, fmt, get, update, musicTick, start, fall, swing, hit, dist, setVol, setMute, get inside() { return A.inside; } };
})();
const GameMusic = TheusAudio; /* (the general music module: zones + priority; TheusAudio is the same object) */
