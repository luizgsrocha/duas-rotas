#!/usr/bin/env node
import fs from 'node:fs';
import {performance} from 'node:perf_hooks';
import {serialize} from 'node:v8';
import {loadWorker,source,query,ride} from '../tests/helpers/worker.mjs';

const cities=JSON.parse(fs.readFileSync(new URL('../cities.json',import.meta.url)));
const indexText=fs.readFileSync(new URL('../rn-hub-index.json',import.meta.url),'utf8');
const index=JSON.parse(indexText);
const city=(slug,uf)=>cities.find(item=>item.slug===slug&&item.uf===uf);
const cases=[
 ['taubate','SP','uberlandia','MG','ribeirao-preto'],
 ['sao-paulo','SP','curitiba','PR','registro'],
 ['belo-horizonte','MG','brasilia','DF','paracatu'],
 ['salvador','BA','recife','PE','aracaju'],
 ['campinas','SP','rio-de-janeiro','RJ','pindamonhangaba'],
];

function measure(selector,rounds=100){
 const samples=[];
 for(let round=0;round<rounds;round++)for(const [from,fromUf,to,toUf] of cases){
   const start=performance.now();selector(cities,city(from,fromUf),city(to,toUf));
   samples.push(performance.now()-start);
 }
 samples.sort((a,b)=>a-b);
 return {p50Ms:+samples[Math.floor(samples.length*.50)].toFixed(3),
   p95Ms:+samples[Math.floor(samples.length*.95)].toFixed(3),maxMs:+samples.at(-1).toFixed(3)};
}

function hits(selector){return cases.reduce((total,[from,fromUf,to,toUf,expected])=>
 total+Number(selector(cities,city(from,fromUf),city(to,toUf)).some(item=>item.slug===expected)),0)}

const api=loadWorker();
const rnSelector=(all,from,to)=>api.selectRnHubCandidates(all,from,to,index);
const journey=await query(loadWorker(source({
 'taubate|ribeirao-preto':[ride('06:00','08:00')],
 'ribeirao-preto|uberaba':[ride('08:20','10:00')],
 'uberaba|uberlandia':[ride('10:20','12:00')],
})),{geo:cities,hubIndex:index,rnHubEnabled:true,origin:'taubate',destination:'uberlandia',maxTransfers:2,debug:'1'});

const report={
 dataset:{municipalities:cities.length,indexBytes:Buffer.byteLength(indexText),
   v8SerializedBytes:serialize(index).byteLength,coverage:index.coverage},
 selector:{rnHub:measure(rnSelector)},
 referenceHubRecall:{rnHub:hits(rnSelector),total:cases.length},
 verifiedSearch:{routes:journey.body.count,queries:journey.body.diagnostics.completed,
   queryLimit:journey.body.diagnostics.queryLimit,backwardProbes:journey.body.diagnostics.backwardProbes},
};
if(report.referenceHubRecall.rnHub!==report.referenceHubRecall.total)throw new Error('RN-HUB reference-hub recall regression');
if(!report.verifiedSearch.routes||report.verifiedSearch.queries>report.verifiedSearch.queryLimit)throw new Error('Search budget/verification regression');
console.log(JSON.stringify(report,null,2));
