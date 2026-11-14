const { chromium } = require('playwright-core');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
const p=await b.newPage();const errs=[];p.on('console',m=>errs.push(m.type()+': '+m.text()));
await p.goto('https://htmlpreview.github.io/?https://files.catbox.moe/mug9bn.html');await p.waitForTimeout(10000);
console.log((await p.content()).slice(0,600));console.log(errs.slice(0,5));await b.close();})();
