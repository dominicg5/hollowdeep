const { chromium } = require('playwright-core');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
const p=await (await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true})).newPage();
const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await p.goto('https://htmlpreview.github.io/?https://files.catbox.moe/mug9bn.html');await p.waitForTimeout(6000);
console.log('HD?',await p.evaluate(()=>typeof HD!=='undefined' && !!HD.S), 'welcome?', await p.isVisible('text=Welcome to the Rim'));
await p.click('[data-act=close]').catch(e=>console.log('noclose'));
await p.click('nav [data-tab=training]');const bx=await p.locator('#tapzone').boundingBox();
for(let i=0;i<5;i++){await p.touchscreen.tap(bx.x+200,bx.y+100);await p.waitForTimeout(150);}
console.log('taps',await p.evaluate(()=>HD.S.taps.total));
await p.screenshot({path:'shot-hp.png'});console.log(errs);await b.close();})();
