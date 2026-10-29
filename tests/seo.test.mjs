import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const root='https://rua-nossa.lgsr96.workers.dev';
test('sitemap URLs resolve to static HTML with matching canonicals and unique titles',()=>{
 const urls=[...read('sitemap.xml').matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1]);
 assert.equal(urls.length,5);const titles=new Set();
 for(const url of urls){assert.ok(url.startsWith(root+'/'));const path=new URL(url).pathname;const body=read(path==='/'?'index.html':path.slice(1));assert.ok(body.includes('rel="canonical" href="'+url+'"'));titles.add(body.match(/<title>(.*?)<\/title>/)[1]);assert.match(body,/v0\.10\.0/);assert.match(body,/href="\/versoes.html"/)}
 assert.equal(titles.size,urls.length);
});
test('route CTAs use real catalog slugs and never start a search automatically',()=>{
 const catalog=JSON.parse(read('cities.json'));
 for(const name of ['taubate-para-campinas','taubate-para-pirassununga','formosa-para-brasilia']){
 const body=read('caronas/'+name+'.html');const url=new URL(body.match(/href="(\/\?origin=[^"]+)"/)[1].replaceAll('&amp;','&'),root);
 for(const key of ['origin','destination'])assert.ok(catalog.find(c=>c.slug===url.searchParams.get(key)));
 assert.match(body,/Não confirma horários, preços, vagas/);
 }
});
test('route prefill ignores unknown slugs and uses catalog objects',()=>{
 const source=read('app.js'),start=source.indexOf('function applyRoutePrefill('),selected=[];
 const city={name:'Formosa, GO',slug:'formosa'};
 const sandbox={$:s=>s,setCity:(selector,c)=>selected.push({selector,c})};
 vm.runInNewContext(source.slice(start)+';globalThis.prefill=applyRoutePrefill;',sandbox);
 sandbox.prefill(new URLSearchParams('origin=formosa&destination=invalid'),[city]);
 assert.equal(selected.length,1);assert.equal(selected[0].c,city);assert.equal(selected[0].selector,'#origin');
});
