import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync,readdirSync} from 'node:fs';
import {basename,join} from 'node:path';

const workflowsDirectory=new URL('../.github/workflows/',import.meta.url);
const root=new URL('../',import.meta.url);

test('workflow test targets exist in the repository',()=>{
 const missing=[];
 for(const file of readdirSync(workflowsDirectory).filter(name=>name.endsWith('.yml'))){
  const source=readFileSync(new URL(file,workflowsDirectory),'utf8');
  const targets=source.match(/(?:tests|scripts)\/[A-Za-z0-9._/-]+\.(?:cjs|mjs|js)/g)??[];
  for(const target of new Set(targets))if(!existsSync(new URL(target,root)))missing.push(`${file}: ${target}`);
 }
 assert.deepEqual(missing,[]);
});

test('transfer regression runs the current routing contracts, never the removed legacy suite',()=>{
 const file=join(workflowsDirectory.pathname,'transfer-regression.yml');
 const source=readFileSync(file,'utf8');
 for(const target of [
  'tests/routes.test.mjs',
  'tests/rn-hub.test.mjs',
  'tests/segment-cache.test.mjs',
  'tests/source-feedback.test.mjs',
  'tests/transfer-diagnostics.test.mjs',
 ])assert.match(source,new RegExp(target.replaceAll('.','\\.')));
 assert.doesNotMatch(source,/transfer-search\.test\.cjs/);
 assert.equal(basename(file),'transfer-regression.yml');
});

test('automation keeps post-deploy smoke and circuit breaker fail-safe controls',()=>{
 const smoke=readFileSync(new URL('.github/workflows/smoke.yml',root),'utf8');
 assert.match(smoke,/push:/);
 assert.match(smoke,/branches: \[main\]/);
 assert.match(smoke,/checks: read/);
 assert.match(smoke,/Workers Builds: rua-nossa/);
 assert.match(smoke,/build\.conclusion !== 'success'/);
 assert.match(smoke,/scripts\/smoke\.mjs/);
 const autonomous=readFileSync(new URL('.github/workflows/autonomous-cycle.yml',root),'utf8');
 assert.match(autonomous,/AUTONOMY_ENABLED == 'true'/);
 assert.match(autonomous,/AUTONOMY_CIRCUIT_BREAKER != 'open'/);
});

test('published smoke verifies the checked-out release marker',()=>{
 const smoke=readFileSync(new URL('scripts/smoke.mjs',root),'utf8');
 assert.match(smoke,/expectedAsset/);
 assert.match(smoke,/Published release does not match/);
 assert.match(smoke,/app\\\.js\\\?v=/);
});

test('autonomous merge gate is scoped to the expected app, label and ruleset',()=>{
 const merge=readFileSync(new URL('.github/workflows/autonomous-merge.yml',root),'utf8');
 assert.match(merge,/pull_request_target:/);
 assert.match(merge,/AUTO_MERGE_ENABLED == 'true'/);
 assert.match(merge,/AUTONOMY_CIRCUIT_BREAKER == 'closed'/);
 assert.match(merge,/user\.login == vars\.AUTONOMY_APP_LOGIN/);
 assert.match(merge,/autonomy:candidate/);
 assert.match(merge,/do-not-merge/);
 assert.match(merge,/gh pr merge "\$PR_URL" --auto --squash/);
 assert.match(merge,/gh pr diff "\$PR_URL" --name-only/);
 assert.match(merge,/docs\/autonomy/);
 assert.doesNotMatch(merge,/actions\/checkout/);
});
