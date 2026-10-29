import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadWorker,query,cities as baseCities} from './helpers/worker.mjs';

const catalog=JSON.parse(readFileSync(new URL('../cities.json',import.meta.url),'utf8'));
const sp=catalog.filter(city=>city.uf==='SP');

test('São Paulo catalog keeps 645 municipalities and 372 provider overrides',()=>{
  assert.equal(sp.length,645);
  assert.equal(sp.filter(city=>city.buscaOnibusSlug).length,372);
  assert.equal(new Set(sp.map(city=>city.slug)).size,645);
});

test('confirmed BuscaOnibus exceptions are stored separately from internal slugs',()=>{
  const expected={
    adolfo:'adolfo-sp',
    alambari:'alambari-sp',
    'alfredo-marcondes':'alfredo-marcondes-sp',
    'santa-barbara-d-oeste':'santa-barbara-doeste'
  };
  for(const [slug,buscaOnibusSlug] of Object.entries(expected)){
    const city=sp.find(item=>item.slug===slug);
    assert.ok(city,slug);
    assert.equal(city.slug,slug);
    assert.equal(city.buscaOnibusSlug,buscaOnibusSlug);
  }
});

test('unresolved municipalities are not assigned a guessed provider slug',()=>{
  for(const slug of ['aparecida-d-oeste','estrela-d-oeste','guarani-d-oeste','palmeira-d-oeste','pinhalzinho','santa-clara-d-oeste','santa-rita-d-oeste','sao-joao-do-pau-d-alho']){
    const city=sp.find(item=>item.slug===slug);
    assert.ok(city,slug);
    assert.equal(city.buscaOnibusSlug,undefined);
  }
});

test('direct search uses buscaOnibusSlug without changing the public city slug',async()=>{
  const calls=[];
  const api=loadWorker({fetch:async input=>{
    calls.push(new URL(input).pathname);
    return new Response('');
  }});
  const geo=[...baseCities.filter(city=>city.slug!=='pirassununga'),{name:'Adolfo',slug:'adolfo',buscaOnibusSlug:'adolfo-sp',uf:'SP',lat:-21.2325,lng:-49.6451}];
  const result=await query(api,{geo,destination:'adolfo',mode:'direct',maxTransfers:0});
  assert.equal(result.status,200);
  assert.ok(calls.some(path=>path.endsWith('/taubate/adolfo-sp')));
  assert.equal(result.body.destination,'adolfo');
});

test('/api/cities exposes the effective provider slug used by the audit',async()=>{
  const geo=[{name:'Adolfo, SP',slug:'adolfo',buscaOnibusSlug:'adolfo-sp',uf:'SP'}];
  const api=loadWorker();
  const response=await api.worker.fetch(new Request('https://duas-rotas.example/api/cities'),{ASSETS:{fetch:async()=>Response.json(geo)}});
  assert.equal(response.status,200);
  assert.deepEqual(await response.json(),[{name:'Adolfo, SP',slug:'adolfo',uf:'SP',buscaOnibusSlug:'adolfo-sp'}]);
});
