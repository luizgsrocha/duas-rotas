#!/usr/bin/env node
// Audit BuscaOnibus route URL identifiers without interpreting "no rides" as a bad slug.
// Run: BASE_URL=https://your-worker.example node scripts/audit-sp-slugs.mjs
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.BASE_URL;
if(!base) throw new Error('Set BASE_URL to the deployed Duas Rotas Worker URL');
const delay=Number(process.env.DELAY_MS||1200);
const limit=Number(process.env.LIMIT||645);
const date=process.env.TRAVEL_DATE||new Date(Date.now()+7*86400000).toISOString().slice(0,10);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const get=async url=>{const response=await fetch(url,{headers:{'user-agent':'duas-rotas-slug-audit/1.0'},signal:AbortSignal.timeout(25000)});if(!response.ok)throw new Error('HTTP '+response.status);return response.json()};
const cities=await get(new URL('/api/cities',base));
if(!Array.isArray(cities))throw new Error('/api/cities did not return an array');
const sp=cities.filter(c=>String(c.uf||'').toUpperCase()==='SP');
if(sp.length!==645)throw new Error('Expected 645 São Paulo municipalities, got '+sp.length+'. Verify the city catalog before auditing.');
const origin=sp.find(c=>c.slug==='taubate');
if(!origin)throw new Error('Taubaté missing from /api/cities');
const rows=[];
for(const city of sp.filter(c=>c.slug!==origin.slug).slice(0,limit)){
  const url=new URL('/api/exists',base);
  for(const [k,v] of Object.entries({origin:origin.slug,destination:city.slug,date,mode:'direct',maxTransfers:'0',debug:'1'}))url.searchParams.set(k,v);
  let result={municipio:city.name,uf:city.uf,slug:city.slug,origin:origin.slug,status:'inconclusive',reason:'No evidence of provider city mapping',rides:null};
  try{
    const data=await get(url);
    result.rides=typeof data.count==='number'?data.count:null;
    if(data.error)result.reason=data.code||data.error;
    else if(data.incomplete)result.reason='Incomplete provider response';
    else if(data.exists) {result.status='route_found';result.reason='Ride found; provider city mapping still requires separate verification';}
    else result.reason='No rides found; slug validity cannot be inferred';
  }catch(e){result.reason=String(e.message||e);}
  rows.push(result);
  console.log(rows.length+'/'+Math.min(limit,644),city.name,result.status);
  await sleep(delay);
}
await mkdir('audit-results',{recursive:true});
await writeFile('audit-results/sp-slugs.json',JSON.stringify({date,origin:origin.slug,catalogCount:sp.length,checked:rows.length,rows},null,2));
const csv=['municipio,uf,slug,origin,status,reason,rides',...rows.map(r=>[r.municipio,r.uf,r.slug,r.origin,r.status,r.reason,r.rides??''].map(v=>'"'+String(v).replaceAll('"','""')+'"').join(','))].join('\n');
await writeFile('audit-results/sp-slugs.csv',csv+'\n');
console.log('Wrote audit-results/sp-slugs.json and .csv');
