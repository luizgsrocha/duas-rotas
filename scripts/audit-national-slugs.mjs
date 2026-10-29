#!/usr/bin/env node
import {appendFile,mkdir,readFile,writeFile} from 'node:fs/promises';

const catalogPath=process.env.CATALOG_PATH||'cities.json';
const travelDate=process.env.TRAVEL_DATE||'2026-11-05';
const delayMs=Number(process.env.DELAY_MS||500);
const concurrency=Number(process.env.CONCURRENCY||8);
const outputDir='audit-results/national';
const checkpointPath=`${outputDir}/checkpoint.jsonl`;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const catalog=JSON.parse(await readFile(catalogPath,'utf8'));
await mkdir(outputDir,{recursive:true});

const completed=new Map();
try{
  const checkpoint=await readFile(checkpointPath,'utf8');
  for(const line of checkpoint.split('\n').filter(Boolean)){
    const row=JSON.parse(line);completed.set(`${row.uf}|${row.slug}`,row);
  }
}catch(error){if(error.code!=='ENOENT')throw error}

let nextStart=0,writeChain=Promise.resolve();
async function throttledFetch(url){
  const wait=Math.max(0,nextStart-Date.now());
  nextStart=Math.max(nextStart,Date.now())+delayMs;
  if(wait)await sleep(wait);
  return fetch(url,{headers:{'user-agent':'Mozilla/5.0 (compatible; DuasRotasNationalSlugAudit/1.0)'},redirect:'follow',signal:AbortSignal.timeout(30000)});
}
function metadata(html,field){return html.match(new RegExp(`'${field}':\\s*'([^']*)'`))?.[1]||null}
const capitalByUf={AC:'rio-branco',AL:'maceio',AP:'macapa',AM:'manaus',BA:'salvador',CE:'fortaleza',DF:'brasilia',ES:'vitoria',GO:'goiania',MA:'sao-luis',MT:'cuiaba',MS:'campo-grande',MG:'belo-horizonte',PA:'belem',PB:'joao-pessoa',PR:'curitiba',PE:'recife',PI:'teresina',RJ:'rio-de-janeiro',RN:'natal',RS:'porto-alegre',RO:'porto-velho',RR:'boa-vista',SC:'florianopolis',SP:'sao-paulo',SE:'aracaju',TO:'palmas'};
async function probe(city,providerSlug){
  const capital=capitalByUf[city.uf];
  const origin=city.slug===capital?(city.uf==='SP'?'rio-de-janeiro':'sao-paulo'):capital;
  const url=new URL(`https://www.buscaonibus.com.br/horario/${origin}/${providerSlug}`);
  url.searchParams.set('dt',travelDate.split('-').reverse().join('/'));
  let lastError=null;
  for(let attempt=1;attempt<=3;attempt++){
    try{
      const response=await throttledFetch(url),html=await response.text(),destinationState=metadata(html,'destinationState');
      const result={providerSlug,httpStatus:response.status,destinationId:metadata(html,'destinationId'),destinationState,routeKnown:metadata(html,'routeKnown'),recognized:response.ok&&destinationState===city.uf};
      if(![429,500,502,503,504].includes(response.status))return result;
      lastError=new Error(`HTTP ${response.status}`);
    }catch(error){lastError=error}
    await sleep(1000*attempt);
  }
  throw lastError;
}
async function audit(city){
  const existing=city.buscaOnibusSlug||null;
  let primary=null,variant=null,error=null,status='unresolved',suggested=null;
  try{
    primary=await probe(city,existing||city.slug);
    if(primary.recognized){status=existing?'mapped_valid':'valid';suggested=primary.providerSlug}
    else{
      const fallback=`${city.slug}-${city.uf.toLowerCase()}`;
      if(fallback!==primary.providerSlug)variant=await probe(city,fallback);
      if(variant?.recognized){status='override_needed';suggested=variant.providerSlug}
    }
  }catch(caught){status='error';error=String(caught?.message||caught)}
  return{name:city.name,uf:city.uf,slug:city.slug,existingBuscaOnibusSlug:existing,status,suggestedBuscaOnibusSlug:suggested,primary,variant,error};
}

const pending=catalog.filter(city=>!completed.has(`${city.uf}|${city.slug}`));
let cursor=0,done=completed.size;
async function worker(){while(true){
  const index=cursor++;if(index>=pending.length)return;
  const row=await audit(pending[index]),key=`${row.uf}|${row.slug}`;
  completed.set(key,row);done++;
  writeChain=writeChain.then(()=>appendFile(checkpointPath,JSON.stringify(row)+'\n'));
  await writeChain;
  console.log(`${done}/${catalog.length} ${row.uf} ${row.name} ${row.status}`);
}}
await Promise.all(Array.from({length:concurrency},()=>worker()));
await writeChain;

const rows=catalog.map(city=>completed.get(`${city.uf}|${city.slug}`));
const byStatus=rows.reduce((acc,row)=>((acc[row.status]=(acc[row.status]||0)+1),acc),{});
const byUf={};
for(const row of rows){
  const item=byUf[row.uf]||={total:0,valid:0,mapped_valid:0,override_needed:0,unresolved:0,error:0};
  item.total++;item[row.status]++;
}
const report={travelDate,checked:rows.length,delayMs,concurrency,summary:byStatus,byUf,rows};
await writeFile(`${outputDir}/national-slugs.json`,JSON.stringify(report,null,2));
const quote=value=>`"${String(value??'').replaceAll('"','""')}"`;
const csv=['name,uf,slug,existingBuscaOnibusSlug,status,suggestedBuscaOnibusSlug,primaryHttp,primaryState,variantHttp,variantState,error',...rows.map(row=>[row.name,row.uf,row.slug,row.existingBuscaOnibusSlug,row.status,row.suggestedBuscaOnibusSlug,row.primary?.httpStatus,row.primary?.destinationState,row.variant?.httpStatus,row.variant?.destinationState,row.error].map(quote).join(','))].join('\n');
await writeFile(`${outputDir}/national-slugs.csv`,csv+'\n');
console.log(JSON.stringify({summary:byStatus,byUf},null,2));
