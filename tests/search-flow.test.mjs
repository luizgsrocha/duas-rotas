import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const start=source.indexOf('async function runSearchModes(');
const end=source.indexOf('\nasync function check()',start);
assert.ok(start>=0&&end>start,'search-mode coordinator exists');
const sandbox={};
vm.runInNewContext(source.slice(start,end)+'\nglobalThis.runSearchModes=runSearchModes;',sandbox);

test('direct-search failure does not prevent transfer search',async()=>{
  const calls=[],events=[];
  const result=await sandbox.runSearchModes(async mode=>{
    calls.push(mode);
    if(mode==='direct')throw new Error('SOURCE_UNAVAILABLE');
    return {count:1,routes:[{legs:[{},{}]}],incomplete:false};
  },2,event=>events.push(event.phase));

  assert.deepEqual(calls,['direct','transfers']);
  assert.equal(result.direct,null);
  assert.equal(result.directError.message,'SOURCE_UNAVAILABLE');
  assert.equal(result.transfers.count,1);
  assert.deepEqual(events,['direct','transfers']);
});

test('zero transfer limit only queries direct rides',async()=>{
  const calls=[];
  const result=await sandbox.runSearchModes(async mode=>{
    calls.push(mode);
    return {count:0,routes:[],incomplete:false};
  },0);

  assert.deepEqual(calls,['direct']);
  assert.equal(result.transfers,null);
});

test('transfer failure is returned separately from a successful direct result',async()=>{
  const result=await sandbox.runSearchModes(async mode=>{
    if(mode==='transfers')throw new Error('transfer timeout');
    return {count:1,routes:[{legs:[{}]}],incomplete:false};
  },1);

  assert.equal(result.direct.count,1);
  assert.equal(result.directError,null);
  assert.equal(result.transfers,null);
  assert.equal(result.transferError.message,'transfer timeout');
});
