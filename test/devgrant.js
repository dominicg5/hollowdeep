// (Dominic, after he claimed it) the one-time dev grant is gone: no '#dev=' token path, no token hash, no claim button in the build.
// S.devGrants stays in old saves (a harmless log). Static check of index.html (no browser).
const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8');
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
ok(!/DevGrant|devClaimBtn|Claim T10 Ember Onyx|dev=\(|721406144aa7905e57cd5ca5f654b57d2900d5f352ce747d4c89c34332c5e5fa|dominic-onyx-t10-mining300/.test(src), 'no dev grant path in the build: no #dev= token check, no token hash, no claim button (got grant removed)');
ok(!/S\.devGrants\s*=|devGrants\.push/.test(src), 'nothing writes S.devGrants any more (old saves keep their log)');
console.log(fails ? fails + ' FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
