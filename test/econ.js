const { chromium } = require('playwright-core'); const path=require('path');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});const p=await b.newPage();
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+path.resolve(__dirname,'../hollowdeep-prototype.html'));await p.waitForTimeout(300);
const r=await p.evaluate(()=>{const out=[];for(let d=1;d<=4;d++){ if(!HD.S.hero.task) HD.startExpedition(Math.min(2,d)); for(const id of ['hall','storehouse','wall','training','lift']) HD.startBuild(id); const s=HD.simulateAway(24*3600e3); out.push({day:d,res:Object.fromEntries(Object.entries(HD.S.res).map(([k,v])=>[k,Math.round(v)])),lvl:HD.S.hero.level,b:{...HD.S.buildings},raids:HD.S.raidCount,ev:s.events.length,dark:HD.S.outposts[0].dark});}return out;});
console.log(JSON.stringify(r,null,0).replace(/\},\{/g,'},\n{'));console.log(errs);await p.screenshot({path:'shot-away2.png'});await b.close();})();
