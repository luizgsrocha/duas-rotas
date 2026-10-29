#!/usr/bin/env node
import {appendFile,mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {gzipSync} from 'node:zlib';

export const validatorVersion=2;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const key=city=>`${city.uf}|${city.slug}`;
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const successful=new Set(['valid','mapped_valid','override_needed']);
const capitalByUf={AC:'rio-branco',AL:'maceio',AP:'macapa',AM:'manaus',BA:'salvador',CE:'fortaleza',DF:'brasilia',ES:'vitoria',GO:'goiania',MA:'sao-luis',MT:'cuiaba',MS:'campo-grande',MG:'belo-horizonte',PA:'belem',PB:'joao-pessoa',PR:'curitiba',PE:'recife',PI:'teresina',RJ:'rio-de-janeiro',RN:'natal',RS:'porto-alegre',RO:'porto-velho',RR:'boa-vista',SC:'florianopolis',SP:'sao-paulo',SE:'aracaju',TO:'palmas'};
export function metadata(html,field){
  const escapedField=field.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const match=html.match(new RegExp(`(["'])${escapedField}\\1\\s*:\\s*(["'])((?:\\\\.|(?!\\2)[\\s\\S])*)\\2`));
  if(!match)return null;
  if(match[2]==='"'){
    try{return JSON.parse(`"${match[3]}"`)}catch{return null}
  }
  return match[3].replace(/\\(u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|[\s\S])/g,(_,escape)=>{
    if(escape.startsWith('u'))return String.fromCharCode(parseInt(escape.slice(1),16));
    if(escape.startsWith('x'))return String.fromCharCode(parseInt(escape.slice(1),16));
    return ({n:'\n',r:'\r',t:'\t',b:'\b',f:'\f',v:'\v'})[escape]??escape;
  });
}
const normalizedName=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
export function classify(response,html,city,expectedId){
  if(response.status===403)return 'provider_blocked';
  if(response.status===404)return 'not_found';
  if(response.status===429||response.status>=500)return 'transient_http';
  if(!response.ok)return 'upstream_http';
  const uf=metadata(html,'destinationState'),id=metadata(html,'destinationId'),name=metadata(html,'destinationName');
  if(!uf)return 'metadata_missing';
  if(uf!==city.uf)return 'state_mismatch';
  if(expectedId!=null)return id===String(expectedId)?'recognized':'identity_mismatch';
  if(!name)return 'identity_unverified';
  const expectedName=city.name.replace(new RegExp(`,\\s*${city.uf}$`,'i'),'');
  return normalizedName(name)===normalizedName(expectedName)?'recognized':'identity_mismatch';
}
export async function runAudit({catalog,travelDate,outputDir='audit-results/national',delayMs=500,concurrency=8,expectedIds={},fetchImpl=globalThis.fetch,sleepImpl=sleep,log=console.log,now=()=>new Date()}={}){
  if(!Array.isArray(catalog)||!catalog.length)throw new Error('Catalog must be a nonempty array');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(travelDate||'')||new Date(`${travelDate}T00:00:00Z`).toISOString().slice(0,10)!==travelDate)throw new Error('TRAVEL_DATE must be a valid YYYY-MM-DD date');
  if(!Number.isInteger(concurrency)||concurrency<1||concurrency>16)throw new Error('CONCURRENCY must be an integer from 1 to 16');
  if(!Number.isFinite(delayMs)||delayMs<0)throw new Error('DELAY_MS must be nonnegative');
  if(new Set(catalog.map(key)).size!==catalog.length)throw new Error('Duplicate UF/slug in catalog');
  for(const city of catalog)if(!capitalByUf[city.uf]||!city.slug||!city.name)throw new Error('Invalid municipality');
  if(!expectedIds||typeof expectedIds!=='object'||Array.isArray(expectedIds))throw new Error('IDENTITIES_PATH must contain an object keyed by UF|slug');
  const catalogSha256=hash(catalog),context=hash({validatorVersion,travelDate,catalogSha256,expectedIds});
  const checkpointPath=`${outputDir}/checkpoint.jsonl`,completed=new Map();
  await mkdir(`${outputDir}/evidence`,{recursive:true});
  try{
    const lines=(await readFile(checkpointPath,'utf8')).split('\n');
    for(let index=0;index<lines.length;index++){
      if(!lines[index].trim())continue;
      let row;
      try{row=JSON.parse(lines[index])}catch{
        // A killed process can leave an incomplete final append. Older corruption is fatal.
        if(index===lines.length-1){log('Ignoring incomplete final checkpoint row');await writeFile(checkpointPath,lines.slice(0,index).join('\n')+'\n');continue}
        throw new Error(`Malformed checkpoint row ${index+1}`);
      }
      completed.set(key(row),row);
    }
  }catch(error){if(error.code!=='ENOENT')throw error}
  const reusable=new Map([...completed].filter(([,row])=>row.context===context&&successful.has(row.status)));
  let nextStart=0,writeChain=Promise.resolve();
  async function probe(city,providerSlug){
    const capital=capitalByUf[city.uf],origin=city.slug===capital?(city.uf==='SP'?'rio-de-janeiro':'sao-paulo'):capital;
    const url=new URL(`https://www.buscaonibus.com.br/horario/${origin}/${providerSlug}`);
    url.searchParams.set('dt',travelDate.split('-').reverse().join('/'));
    let result;
    for(let attempt=1;attempt<=3;attempt++){
      const wait=Math.max(0,nextStart-Date.now());nextStart=Math.max(nextStart,Date.now())+delayMs;
      if(wait)await sleepImpl(wait);
      try{
        const response=await fetchImpl(url,{headers:{'user-agent':'Mozilla/5.0 (compatible; DuasRotasNationalSlugAudit/2.0)'},redirect:'follow',signal:AbortSignal.timeout(30000)}),html=await response.text();
        result={providerSlug,url:String(url),finalUrl:response.url||String(url),checkedAt:now().toISOString(),attempt,httpStatus:response.status,bodySha256:createHash('sha256').update(html).digest('hex'),destinationId:metadata(html,'destinationId'),destinationName:metadata(html,'destinationName'),destinationState:metadata(html,'destinationState'),routeKnown:metadata(html,'routeKnown'),reason:classify(response,html,city,expectedIds[key(city)])};
        result.evidencePath=`evidence/${result.bodySha256}.html.gz`;
        await writeFile(`${outputDir}/${result.evidencePath}`,gzipSync(html));
      }catch(error){result={providerSlug,url:String(url),checkedAt:now().toISOString(),attempt,httpStatus:null,reason:'network_error',error:String(error.message||error)}}
      result.recognized=result.reason==='recognized';
      if(!['transient_http','network_error'].includes(result.reason)||attempt===3)return result;
      await sleepImpl(1000*attempt);
    }
  }
  async function audit(city){
    const existing=city.buscaOnibusSlug||null,primary=await probe(city,existing||city.slug);
    let variant=null,status='unresolved',suggested=null;
    if(primary.recognized){status=existing?'mapped_valid':'valid';suggested=primary.providerSlug}
    else{
      const fallback=`${city.slug}-${city.uf.toLowerCase()}`;
      if(fallback!==primary.providerSlug)variant=await probe(city,fallback);
      if(variant?.recognized){status='override_needed';suggested=variant.providerSlug}
    }
    const reasons=[primary,variant].filter(Boolean).map(item=>item.reason);
    if(status==='unresolved'&&reasons.some(reason=>['network_error','transient_http','provider_blocked','upstream_http','metadata_missing','identity_unverified'].includes(reason)))status='error';
    return {context,validatorVersion,checkedAt:now().toISOString(),name:city.name,uf:city.uf,slug:city.slug,existingBuscaOnibusSlug:existing,status,suggestedBuscaOnibusSlug:suggested,primary,variant};
  }
  const pending=catalog.filter(city=>!reusable.has(key(city)));let cursor=0,done=reusable.size;
  async function worker(){while(cursor<pending.length){
    const city=pending[cursor++],row=await audit(city);reusable.set(key(city),row);done++;
    writeChain=writeChain.then(()=>appendFile(checkpointPath,JSON.stringify(row)+'\n'));await writeChain;
    log(`${done}/${catalog.length} ${row.uf} ${row.name} ${row.status}`);
  }}
  await Promise.all(Array.from({length:concurrency},worker));await writeChain;
  const rows=catalog.map(city=>reusable.get(key(city))),summary={},byUf={},byReason={};
  for(const row of rows){
    summary[row.status]=(summary[row.status]||0)+1;
    const state=byUf[row.uf]||={total:0,valid:0,mapped_valid:0,override_needed:0,unresolved:0,error:0};state.total++;state[row.status]++;
    for(const probe of [row.primary,row.variant].filter(Boolean))byReason[probe.reason]=(byReason[probe.reason]||0)+1;
  }
  const report={validatorVersion,context,catalogSha256,generatedAt:now().toISOString(),travelDate,checked:rows.length,delayMs,concurrency,summary,byUf,byReason,rows};
  await writeFile(`${outputDir}/national-slugs.json`,JSON.stringify(report,null,2)+'\n');
  const columns=['name','uf','slug','existingBuscaOnibusSlug','status','suggestedBuscaOnibusSlug'];
  const quote=value=>`"${String(value??'').replaceAll('"','""')}"`;
  const csv=[columns.concat(['primaryHttp','primaryReason','variantHttp','variantReason']).join(','),...rows.map(row=>[...columns.map(column=>row[column]),row.primary?.httpStatus,row.primary?.reason,row.variant?.httpStatus,row.variant?.reason].map(quote).join(','))].join('\n');
  await writeFile(`${outputDir}/national-slugs.csv`,csv+'\n');log(JSON.stringify({summary,byUf,byReason},null,2));return report;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const env=process.env;
  if(!env.TRAVEL_DATE)throw new Error('Set TRAVEL_DATE explicitly; dates are part of checkpoint identity');
  await runAudit({catalog:JSON.parse(await readFile(env.CATALOG_PATH||'cities.json','utf8')),travelDate:env.TRAVEL_DATE,outputDir:env.OUTPUT_DIR||'audit-results/national',delayMs:Number(env.DELAY_MS??500),concurrency:Number(env.CONCURRENCY??8),expectedIds:env.IDENTITIES_PATH?JSON.parse(await readFile(env.IDENTITIES_PATH,'utf8')):{}});
}
