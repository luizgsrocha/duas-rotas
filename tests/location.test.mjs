import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const normalizeStart=source.indexOf('function cityNormalize('),normalizeEnd=source.indexOf('\nconst citySearchCache',normalizeStart);
const resolveStart=source.indexOf('function resolveLocationCity('),resolveEnd=source.indexOf('\nasync function useLocation()',resolveStart);
const sandbox={};
vm.runInNewContext(source.slice(normalizeStart,normalizeEnd)+source.slice(resolveStart,resolveEnd)+'\nglobalThis.resolveLocationCity=resolveLocationCity;',sandbox);

const taubate={name:'Taubaté, SP',slug:'taubate'};
const lookup=new Map([['taubate sp',taubate]]);

test('Nominatim response for Taubaté resolves to the catalog city',()=>{
  const address={city:'Taubaté',state:'São Paulo','ISO3166-2-lvl4':'BR-SP',country_code:'br'};
  assert.equal(sandbox.resolveLocationCity(address,lookup),taubate);
});

test('municipality prefix, accent and lowercase ISO are normalized',()=>{
  const address={municipality:'Município de Taubate','ISO3166-2-lvl6':'br-sp'};
  assert.equal(sandbox.resolveLocationCity(address,lookup),taubate);
});

test('location without municipality or UF is rejected',()=>{
  assert.equal(sandbox.resolveLocationCity({state:'São Paulo'},lookup),null);
  assert.equal(sandbox.resolveLocationCity({city:'Taubaté'},lookup),null);
});
