import test from 'node:test';
import assert from 'node:assert/strict';
import {loadWorker,query,source} from './helpers/worker.mjs';

function fakeTimers(){
  let pending=null,cleared=0,delay=null;
  return {setTimeout(fn,ms){pending=fn;delay=ms;return 1},
    clearTimeout(){pending=null;cleared++},
    fire(){assert.ok(pending);pending()},
    get delay(){return delay},get cleared(){return cleared}};
}
const hanging=signal=>new Promise((resolve,reject)=>{
  signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true});
});

test('timeout cancels stalled upstream headers and clears timer',async()=>{
  const timers=fakeTimers(),api=loadWorker({timers,fetch:async(u,o)=>hanging(o.signal)});
  const promise=api.fetchRidePage('https://example.com',{});
  assert.equal(timers.delay,30000);
  timers.fire();
  await assert.rejects(promise,{name:'SearchTimeoutError'});
  assert.equal(timers.cleared,1);
});

test('timeout remains active while response body is being read',async()=>{
  const timers=fakeTimers();let startReading;const started=new Promise(resolve=>startReading=resolve);
  const api=loadWorker({timers,fetch:async(u,o)=>({ok:true,text(){startReading();return hanging(o.signal)}})});
  const promise=api.fetchRidePage('https://example.com',{});
  await started;timers.fire();
  await assert.rejects(promise,{name:'SearchTimeoutError'});
  assert.equal(timers.cleared,1);
});

test('expired deadline does not start fetch',async()=>{
  let calls=0;
  const api=loadWorker({clock:()=>100,fetch:async()=>{calls++;return new Response('')}});
  await assert.rejects(api.fetchRidePage('https://example.com',{},99),{name:'SearchTimeoutError'});
  assert.equal(calls,0);
});

test('successful response clears timer',async()=>{
  const timers=fakeTimers(),api=loadWorker({timers,fetch:async()=>new Response('ok')});
  assert.equal((await api.fetchRidePage('https://example.com',{})).html,'ok');
  assert.equal(timers.cleared,1);
});

test('five-minute search budget stops starting new requests',async()=>{
  let clock=0,calls=0;
  const api=loadWorker({clock:()=>clock,fetch:async()=>{calls++;clock+=300001;return new Response('')}});
  const {body}=await query(api);
  assert.equal(calls,1);assert.equal(body.incomplete,true);
});
