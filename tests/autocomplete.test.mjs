import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadAutocomplete,cities} from './helpers/autocomplete.mjs';
const {rankCities,cityNormalize}=loadAutocomplete();
for(const [query,name] of [
 ['sao paulo','São Paulo, SP'],['  SÃO   PAULO  ','São Paulo, SP'],
 ['SÃO---PAULO / SP','São Paulo, SP'],['taubatte','Taubaté, SP'],
 ['ribeirao preto','Ribeirão Preto, SP'],['ribeirao pretoo','Ribeirão Preto, SP'],
 ['sao paolo','São Paulo, SP'],['taubate sp','Taubaté, SP']
])test(`${query} ranks ${name} first`,()=>assert.equal(rankCities(cities,query)[0]?.name,name));
test('homonyms keep distinct state and slug; explicit state filters',()=>{
 const results=rankCities(cities,'bom jesus');
 const exact=results.filter(c=>cityNormalize(c.name).startsWith('bom jesus ')&&cityNormalize(c.name).split(' ').length===3);
 assert.ok(new Set(exact.map(c=>c.uf)).size>=3);
 assert.equal(new Set(exact.map(c=>c.name)).size,exact.length);
 for(const q of ['bom jesus rs','bom jesus, RN','bom jesus / PI']){
   const found=rankCities(cities,q);assert.ok(found.length);assert.ok(found.every(c=>c.uf.toLowerCase()===q.slice(-2).toLowerCase()));
 }
});
test('exact before prefix, word before substring, fuzzy last',()=>{
 const data=['X Taubaté','Taubaté do Sul','Taubaté','Xtaubaté','Taubatez'].map((name,i)=>({name:name+', SP',uf:'SP',slug:String(i)}));
 assert.deepEqual(Array.from(rankCities(data,'taubate'),c=>c.slug),['2','4','1','0','3']);
});
test('empty, punctuation, short, nonsense, limit and stable identity',()=>{
 assert.equal(rankCities(cities,'')[0],cities[0]);
 assert.equal(rankCities(cities,'---')[0],cities[0]);
 assert.equal(rankCities(cities,'zzzzzzzzzzzz').length,0);
 assert.ok(rankCities(cities,'s').every(c=>cityNormalize(c.name).includes('s')));
 assert.equal(rankCities(cities,'sao',7).length,7);
 assert.equal(rankCities(cities,'sao paulo')[0],cities.find(c=>c.name==='São Paulo, SP'));
 assert.deepEqual(Array.from(rankCities(cities,'bom jesus'),c=>c.slug),Array.from(rankCities(cities,'bom jesus'),c=>c.slug));
});
test('bounded prefix distance agrees with exhaustive edit-distance oracle',()=>{
 const {cityDistance,cityPrefixDistance}=loadAutocomplete();
 for(const a of ['taubatte','sao paolo','abcd','ribeirao pretoo'])
 for(const b of ['taubate','sao paulo','abcde','ribeirao preto','zzzzzzzz','a'])
 for(const limit of [1,2]){
   let expected=limit+1;
   for(let n=Math.max(1,a.length-limit);n<=Math.min(b.length,a.length+limit);n++)expected=Math.min(expected,cityDistance(a,b.slice(0,n),limit));
   assert.equal(Math.min(limit+1,cityPrefixDistance(a,b,limit)),Math.min(limit+1,expected),`${a}/${b}/${limit}`);
 }
});
