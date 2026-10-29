import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {loadWorker,query} from './helpers/worker.mjs';

test('403 is an unavailable source, never an empty successful search',async()=>{
 const api=loadWorker({fetch:async()=>new Response('Forbidden',{status:403})});
 const {status,body}=await query(api,{mode:'direct',debug:'1'});
 assert.equal(status,502);
 assert.equal(body.code,'SOURCE_UNAVAILABLE');
 assert.equal(body.sourceFailure.status,403);
 assert.equal(body.sourceFailure.category,'provider_blocked');
 assert.match(body.error,/recusou a consulta/);
 assert.equal(body.count,undefined);
});

test('each transfer pair is fetched only once, including failures',async()=>{
 const calls=[];
 const api=loadWorker({fetch:async input=>{calls.push(new URL(input).pathname);return new Response('Forbidden',{status:403})}});
 const {body}=await query(api,{mode:'transfers',debug:'1'});
 assert.equal(body.incomplete,true);
 assert.ok(calls.length>0);
 assert.equal(calls.length,new Set(calls).size);
 assert.equal(body.diagnostics.failed,calls.length);
 assert.equal(body.diagnostics.sourceFailures.length,calls.length);
});

const source=readFileSync(new URL('../app.js',import.meta.url),'utf8');
for(const scenario of ['failed','incomplete','empty'])test(`UI differentiates ${scenario} search from confirmed absence`,async()=>{
 const elements=new Map();
 const element=selector=>{if(!elements.has(selector))elements.set(selector,{value:'',textContent:'',innerHTML:'',hidden:true});return elements.get(selector)};
 element('#date').value='2026-11-05';element('#maxWait').value='90';element('#maxTransfers').value='0';
 const sandbox={window:{scrollTo(){}},document:{documentElement:{scrollHeight:0}},$ :element,selectedCity:el=>el===element('#origin')?{name:'Formosa',slug:'formosa'}:{name:'Brasília',slug:'brasilia'},setTimeout,clearTimeout,AbortController,renderLastResults(){},fetch:async()=>({ok:scenario!=='failed',json:async()=>scenario==='failed'?{error:'A fonte recusou a consulta.'}:{count:0,routes:[],incomplete:scenario==='incomplete',warning:'Consulta incompleta.'}})};
 const start=source.indexOf('async function runSearchModes('),end=source.indexOf('\nfunction renderLastResults()',start);
 vm.runInNewContext('let lastResults,lastDate;'+source.slice(start,end)+'\nglobalThis.check=check;',sandbox);
 await sandbox.check();
 const message=element('#status').textContent;
 if(scenario==='empty')assert.match(message,/Nenhuma rota/);
 else{assert.doesNotMatch(message,/Nenhuma rota/);assert.match(message,/incompleta|Não foi possível/)}
});
