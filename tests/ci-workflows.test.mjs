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
 assert.match(autonomous,/environment: autonomy-trial/);
 assert.match(autonomous,/actions\/create-github-app-token@v2/);
 assert.match(autonomous,/permission-contents: write/);
 assert.match(autonomous,/permission-pull-requests: write/);
 assert.match(autonomous,/permission-issues: write/);
 assert.match(autonomous,/@openai\/codex@0\.166\.0/);
 assert.match(autonomous,/--ephemeral --sandbox workspace-write/);
 assert.match(autonomous,/shell_environment_policy\.exclude/);
 assert.match(autonomous,/scripts\/ci\/verify\.sh/);
 assert.match(autonomous,/autonomy:candidate/);
 assert.match(autonomous,/do-not-merge/);
 assert.match(autonomous,/git status --porcelain=v1 --untracked-files=all/);
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

test('daily autonomy report is bounded, idempotent and never reads logs or secrets',()=>{
 const report=readFileSync(new URL('.github/workflows/autonomy-report.yml',root),'utf8');
 assert.match(report,/schedule:/);
 assert.match(report,/issues: write/);
 assert.match(report,/actions: read/);
 assert.match(report,/if: vars\.AUTONOMY_REPORT_ENABLED == 'true'/);
 assert.match(report,/autonomy-daily-report/);
 assert.match(report,/updateComment/);
 assert.match(report,/createComment/);
 assert.match(report,/24 \* 60 \* 60 \* 1000/);
 assert.doesNotMatch(report,/secrets\./);
 assert.doesNotMatch(report,/download.*log/i);
});

test('rollback drill can only mutate an explicitly isolated Worker and always restores it',()=>{
 const rollback=readFileSync(new URL('.github/workflows/rollback-drill.yml',root),'utf8');
 assert.match(rollback,/environment: rollback-drill/);
 assert.match(rollback,/CLOUDFLARE_ROLLBACK_TOKEN/);
 assert.match(rollback,/-rollback-drill/);
 assert.match(rollback,/test "\$WORKER_NAME" != 'rua-nossa'/);
 assert.match(rollback,/new URL\(process\.env\.ISOLATED_URL\)/);
 assert.match(rollback,/hostname\.startsWith\(worker\+'\.'\)/);
 assert.match(rollback,/hostname\.endsWith\('\.workers\.dev'\)/);
 assert.match(rollback,/wrangler@4\.47\.0 rollback "\$TARGET_VERSION_ID"/);
 assert.match(rollback,/if: always\(\) && steps\.versions\.outcome == 'success'/);
 assert.match(rollback,/wrangler@4\.47\.0 rollback "\$RESTORE_VERSION_ID"/);
 assert.doesNotMatch(rollback,/wrangler(?:@[^ ]+)? deploy/);
});

test('rollback provisioning is pinned to the disposable Worker and verifies both states',()=>{
 const setup=readFileSync(new URL('.github/workflows/rollback-drill-setup.yml',root),'utf8');
 assert.match(setup,/WORKER_NAME: duas-rotas-rollback-drill/);
 assert.match(setup,/test "\$WORKER_NAME" != 'rua-nossa'/);
 assert.match(setup,/wrangler@4\.47\.0 deploy --config wrangler\.rollback-drill\.toml/);
 assert.match(setup,/DRILL_VERSION:v1/);
 assert.match(setup,/DRILL_VERSION:v2/);
 assert.equal((setup.match(/versions\.at\(-1\)/g)??[]).length,2);
 assert.match(setup,/rollback "\$TARGET_VERSION_ID"/);
 assert.match(setup,/rollback "\$RESTORE_VERSION_ID"/);
 assert.match(setup,/if: always\(\) && steps\.deploy_v2\.outcome == 'success'/);
 assert.match(setup,/check-rollback-drill\.mjs .* v1/);
 assert.equal((setup.match(/check-rollback-drill\.mjs .* v2/g)??[]).length,2);
 const smoke=readFileSync(new URL('scripts/check-rollback-drill.mjs',root),'utf8');
 assert.match(smoke,/attempt <= 30/);
 assert.match(smoke,/AbortSignal\.timeout\(5_000\)/);
 assert.match(smoke,/service === 'duas-rotas-rollback-drill'/);
 const config=readFileSync(new URL('wrangler.rollback-drill.toml',root),'utf8');
 assert.match(config,/name = "duas-rotas-rollback-drill"/);
 assert.match(config,/main = "scripts\/rollback-drill-worker\.mjs"/);
 assert.doesNotMatch(config,/assets|routes|domain/i);
});
