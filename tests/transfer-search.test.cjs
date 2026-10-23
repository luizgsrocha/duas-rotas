// Regressão: duas caronas individuais precisam gerar a combinação via Campinas.
// Usa o algoritmo real com fonte simulada, sem depender de disponibilidade externa.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('worker.js','utf8');
const start=source.indexOf('const HUB_SLUGS=');
const end=source.indexOf('async function loadLocalCities(',start);
assert.ok(start>=0&&end>start,'Funções de busca encontradas');
const cities=JSON.parse(fs.readFileSync('cities.json','utf8'));
const p=n=>cities.find(x=>x.slug===n);
const geo=[p('taubate'),p('campinas'),p('pirassununga'),p('sao-jose-dos-campos'),p('limeira'),p('americana'),p('jundiai'),p('pocos-de-caldas')];
assert.ok(geo.every(Boolean),'Municípios presentes');
const dist=(a,b)=>{const r=Math.PI/180,x=(b.lat-a.lat)*r,y=(b.lng-a.lng)*r,v=Math.sin(x/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(y/2)**2;return 12742*Math.asin(Math.sqrt(v))};
function run(mock){
 const ctx={Date,Math,Set,Map,Number,console,distance:dist,minutes:s=>{const m=String(s).match(/(\d{1,2}):(\d{2})/);return m?Number(m[1])*60+Number(m[2]):-1},makeRoute:legs=>({legs,totalPrice:0}),fromBuscaSlug:(_,slug)=>slug,getDirectRides:mock};
 vm.runInNewContext(source.slice(start,end),ctx);
 return ctx;
}
test('Campinas é hub válido dentro do desvio geométrico de 60 km',()=>{
 const ctx=run(async()=>[]);
 const hubs=ctx.selectBrgHubs(geo,p('taubate'),p('pirassununga'));
 assert.ok(hubs.some(x=>x.slug==='campinas'));
 const detour=dist(p('taubate'),p('campinas'))+dist(p('campinas'),p('pirassununga'))-dist(p('taubate'),p('pirassununga'));
 assert.ok(detour>30&&detour<60);
});
test('duas caronas conectáveis via Campinas aparecem com uma baldeação',async()=>{
 const calls=[];
 const ctx=run(async(a,b)=>{calls.push(a+'>'+b);
  if(a==='taubate'&&b==='campinas')return [{departure:'08:00',arrival:'10:00',price:'35'}];
  if(a==='campinas'&&b==='pirassununga')return [{departure:'10:30',arrival:'12:00',price:'30'}];
  return [];
 });
 const result=await ctx.findRoutes('taubate','pirassununga','2026-10-14','Taubaté, SP','Pirassununga, SP',5,60,1,geo,false);
 assert.ok(result.routes.some(r=>r.legs.map(l=>l.from+'>'+l.to).join('|')==='taubate>campinas|campinas>pirassununga'),JSON.stringify({calls,routes:result.routes}));
});
test('orçamento de buscas distribui finalizações entre hubs',async()=>{
 const calls=[];
 const ctx=run(async(a,b)=>{calls.push(a+'>'+b);
  if(a==='taubate'&&b==='sao-jose-dos-campos')return Array.from({length:24},(_,i)=>({departure:'06:00',arrival:String(7+Math.floor(i/60)).padStart(2,'0')+':'+String(i%60).padStart(2,'0')}));
  if(a==='taubate'&&b==='campinas')return [{departure:'08:00',arrival:'10:00'}];
  if(a==='campinas'&&b==='pirassununga')return [{departure:'10:30',arrival:'12:00'}];
  return [];
 });
 const result=await ctx.findRoutes('taubate','pirassununga','2026-10-14','Taubaté, SP','Pirassununga, SP',5,60,1,geo,false);
 assert.ok(result.routes.some(r=>r.legs[0].to==='campinas'),JSON.stringify({calls,routes:result.routes}));
});
\ntest('Formosa, GO usa o slug canônico do BuscaOnibus',()=>{\n const ctx=run(async()=>[]);\n assert.equal(ctx.fromBuscaSlug(cities,'formosa'),'formosa-go');\n assert.equal(ctx.fromBuscaSlug(cities,'brasilia'),'brasilia');\n});\n