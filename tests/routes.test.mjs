import test from 'node:test';
import assert from 'node:assert/strict';
import {loadWorker,source,query,cities,city,ride} from './helpers/worker.mjs';

const viaCampinas={
  'taubate|campinas':[ride('06:00','08:20','first','74')],
  'campinas|pirassununga':[ride('08:30','10:00','second','39')]
};

test('Taubaté → Campinas → Pirassununga survives an unrelated source failure',async()=>{
  const upstream=source(viaCampinas,{fail:['taubate|sao-jose-dos-campos']});
  const api=loadWorker(upstream),{status,body}=await query(api);
  assert.equal(status,200);assert.equal(body.incomplete,true);
  const result=body.routes.find(r=>r.legs.length===2&&r.legs[0].to==='campinas');
  assert.ok(result);assert.equal(result.totalPrice,113);
  assert.ok(!upstream.calls.includes('taubate|pirassununga'));
});

test('Campinas remains eligible within 60 km extra',()=>{
  const api=loadWorker();
  assert.ok(api.selectBrgHubs(cities,cities[0],cities[1]).some(c=>c.slug==='campinas'));
});

for(const limit of [0,1,2,3,4])test('maximum '+limit+' transfers is applied during graph expansion',async()=>{
  const geo=Array.from({length:7},(_,i)=>city('city-'+i,0,i*.1));
  const offers={};
  for(let i=0;i<6;i++)for(let j=i+1;j<7;j++)
    offers['city-'+i+'|city-'+j]=[ride((6+i)+':00',(6+j)+':00',i+'-'+j)];
  const upstream=source(offers),api=loadWorker(upstream);
  const {status,body}=await query(api,{geo,origin:'city-0',destination:'city-6',maxTransfers:limit,mode:'all'});
  assert.equal(status,200);assert.ok(body.routes.length);
  assert.ok(body.routes.every(r=>r.legs.length-1<=limit));
  // Confirm useful routes also survive; rejecting everything would not pass.
  const chain=Array.from({length:limit+2},(_,i)=>city('chain-'+i,0,i*.3));
  const chainOffers={};
  for(let i=0;i<chain.length-1;i++)chainOffers['chain-'+i+'|chain-'+(i+1)]=[ride((6+i)+':00',(7+i)+':00','chain'+i)];
  const exact=await query(loadWorker(source(chainOffers)),{geo:chain,origin:'chain-0',destination:'chain-'+(chain.length-1),maxTransfers:limit,mode:'all'});
  assert.ok(exact.body.routes.some(r=>r.legs.length-1===limit));
  if(limit>0){
    const tooFew=await query(loadWorker(source(chainOffers)),{geo:chain,origin:'chain-0',destination:'chain-'+(chain.length-1),maxTransfers:limit-1,mode:'all'});
    assert.equal(tooFew.body.count,0);
  }
  assert.ok(upstream.calls.length<=56);
});

for(const [name,first,second,expected,minWait,maxWait] of [
  ['minimum wait',ride('06:00','08:20'),ride('08:30','10:00'),0,20,90],
  ['maximum wait',ride('06:00','08:20'),ride('10:00','11:00'),0,0,90],
  ['departure before arrival',ride('06:00','08:20'),ride('08:00','10:00'),0,0,90],
  ['overnight intermediate arrival',ride('23:00','00:30'),ride('01:00','02:00'),0,0,90],
  ['overnight final arrival',ride('20:00','21:00'),ride('21:30','00:30'),1,0,90],
  ['exact wait boundaries',ride('06:00','08:20'),ride('08:30','10:00'),1,10,10]
])test(name,async()=>{
  const api=loadWorker(source({'taubate|campinas':[first],'campinas|pirassununga':[second]}));
  const {body}=await query(api,{minWait,maxWait});
  assert.equal(body.routes.length,expected);
});

test('many departures at another hub do not eliminate Campinas',async()=>{
  const offers={...viaCampinas,'taubate|sao-jose-dos-campos':
    Array.from({length:30},(_,i)=>ride('06:00','07:'+String(i).padStart(2,'0'),'sj'+i))};
  const {body}=await query(loadWorker(source(offers)));
  assert.ok(body.routes.some(r=>r.legs.length===2&&r.legs[0].to==='campinas'));
});

test('successful empty search is distinct from incomplete search',async()=>{
  const {body}=await query(loadWorker(source({})));
  assert.equal(body.count,0);assert.equal(body.incomplete,false);assert.equal(body.warning,null);
});

test('failure in every candidate returns explicit incomplete search',async()=>{
  const api=loadWorker({fetch:async()=>new Response('Unavailable',{status:503})});
  const {status,body}=await query(api);
  assert.equal(status,200);assert.equal(body.count,0);assert.equal(body.incomplete,true);
  assert.ok(body.warning);
});

test('direct source failure returns 502 rather than no rides',async()=>{
  const {status,body}=await query(loadWorker({fetch:async()=>new Response('Unavailable',{status:503})}),{mode:'direct'});
  assert.equal(status,502);assert.equal(body.code,'SOURCE_UNAVAILABLE');
});

test('direct overnight ride remains available',async()=>{
  const {body}=await query(loadWorker(source({'taubate|pirassununga':[ride('23:00','01:00')]})),{mode:'direct'});
  assert.equal(body.count,1);
});

test('invalid transfer count rejected before any upstream request',async()=>{
  const upstream=source({}),api=loadWorker(upstream);
  for(const maxTransfers of [-1,11,1.5]){
    const {status}=await query(api,{maxTransfers});assert.equal(status,400);
  }
  assert.equal(upstream.calls.length,0);
});

test('equal origin and destination rejected',async()=>{
  const {status}=await query(loadWorker(),{destination:'taubate'});
  assert.equal(status,400);
});

test('source HTML fallback also works for connection legs',async()=>{
  const upstream=source(viaCampinas);
  const api=loadWorker({fetch:async input=>{
    if(new URL(input).pathname.endsWith('/campinas/pirassununga'))
      return new Response('Caronas oferecidas pela BlaBlaCar 08:30 10:00 R$ 39,00 Reservar');
    return upstream.fetch(input);
  }});
  const {body}=await query(api);
  assert.ok(body.routes.some(r=>r.legs.length===2));
});
