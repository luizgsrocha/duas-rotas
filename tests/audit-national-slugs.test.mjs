import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {runAudit,classify} from '../scripts/audit-national-slugs.mjs';
const city={name:'Adolfo, SP',uf:'SP',slug:'adolfo'};
const html=(name='Adolfo',uf='SP',id='123')=>`'destinationState': '${uf}', 'destinationId': '${id}', 'destinationName': '${name}'`;
async function setup(t){const outputDir=await mkdtemp(join(tmpdir(),'slug-audit-'));t.after(()=>rm(outputDir,{recursive:true,force:true}));return {catalog:[city],travelDate:'2026-11-05',outputDir,delayMs:0,concurrency:1,sleepImpl:async()=>{},log:()=>{}}}
const readReport=async dir=>JSON.parse(await readFile(join(dir,'national-slugs.json'),'utf8'));

test('municipality identity is required, including when the state matches',()=>{
 assert.equal(classify(new Response(),html('Outra cidade'),city),'identity_mismatch');
 assert.equal(classify(new Response(),"'destinationState': 'SP'",city),'identity_unverified');
 assert.equal(classify(new Response(),html(),city),'recognized');
 assert.equal(classify(new Response(),html(),city,'different'),'identity_mismatch');
 assert.equal(classify(new Response(),html(),city,'123'),'recognized');
 assert.equal(classify(new Response(),html('Adolfo','MG'),city),'state_mismatch');
});
test('block, missing metadata and 404 have separate reasons',()=>{
 assert.equal(classify(new Response('',{status:403}),'',city),'provider_blocked');
 assert.equal(classify(new Response('',{status:404}),'',city),'not_found');
 assert.equal(classify(new Response(),'',city),'metadata_missing');
});
test('legacy error checkpoint is retried and current successful results are reused',async t=>{
 const options=await setup(t);let calls=0;
 await writeFile(join(options.outputDir,'checkpoint.jsonl'),JSON.stringify({...city,status:'error'})+'\n');
 const fetchImpl=async()=>{calls++;return new Response(html())};
 await runAudit({...options,fetchImpl});assert.equal(calls,1);
 await runAudit({...options,fetchImpl});assert.equal(calls,1);
 const report=await readReport(options.outputDir);
 assert.equal(report.summary.valid,1);assert.equal(report.rows[0].primary.bodySha256.length,64);
 assert.equal(gunzipSync(await readFile(join(options.outputDir,report.rows[0].primary.evidencePath))).toString(),html());
 assert.match(await readFile(join(options.outputDir,'national-slugs.csv'),'utf8'),/recognized/);
});
test('transient errors exhaust retries but recover on resume without editing checkpoint',async t=>{
 const options=await setup(t);let calls=0;
 const report=await runAudit({...options,fetchImpl:async()=>{calls++;return new Response('',{status:503})}});
 assert.equal(calls,6);assert.equal(report.summary.error,1);
 await runAudit({...options,fetchImpl:async()=>{calls++;return new Response(html())}});
 assert.equal(calls,7);assert.equal((await readReport(options.outputDir)).summary.valid,1);
});
test('changed date, provider identifier, catalog, or expected identity invalidates checkpoint',async t=>{
 const options=await setup(t);let calls=0;
 const fetchImpl=async()=>{calls++;return new Response(html())};
 await runAudit({...options,fetchImpl});
 await runAudit({...options,fetchImpl,travelDate:'2026-11-06'});
 await runAudit({...options,fetchImpl,catalog:[{...city,buscaOnibusSlug:'adolfo-sp'}]});
 await runAudit({...options,fetchImpl,catalog:[{...city,name:'Adolfo'}]});
 await runAudit({...options,fetchImpl,expectedIds:{'SP|adolfo':'123'}});
 assert.equal(calls,5);
});
test('only a recognized variant is suggested, while unresolved rows are retried',async t=>{
 const options=await setup(t);let calls=0;
 let report=await runAudit({...options,fetchImpl:async()=>{calls++;return new Response('',{status:404})}});
 assert.equal(report.summary.unresolved,1);assert.equal(report.rows[0].suggestedBuscaOnibusSlug,null);
 report=await runAudit({...options,fetchImpl:async url=>{calls++;return String(url).includes('/adolfo-sp?')?new Response(html()):new Response('',{status:404})}});
 assert.equal(calls,4);assert.equal(report.summary.override_needed,1);assert.equal(report.rows[0].suggestedBuscaOnibusSlug,'adolfo-sp');
});
test('blocked or metadata-free pages are errors, never confirmed absent municipalities',async t=>{
 const options=await setup(t);
 for(const fetchImpl of [async()=>new Response('',{status:403}),async()=>new Response(''),async()=>{throw new Error('offline')}]){
 const report=await runAudit({...options,fetchImpl});assert.equal(report.summary.error,1);assert.equal(report.rows[0].suggestedBuscaOnibusSlug,null);
 }
});
test('incomplete final append recovers and future resumes remain readable',async t=>{
 const options=await setup(t);
 await writeFile(join(options.outputDir,'checkpoint.jsonl'),'{"uf":');
 await runAudit({...options,fetchImpl:async()=>new Response(html())});
 const report=await runAudit({...options,fetchImpl:async()=>{throw new Error('must reuse')}});
 assert.equal(report.summary.valid,1);
});
test('invalid concurrency and corrupted checkpoint fail explicitly',async t=>{
 const options=await setup(t);
 await assert.rejects(runAudit({...options,concurrency:0}),/CONCURRENCY/);
 await writeFile(join(options.outputDir,'checkpoint.jsonl'),'{broken}\n{}\n');
 await assert.rejects(runAudit(options),/Malformed checkpoint row 1/);
});
