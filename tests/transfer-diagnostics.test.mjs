// Deterministic diagnostic regression test for Taubaté -> Campinas -> Ribeirão Preto.
// Run with: node --test tests/transfer-diagnostics.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../worker.js',import.meta.url),'utf8').replace('export default','const workerDefault =');
const cities=[
 {name:'Taubaté, SP',slug:'taubate',lat:-23.0104,lng:-45.5593},
 {name:'Campinas, SP',slug:'campinas',lat:-22.9053,lng:-47.0659},
 {name:'Ribeirão Preto, SP',slug:'ribeirao-preto',lat:-21.1699,lng:-47.8099},
];
function run(pages,maxTransfers=2){
 const queried=[];
 const context={URL,Headers,Response,AbortController,setTimeout,clearTimeout,Date,console,fetch:async url=>{
  const u=new URL(url),match=u.pathname.match(/\\/horario\\/([^/]+)\\/([^/]+)/);
  assert.ok(match,'Unexpected request '+url);
  const pair=match[1]+'|'+match[2];queried.push(pair);
  const rides=pages[pair]||[];
  const html=rides.map(([departure,arrival])=>'<a href="/comprar-passagem/blablacar?departure='+departure+'&arrival='+arrival+'&price=25">ride</a>').join('');
  return {ok:true,text:async()=>html};
 }};
 vm.createContext(context);
 vm.runInContext(source+';globalThis.__findRoutes=findRoutes;',context);
 return context.__findRoutes('taubate','ribeirao-preto','2026-10-13','Taubaté','Ribeirão Preto',5,60,maxTransfers,cities,false).then(result=>({result,queried}));
}
test('Campinas connection is queried and returned when waits match',async()=>{
 const {result,queried}=await run({'taubate|campinas':[['08:00','10:00']],'campinas|ribeirao-preto':[['10:30','12:30']]});
 assert.ok(queried.includes('taubate|campinas'));
 assert.ok(queried.includes('campinas|ribeirao-preto'));
 assert.ok(result.routes.some(r=>r.legs.map(l=>l.from+'|'+l.to).join(',')==='taubate|campinas,campinas|ribeirao-preto'));
 assert.equal(result.diagnostics.failed,0);
});
test('Incompatible waiting time is counted and rejected',async()=>{
 const {result}=await run({'taubate|campinas':[['08:00','10:00']],'campinas|ribeirao-preto':[['12:30','14:00']]});
 assert.equal(result.routes.length,0);
 assert.ok(result.diagnostics.rejectedWait>0);
});
