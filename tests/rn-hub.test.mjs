import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadWorker,source,query,ride} from './helpers/worker.mjs';

const cities=JSON.parse(fs.readFileSync(new URL('../cities.json',import.meta.url)));
const index=JSON.parse(fs.readFileSync(new URL('../rn-hub-index.json',import.meta.url)));
const page=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const workerSource=fs.readFileSync(new URL('../worker.js',import.meta.url),'utf8');
const city=(slug,uf)=>cities.find(item=>item.slug===slug&&item.uf===uf);
const cases=[
 ['taubate','SP','uberlandia','MG','ribeirao-preto'],
 ['sao-paulo','SP','curitiba','PR','registro'],
 ['belo-horizonte','MG','brasilia','DF','paracatu'],
 ['salvador','BA','recife','PE','aracaju'],
 ['campinas','SP','rio-de-janeiro','RJ','pindamonhangaba'],
];

test('checked-in national index covers the municipality base and has reproducible metadata',()=>{
 assert.equal(index.version,'rn-hub-2026.10.1');
 assert.equal(index.coverage.cities,cities.length);
 assert.ok(index.coverage.population/cities.length>.99);
 assert.ok(index.coverage.regic/cities.length>.99);
 assert.deepEqual(index.fields,['nationalScore','population','hierarchy','regicDegree']);
 assert.equal(index.weights.hierarchy+index.weights.connectivity+index.weights.population,1);
});

test('national discovery defaults to the documented 12-hour wait window',()=>{
 assert.match(page,/id="maxWait"[^>]+value="720"/);
 assert.doesNotMatch(page,/id="minWait"/);
 assert.match(page,/Tempo máximo de espera entre baldeações/);
 assert.match(workerSource,/DEFAULT_MAX_WAIT=720/);
});

test('a larger transfer limit does not discard a valid first-hop hub',async()=>{
 const offers={
   'taubate|guarulhos':[ride('04:40','06:20','first')],
   'guarulhos|uberlandia':[ride('15:00','22:20','second')],
 };
 const result=await query(loadWorker(source(offers)),{geo:cities,hubIndex:index,rnHubEnabled:true,
   origin:'taubate',destination:'uberlandia',maxTransfers:4,maxWait:720,debug:'1'});
 assert.ok(result.body.routes.some(route=>route.legs.map(leg=>`${leg.from}|${leg.to}`).join(',')===
   'taubate|guarulhos,guarulhos|uberlandia'),JSON.stringify(result.body.diagnostics));
 assert.ok(!result.body.diagnostics.skippedPairs.some(item=>item.pair==='taubate|guarulhos'));
});

test('national selector covers known useful regional hubs on all reference corridors',()=>{
 const api=loadWorker();
 let rnHubHits=0;
 for(const [from,fromUf,to,toUf,expected] of cases){
   const origin=city(from,fromUf),destination=city(to,toUf);
   const selected=api.selectRnHubCandidates(cities,origin,destination,index);
   rnHubHits+=Number(selected.some(item=>item.slug===expected));
   assert.ok(selected.length<=12);
 }
 assert.equal(rnHubHits,cases.length);
});

test('context remains dominant enough to retain small regional connectors',()=>{
 const api=loadWorker(),selected=api.selectRnHubCandidates(
   cities,city('taubate','SP'),city('uberlandia','MG'),index);
 assert.ok(selected.some(item=>{
   const record=index.records[`${item.slug}:${item.uf}`];
   return record&&record[1]<10_000;
 }));
});

test('homonymous municipalities never enter the graph with the same source slug',()=>{
 const api=loadWorker(),selected=api.selectRnHubCandidates(
   cities,city('barro','CE'),city('fronteiras','PI'),index,{maxCandidates:30});
 const slugs=selected.map(item=>item.slug);
 assert.equal(new Set(slugs).size,slugs.length);
 assert.ok(slugs.includes('cedro'));
});

for(const [from,fromUf,to,toUf,hub] of cases)test(`${from} → ${to} only returns a route after both real legs are verified`,async()=>{
 const offers={
   [`${from}|${hub}`]:[ride('08:00','10:00','first')],
   [`${hub}|${to}`]:[ride('10:20','12:30','second')],
 };
 const api=loadWorker(source(offers));
 const found=await query(api,{geo:cities,hubIndex:index,rnHubEnabled:true,origin:from,destination:to,maxTransfers:1,debug:'1'});
 assert.ok(found.body.routes.some(route=>route.legs.map(leg=>`${leg.from}|${leg.to}`).join(',')===`${from}|${hub},${hub}|${to}`),JSON.stringify(found.body.diagnostics));
 assert.equal(found.body.diagnostics.algorithm,index.version);
 assert.ok(found.body.diagnostics.completed<=found.body.diagnostics.queryLimit);

 const missing=await query(loadWorker(source({[`${from}|${hub}`]:offers[`${from}|${hub}`]})),
   {geo:cities,hubIndex:index,rnHubEnabled:true,origin:from,destination:to,maxTransfers:1});
 assert.equal(missing.body.count,0);
});

test('RN-HUB rejects incompatible schedules and respects transfer limits',async()=>{
 const offers={
   'taubate|ribeirao-preto':[ride('08:00','10:00')],
   'ribeirao-preto|uberlandia':[ride('12:01','14:00')],
 };
 const incompatible=await query(loadWorker(source(offers)),{geo:cities,hubIndex:index,rnHubEnabled:true,
   origin:'taubate',destination:'uberlandia',maxTransfers:1,maxWait:120,debug:'1'});
 assert.equal(incompatible.body.count,0);
 assert.ok(incompatible.body.diagnostics.rejectedWait>0);
 const zero=await query(loadWorker(source(offers)),{geo:cities,hubIndex:index,rnHubEnabled:true,
   origin:'taubate',destination:'uberlandia',maxTransfers:0});
 assert.equal(zero.body.count,0);
});

test('RN-HUB discovers a verified two-transfer journey',async()=>{
 const offers={
   'taubate|ribeirao-preto':[ride('06:00','08:00')],
   'ribeirao-preto|uberaba':[ride('08:20','10:00')],
   'uberaba|uberlandia':[ride('10:20','12:00')],
 };
 const result=await query(loadWorker(source(offers)),{geo:cities,hubIndex:index,rnHubEnabled:true,
   origin:'taubate',destination:'uberlandia',maxTransfers:2,debug:'1'});
 assert.ok(result.body.routes.some(route=>route.legs.map(leg=>`${leg.from}|${leg.to}`).join(',')===
   'taubate|ribeirao-preto,ribeirao-preto|uberaba,uberaba|uberlandia'));
 assert.ok(result.body.diagnostics.completed<=55);
});

test('RN-HUB reports unavailable sources without inventing a connection',async()=>{
 const api=loadWorker({fetch:async()=>new Response('Unavailable',{status:503})});
 const result=await query(api,{geo:cities,hubIndex:index,rnHubEnabled:true,
   origin:'salvador',destination:'recife',maxTransfers:2});
 assert.equal(result.body.count,0);
 assert.equal(result.body.incomplete,true);
 assert.ok(result.body.warning);
});

test('feature flag off does not revive an intermediate-city selector',async()=>{
 const upstream=source({}),api=loadWorker(upstream);
 const result=await query(api,{geo:cities,hubIndex:null,rnHubEnabled:false,
   origin:'taubate',destination:'uberlandia',debug:'1'});
 assert.equal(result.body.diagnostics.algorithm,'cache-only');
 assert.deepEqual(result.body.diagnostics.selectedHubs,[]);
 assert.equal(upstream.calls.length,0);
});
