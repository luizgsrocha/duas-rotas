import {readFileSync} from 'node:fs';
import vm from 'node:vm';

export function loadWorker({fetch,clock=()=>Date.now(),timers={setTimeout,clearTimeout},cache}={}) {
  const hubSource=readFileSync(new URL('../../rn-hub.js',import.meta.url),'utf8').replaceAll('export ','');
  const source=readFileSync(new URL('../../worker.js',import.meta.url),'utf8').replace(/^import[^\n]+\n/,'');
  const sandbox={Request,Response,Headers,URL,AbortController,DOMException,console,
    Date:class extends Date {static now(){return clock()}},
    setTimeout:timers.setTimeout,clearTimeout:timers.clearTimeout,
    fetch:fetch??(()=>{throw new Error('Unexpected network request in deterministic tests')})};
  vm.createContext(sandbox);
  vm.runInContext(hubSource+'\n'+source.replace('export default','const worker =')+
    '\nglobalThis.testApi={worker,findRoutes,selectRnHubCandidates,rankRnHubCandidates,fetchRidePage};',sandbox);
  sandbox.testApi.segmentCache=cache;
  return sandbox.testApi;
}

export const city=(slug,lat,lng)=>({name:slug,slug,uf:'SP',lat,lng});
export const cities=[
  city('taubate',-23.0104,-45.5593),
  city('pirassununga',-21.996,-47.426),
  city('campinas',-22.9053,-47.0659),
  city('sao-jose-dos-campos',-23.189,-45.884)
];
export const ride=(departure,arrival,id='ride',price='20')=>({departure,arrival,id,price});
export function html(rides) {
  return rides.map(r=>{
    const params=new URLSearchParams({departure:r.departure,arrival:r.arrival,price:r.price,
      deep_link:'https://www.blablacar.com.br/trip?id='+r.id});
    return '<a href="/comprar-passagem/blablacar?'+params.toString().replaceAll('&','&amp;')+'">Reservar</a>';
  }).join('\n');
}
export function source(offers,{fail=[]}={}) {
  const calls=[];
  const fetch=async (input)=>{
    const url=new URL(input),match=url.pathname.match(/\/horario\/([^/]+)\/([^/]+)/);
    if(!match)throw new Error('Unexpected upstream URL: '+url);
    const key=match[1]+'|'+match[2];calls.push(key);
    return new Response(fail.includes(key)?'Unavailable':html(offers[key]??[]),
      {status:fail.includes(key)?503:200});
  };
  return {fetch,calls};
}
export async function query(api,{geo=cities,hubIndex=undefined,rnHubEnabled=true,origin='taubate',destination='pirassununga',
  mode='transfers',maxTransfers=2,minWait=0,maxWait=90,...extra}={}) {
  const params=new URLSearchParams({date:extra.date||'2026-10-14',origin,destination,mode,
    maxTransfers:String(maxTransfers),minWait:String(minWait),maxWait:String(maxWait),...extra});
  const effectiveIndex=hubIndex===undefined?{version:'rn-hub-2026.10.1',records:Object.fromEntries(geo.map(item=>[`${item.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}:${item.uf||''}`,[500,50_000,'3B',5]]))}:hubIndex;
  const env={RN_HUB_ENABLED:rnHubEnabled?'1':'0',RIDES_CACHE:api.segmentCache,ASSETS:{fetch:async input=>Response.json(new URL(input).pathname==='/rn-hub-index.json'?effectiveIndex:geo,{status:effectiveIndex||new URL(input).pathname!=='/rn-hub-index.json'?200:404})}};
  const response=await api.worker.fetch(new Request('https://duas-rotas.example/api/exists?'+params),env);
  return {status:response.status,body:await response.json()};
}

