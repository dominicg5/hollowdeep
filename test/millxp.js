// tiny node check (no browser): one Ledge Tether braid spool roll grants Tethercraft XP at MILL xp (anvil XP x ~10.84); climbing tethers grant none
const fs = require('fs'), vm = require('vm');
const src = fs.readFileSync(__dirname + '/../src/skills.js', 'utf8'), cr = fs.readFileSync(__dirname + '/../src/craft.js', 'utf8');
const MILL = eval('(' + cr.match(/const MILL = (\{[\s\S]*?\n  \});/)[1] + ')'), ANV = eval('(' + src.match(/const ANVIL_XP = (\{[^}]*\})/)[1] + ')');
const ctx = { S: { skills: { mining: 0, smithing: 0, tethercraft: 0 } }, Craft: { MILL }, console, Math, Number, Object, Array, JSON, isFinite };
vm.createContext(ctx); vm.runInContext(src + '\nthis.Skills = Skills;', ctx);
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const g = ctx.Skills.awardMill('braid', 'bronze', 1);
ok(g === MILL.bronze.xp && ctx.S.skills.tethercraft === MILL.bronze.xp && g > 0, `one Bronze spool roll grants ${g} Tethercraft XP`);
ok(ctx.Skills.awardMill('climb', 'bronze', 1) === 0 && ctx.S.skills.tethercraft === MILL.bronze.xp, 'a climbing-tether job grants nothing');
ok(Object.keys(MILL).every((k) => Math.abs(MILL[k].xp / (MILL[k].ips * ANV[k]) - 10.844) < 0.02), 'every spool grade pays anvil XP x 10.84');
console.log(fails ? fails + ' FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
