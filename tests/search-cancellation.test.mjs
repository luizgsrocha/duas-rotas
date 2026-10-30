import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const start=source.indexOf('async function runSearchModes(');
const end=source.indexOf('\nasync function check()',start);
assert.ok(start>=0&&end>start,'search coordinator exists');
const sandbox={};
vm.runInNewContext(source.slice(start,end)+'\nglobalThis.runSearchModes=runSearchModes;',sandbox);

test('cancellation stops before transfer search starts',async()=>{
  const calls=[];
  await assert.rejects(sandbox.runSearchModes(async mode=>{
    calls.push(mode);
    const error=new Error('Busca cancelada.');error.name='SearchCancelledError';throw error;
  },2),{name:'SearchCancelledError'});
  assert.deepEqual(calls,['direct']);
});

test('ordinary direct failure still permits transfer search',async()=>{
  const calls=[];
  const result=await sandbox.runSearchModes(async mode=>{
    calls.push(mode);
    if(mode==='direct')throw new Error('indisponível');
    return {count:0,routes:[]};
  },2);
  assert.deepEqual(calls,['direct','transfers']);
  assert.equal(result.directError.message,'indisponível');
});
