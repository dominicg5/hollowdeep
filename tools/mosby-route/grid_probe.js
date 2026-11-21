(async()=>{const E=Explore,WS=E.WS;for(let i=0;i<120&&M3.models!=="ready";i++)await new Promise(r=>setTimeout(r,1000));await new Promise(r=>setTimeout(r,3000));E.build();E.build();E.oreSpots&&E.oreSpots();const G=64,X0=-11920,n=Math.ceil(23840/G);const N=n*n;
const h=new Array(N),f=new Uint8Array(N),tr=new Uint8Array(N);
const idx=(x,y)=>{const i=Math.floor((x-X0)/G),j=Math.floor((y-X0)/G);return (i<0||j<0||i>=n||j>=n)?-1:j*n+i;};
for(let j=0;j<n;j++)for(let i=0;i<n;i++){const x=X0+(i+0.5)*G,y=X0+(j+0.5)*G,k=j*n+i;h[k]=Math.round(M3.meshH(x,y));if(typeof GRAND!=='undefined'&&GRAND.wet&&GRAND.wet(x,y,0))f[k]|=1;}
// cracks: mark by width
for(const cr of W.cracks||[])for(let q=0;q+1<cr.pts.length;q++){const a=cr.pts[q],c=cr.pts[q+1],L=Math.hypot(c[0]-a[0],c[1]-a[1]);const st=Math.max(1,Math.ceil(L/16));for(let s=0;s<=st;s++){const t=s/st,x=a[0]+(c[0]-a[0])*t,y=a[1]+(c[1]-a[1])*t,w=cr.ws[q]+(cr.ws[q+1]-cr.ws[q])*t;const r=w/2;for(let dy=-r;dy<=r;dy+=16)for(let dx=-r;dx<=r;dx+=16){if(dx*dx+dy*dy>r*r)continue;const k=idx(x+dx,y+dy);if(k>=0)f[k]|=(w>64?4:2);} const k=idx(x,y);if(k>=0)f[k]|=(w>64?4:2);}}
const C=M3.colliders?M3.colliders():[];for(const c of C){const k=idx(c.x,c.y);if(k<0)continue;if((c.key||'').startsWith('t_')){tr[k]=Math.min(255,tr[k]+1);}if(c.key==='landmark')f[k]|=16;}
const blk=(x,y,R,bit)=>{for(let yy=y-R;yy<=y+R;yy+=G/2)for(let xx=x-R;xx<=x+R;xx+=G/2){if((xx-x)**2+(yy-y)**2>R*R)continue;const k=idx(xx,yy);if(k>=0)f[k]|=bit;}};
const H=[];for(const S of (M3.solids?M3.solids():[])){const R=Math.max(Math.abs(S.b[0]),Math.abs(S.b[1]),Math.abs(S.b[2]),Math.abs(S.b[3]))*S.w*1.42;H.push([S.x|0,S.y|0,R|0]);blk(S.x,S.y,R,8);}
let TC=[];try{TC=Town.cols?Town.cols():[];}catch(e){}for(const c of TC)blk(c.x,c.y,c.r,8);
const hw=W.heartwood;blk(hw.x,hw.y,900,16);const tp=E.places().find(p=>p.id==='tree');blk(tp.x,tp.y,600,16);
const O=E.ORE;for(const nd of O.nodes||[])blk(nd.x,nd.y,120,32);const CL=[];for(const c of O.cliffs||[]){if(c.x!=null){CL.push(Object.keys(c).join(','));blk(c.x,c.y,(c.r||c.s||80),32);}}
const F=E.ledgeFront();
const VRP=(M3.VR&&M3.VR.list||[]).map(R=>[R[0],R[1],R[2].map(p=>[p[0]|0,p[1]|0])]);
return {vr:VRP,G,X0,n,h,f:Array.from(f),tr:Array.from(tr),H,TC:TC.length,TCb:TC.length?[Math.min(...TC.map(c=>c.x))|0,Math.max(...TC.map(c=>c.x))|0,Math.min(...TC.map(c=>c.y))|0,Math.max(...TC.map(c=>c.y))|0]:null,CL:CL.slice(0,3),ncl:(O.cliffs||[]).length,F:[F.x,F.y],places:E.places().map(p=>[p.id,p.x,p.y]),M:Mosby.MS.at,ore:(O.nodes||[]).map(nd=>[Math.round(nd.x),Math.round(nd.y),Math.round(nd.s||30)]),town:TC.map(c=>[Math.round(c.x),Math.round(c.y),Math.round(c.r)])};})()
