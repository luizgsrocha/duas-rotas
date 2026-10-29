import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadWorker,query,cities as baseCities} from './helpers/worker.mjs';

const catalog=JSON.parse(readFileSync(new URL('../cities.json',import.meta.url),'utf8'));
const sp=catalog.filter(city=>city.uf==='SP');
const rj=catalog.filter(city=>city.uf==='RJ');

const expectedProviderOverrides={AC:2,AL:6,AP:0,AM:3,BA:42,CE:25,DF:0,ES:5,GO:183,MA:14,MG:664,MS:49,MT:5,PA:20,PB:13,PE:14,PI:7,PR:289,RJ:30,RN:5,RO:5,RR:0,RS:391,SC:181,SE:2,SP:372,TO:9};

test('national catalog has the confirmed provider overrides for every UF',()=>{
  assert.equal(catalog.length,5571);
  assert.equal(catalog.filter(city=>city.buscaOnibusSlug).length,2336);
  for(const [uf,expected] of Object.entries(expectedProviderOverrides)){
    const state=catalog.filter(city=>city.uf===uf);
    assert.equal(state.filter(city=>city.buscaOnibusSlug).length,expected,uf);
    assert.equal(new Set(state.map(city=>city.slug)).size,state.length,uf);
  }
});

test('homonymous municipalities keep UF-specific provider identifiers',()=>{
  const expected={
    'MG|abadia-dos-dourados':'abadia-dos-dourados-mg',
    'PR|adrianopolis':'adrianopolis-pr',
    'RS|acegua':'acegua-rs',
    'GO|formosa':'formosa-go',
    'BA|manoel-vitorino':'manoel-vitorino-ba'
  };
  for(const [key,buscaOnibusSlug] of Object.entries(expected)){
    const [uf,slug]=key.split('|'),city=catalog.find(item=>item.uf===uf&&item.slug===slug);
    assert.ok(city,key);
    assert.equal(city.buscaOnibusSlug,buscaOnibusSlug,key);
  }
});

test('São Paulo catalog keeps 645 municipalities and 372 provider overrides',()=>{
  assert.equal(sp.length,645);
  assert.equal(sp.filter(city=>city.buscaOnibusSlug).length,372);
  assert.equal(new Set(sp.map(city=>city.slug)).size,645);
});

test('Rio de Janeiro catalog keeps 92 municipalities and 30 provider overrides',()=>{
  assert.equal(rj.length,92);
  assert.equal(rj.filter(city=>city.buscaOnibusSlug).length,30);
  assert.equal(new Set(rj.map(city=>city.slug)).size,92);
});

test('Rio de Janeiro provider overrides remain separate from internal slugs',()=>{
  const expected={
    aperibe:'aperibe-rj',
    'armacao-dos-buzios':'armacao-dos-buzios-rj',
    'bom-jardim':'bom-jardim-rj',
    mesquita:'mesquita-rj',
    'rio-claro':'rio-claro-rj',
    valenca:'valenca-rj'
  };
  for(const [slug,buscaOnibusSlug] of Object.entries(expected)){
    const city=rj.find(item=>item.slug===slug);
    assert.ok(city,slug);
    assert.equal(city.slug,slug);
    assert.equal(city.buscaOnibusSlug,buscaOnibusSlug);
  }
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
