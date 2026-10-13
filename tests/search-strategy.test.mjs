import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../worker.js',import.meta.url),'utf8');
const context={Math,Number,Set};
vm.createContext(context);
const distanceCode=source.match(/function distance\(a,b\)\{[^\n]+\}/)?.[0];
const classifierCode=source.slice(source.indexOf('function classifySearchStrategy('),source.indexOf('function selectBrgHubs('));
const geoCode=source.slice(source.indexOf('function selectHubs('),source.indexOf('function waitMinutes('));
assert.ok(distanceCode&&classifierCode&&geoCode,'routing functions must exist');
vm.runInContext(distanceCode+'\n'+classifierCode+'\n'+geoCode,context);
const cities=[
 {slug:'taubate',lat:-23.0104,lng:-45.5593},
 {slug:'ribeirao-preto',lat:-21.1699,lng:-47.8099},
 {slug:'brasilia',lat:-15.7795,lng:-47.9297},
 {slug:'campinas',lat:-22.9053,lng:-47.0659},
 {slug:'missing-coordinates'},
];
test('reference journey and reverse direction remain short',()=>{
 assert.equal(context.classifySearchStrategy(cities,'taubate','ribeirao-preto'),'short');
 assert.equal(context.classifySearchStrategy(cities,'ribeirao-preto','taubate'),'short');
});
test('shorter journeys use BRG; Brasília uses geographic selector',()=>{
 assert.equal(context.classifySearchStrategy(cities,'taubate','campinas'),'short');
 assert.equal(context.classifySearchStrategy(cities,'taubate','brasilia'),'long');
});
test('missing coordinates never silently select a strategy',()=>{
 assert.equal(context.classifySearchStrategy(cities,'taubate','missing-coordinates'),null);
});
test('geographic selector is still bounded by the existing 90 km cap',()=>{
 const hubs=context.selectHubs(cities,cities[0],cities[2]);
 assert.ok(Array.isArray(hubs));
 assert.ok(source.includes('strategy==="long"?selectHubs(geo,from,to):selectBrgHubs(geo,from,to)'));
 assert.ok(source.includes('strategy==="long"?Math.min(90,Math.max(15,directDistance*.18)):60'));
});
