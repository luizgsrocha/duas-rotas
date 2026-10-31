import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadWorker,query,source,ride} from './helpers/worker.mjs';

const cities=JSON.parse(fs.readFileSync(new URL('../cities.json',import.meta.url)));
const index=JSON.parse(fs.readFileSync(new URL('../rn-hub-index.json',import.meta.url)));
function memoryCache({now=()=>Date.now()}={}){
 const store=new Map();
 const live=key=>{
  const entry=store.get(key);
  if(entry&&entry.expiresAt<=now()){store.delete(key);return null}
  return entry??null;
 };
 return {store,
  async get(k,type){const entry=live(k);return entry===null?null:type==='json'?JSON.parse(entry.value):entry.value},
  async put(k,v,{expirationTtl=Infinity}={}){store.set(k,{value:v,expiresAt:now()+expirationTtl*1000})},
  async list({prefix,limit=1000}){return{keys:[...store.keys()].filter(name=>live(name)&&name.startsWith(prefix)).slice(0,limit).map(name=>({name}))}}
 };
}
const options={geo:cities,hubIndex:index,rnHubEnabled:true,origin:'taubate',destination:'uberlandia',maxTransfers:2,maxWait:720};

test('segment cache reuses successful leg responses between searches',async()=>{
 const upstream=source({'taubate|ribeirao-preto':[ride('05:00','07:00')],
   'ribeirao-preto|uberlandia':[ride('08:00','11:00')]}),cache=memoryCache(),api=loadWorker({fetch:upstream.fetch,cache});
 const first=await query(api,options),callsAfterFirst=upstream.calls.length;
 const second=await query(api,options);
 assert.ok(first.body.count>0);assert.ok(second.body.count>0);
 assert.ok(callsAfterFirst>0);assert.ok(upstream.calls.length-callsAfterFirst<callsAfterFirst);
 assert.ok(cache.store.size>0);
});

test('source errors are not cached and can recover on the next request',async()=>{
 let shouldFail=true,calls=0;
 const upstream={fetch:async input=>{calls++;if(shouldFail)return new Response('Unavailable',{status:503});
   const route=source({'taubate|ribeirao-preto':[ride('05:00','07:00')],
     'ribeirao-preto|uberlandia':[ride('08:00','11:00')]});return route.fetch(input)}};
 const cache=memoryCache(),api=loadWorker({fetch:upstream.fetch,cache});
 await query(api,options);const afterFailure=calls;shouldFail=false;
 const recovered=await query(api,options);
 assert.ok(calls>afterFailure);assert.ok(recovered.body.count>0);
});

test('successful segment cache expires after ten minutes',async()=>{
 let now=0;
 const upstream=source({'taubate|campinas':[ride('06:00','08:00')]}),cache=memoryCache({now:()=>now});
 const api=loadWorker({fetch:upstream.fetch,cache,clock:()=>now});
 const options={origin:'taubate',destination:'campinas',mode:'direct',maxTransfers:0,date:'2026-10-31'};
 const first=await query(api,options);
 assert.equal(first.body.count,1);assert.equal(upstream.calls.length,1);
 now=599_000;
 const cached=await query(api,options);
 assert.equal(cached.body.count,1);assert.equal(upstream.calls.length,1);
 now=600_001;
 const refreshed=await query(api,options);
 assert.equal(refreshed.body.count,1);assert.equal(upstream.calls.length,2);
});

test('segment cache key isolates direction, date, and provider route slugs',async()=>{
 const cache=memoryCache(),api=loadWorker({fetch:source({}).fetch,cache});
 // Cold requests are retained by exact source direction and requested date.
 for(const [from,to,date] of [['taubate','ribeirao-preto','2026-10-14'],
   ['ribeirao-preto','taubate','2026-10-14'],['taubate','ribeirao-preto','2026-10-15']]){
  await api.worker.fetch(new Request(`https://duas-rotas.example/api/exists?date=${date}&origin=${from}&destination=${to}&mode=transfers&maxTransfers=2&maxWait=90`),
   {ASSETS:{fetch:async input=>Response.json(new URL(input).pathname==='/rn-hub-index.json'?index:cities)},RN_HUB_ENABLED:'1',RIDES_CACHE:cache});
 }
 const keys=[...cache.store.keys()];
 assert.ok(keys.some(key=>key.includes('2026-10-14:taubate:campinas')));
 assert.ok(keys.some(key=>key.includes('2026-10-14:campinas:taubate')));
 assert.ok(keys.some(key=>key.includes('2026-10-15:taubate:campinas')));
});

test('cached Taubaté → Campinas and Campinas → Uberlândia legs compose a later journey',async()=>{
 let offline=false;
 const upstream=source({'taubate|campinas':[ride('06:00','08:00','first')],
   'campinas|uberlandia':[ride('09:00','15:00','second')]}),cache=memoryCache();
 const api=loadWorker({fetch:input=>offline?Promise.reject(new Error('upstream must not be needed for cached route')):upstream.fetch(input),cache});
 await query(api,{geo:cities,hubIndex:index,rnHubEnabled:true,origin:'taubate',destination:'campinas',mode:'direct',maxTransfers:0,date:'2026-10-31'});
 await query(api,{geo:cities,hubIndex:index,rnHubEnabled:true,origin:'campinas',destination:'uberlandia',mode:'direct',maxTransfers:0,date:'2026-10-31'});
 offline=true;
 const composed=await query(api,{geo:cities,hubIndex:index,rnHubEnabled:true,origin:'taubate',destination:'uberlandia',mode:'transfers',maxTransfers:1,maxWait:720,date:'2026-10-31',debug:'1'});
 assert.ok(composed.body.routes.some(route=>route.legs.map(leg=>`${leg.from}|${leg.to}`).join(',')==='taubate|campinas,campinas|uberlandia'),JSON.stringify(composed.body.diagnostics));
 assert.ok(composed.body.diagnostics.cachedHubs.includes('campinas:SP'));
});
