const CITIES={pirassununga:{name:"Pirassununga",slug:"pirassununga",lat:-21.996,lng:-47.426},taubate:{name:"Taubaté",slug:"taubate",lat:-23.026,lng:-45.555},"sao-jose-dos-campos":{name:"São José dos Campos",slug:"sao-jose-dos-campos",lat:-23.189,lng:-45.884},campinas:{name:"Campinas",slug:"campinas",lat:-22.906,lng:-47.061}};
const DEFAULT_MIN_WAIT=5,DEFAULT_MAX_WAIT=60,MAX_LEGS=3;
export default{async fetch(request,env){const u=new URL(request.url);if(u.pathname==="/api/cities"){try{const states=["SP","RJ"],responses=await Promise.all(states.map(uf=>fetch("https://servicodados.ibge.gov.br/api/v1/localidades/estados/"+uf+"/municipios")));if(responses.some(r=>!r.ok))throw new Error("IBGE indisponível");const lists=await Promise.all(responses.map(r=>r.json())),data=lists.flatMap((list,i)=>list.map(x=>({name:x.nome+", "+states[i],slug:slugify(x.nome)})));return json(data.sort((a,b)=>a.name.localeCompare(b.name,"pt-BR")))}catch(e){return json({error:"Falha ao carregar municípios"},502)}}if(u.pathname!=="/api/exists"){const r=await env.ASSETS.fetch(request),h=new Headers(r.headers);if(u.pathname==="/"||u.pathname.endsWith(".html"))h.set("Cache-Control","no-cache, no-store, must-revalidate");else if(u.pathname.endsWith(".js")||u.pathname.endsWith(".css"))h.set("Cache-Control","public, max-age=0, must-revalidate");return new Response(r.body,{status:r.status,statusText:r.statusText,headers:h})}try{const date=u.searchParams.get("date"),origin=u.searchParams.get("origin")||"pirassununga",key=u.searchParams.get("destination")||"taubate",originName=u.searchParams.get("originName")||displayName(origin),destinationName=u.searchParams.get("destinationName")||displayName(key),minWait=parseWait(u.searchParams.get("minWait"),DEFAULT_MIN_WAIT),maxWait=parseWait(u.searchParams.get("maxWait"),DEFAULT_MAX_WAIT);if(minWait<0||maxWait<minWait||maxWait>720)return json({error:"Intervalo de espera inválido"},400);if(!/^\d{4}-\d{2}-\d{2}$/.test(date||""))return json({error:"Data inválida"},400);if(!validSlug(origin)||!validSlug(key))return json({error:"Cidade inválida"},400);if(origin===key)return json({error:"Origem e destino devem ser diferentes"},400);const mode=u.searchParams.get("mode")||"all";if(!["all","direct","transfers"].includes(mode))return json({error:"Modo inválido"},400);let routes;if(mode==="direct"){const rides=await getRides(origin,key,date);routes=rides.map(ride=>makeRoute([{from:origin,to:key,fromName:originName,toName:destinationName,ride}]))}else{routes=await findRoutes(origin,key,date,originName,destinationName,minWait,maxWait);if(mode==="transfers")routes=routes.filter(x=>x.legs.length>1)}const direct=routes.filter(x=>x.legs.length===1),transfers=routes.filter(x=>x.legs.length>1);return json({date,origin,originName,destination:key,destinationName,mode,exists:routes.length>0,count:routes.length,directCount:direct.length,transferCount:transfers.length,source:"BuscaOnibus",routes})}catch(e){return json({error:"Falha ao consultar as caronas",detail:String(e&&e.message||e)},502)}}};
const GEO_URL="https://raw.githubusercontent.com/kelvins/municipios-brasileiros/main/json/municipios.json",CANDIDATE_LIMIT=6;
async function findRoutes(origin,target,date,originName,targetName,minWait,maxWait){
 const routes=[],direct=await getRides(origin,target,date);
 for(const ride of direct)routes.push(makeRoute([{from:origin,to:target,fromName:originName,toName:targetName,ride}]));
 const geo=await loadGeoCities(),from=findGeoCity(geo,originName),to=findGeoCity(geo,targetName);
 if(!from||!to)return routes;
 const candidates=selectCandidates(geo,from,to,CANDIDATE_LIMIT),nodes=[from,...candidates,to],pairs=[];
 for(let i=0;i<nodes.length;i++)for(let j=0;j<nodes.length;j++){
   if(i===j)continue;
   const a=nodes[i],b=nodes[j];
   if(a.slug===origin&&b.slug===target)continue;
   if(distance(b,to)>=distance(a,to)-1)continue;
   pairs.push([a,b])
 }
 const settled=await Promise.allSettled(pairs.map(async([a,b])=>[a.slug+"|"+b.slug,await getRides(a.slug,b.slug,date)])),edges={};
 for(const x of settled)if(x.status==="fulfilled")edges[x.value[0]]=x.value[1];
 const found=[];
 function walk(city,legs,visited){
   if(legs.length>=MAX_LEGS)return;
   for(const next of nodes){
     if(next.slug===city.slug||visited.has(next.slug))continue;
     if(distance(next,to)>=distance(city,to)-1)continue;
     for(const ride of edges[city.slug+"|"+next.slug]||[]){
       if(legs.length){
         const wait=waitMinutes(legs.at(-1).ride.arrival,ride.departure);
         if(wait<minWait||wait>maxWait)continue
       }
       const leg={from:city.slug,to:next.slug,fromName:city.name,toName:next.name,ride},path=[...legs,leg];
       if(next.slug===to.slug){if(path.length>1)found.push(makeRoute(path))}
       else{const v=new Set(visited);v.add(next.slug);walk(next,path,v)}
     }
   }
 }
 walk(from,[],new Set([from.slug]));
 return routes.concat(found)
}
async function loadGeoCities(){
 const r=await fetch(GEO_URL,{headers:{"Accept":"application/json","User-Agent":"PartiuCarona/1.0"}});
 if(!r.ok)throw new Error("Base geográfica indisponível");
 const data=await r.json();
 return data.filter(x=>x.codigo_uf===35||x.codigo_uf===33).map(x=>({name:x.nome+", "+(x.codigo_uf===35?"SP":"RJ"),slug:slugify(x.nome),lat:Number(x.latitude),lng:Number(x.longitude)})).filter(x=>Number.isFinite(x.lat)&&Number.isFinite(x.lng))
}
function findGeoCity(cities,label){const n=normalizeName(label);return cities.find(x=>normalizeName(x.name)===n)}
function normalizeName(v){return String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toLowerCase()}
function selectCandidates(cities,from,to,limit){
 const direct=distance(from,to),maxDetour=Math.max(70,direct*.35),bins=Array.from({length:limit},()=>[]);
 for(const c of cities){
   if(c.slug===from.slug||c.slug===to.slug)continue;
   const a=distance(from,c),b=distance(c,to),detour=a+b-direct,progress=direct-b;
   if(progress<=5||progress>=direct-5||detour>maxDetour)continue;
   const ratio=progress/direct,bin=Math.min(limit-1,Math.max(0,Math.floor(ratio*limit)));
   bins[bin].push({c,detour,score:detour+a*.01+b*.01})
 }
 const selected=bins.map(xs=>xs.sort((a,b)=>a.score-b.score)[0]).filter(Boolean).map(x=>x.c);
 if(selected.length<limit){
   const used=new Set(selected.map(x=>x.slug)),extra=cities.filter(c=>c.slug!==from.slug&&c.slug!==to.slug&&!used.has(c.slug))
     .map(c=>{const a=distance(from,c),b=distance(c,to),detour=a+b-direct,progress=direct-b;return{c,detour,progress}})
     .filter(x=>x.progress>5&&x.progress<direct-5&&x.detour<=maxDetour).sort((a,b)=>a.detour-b.detour);
   for(const x of extra){if(selected.length>=limit)break;selected.push(x.c)}
 }
 return selected.sort((a,b)=>distance(from,a)-distance(from,b))
}
function waitMinutes(arrival,departure){const a=minutes(arrival),b=minutes(departure);if(a<0||b<0)return-1;return b>=a?b-a:b+1440-a}
function makeRoute(legs){return{legs,totalPrice:legs.reduce((s,x)=>s+price(x.ride.price),0)}}
async function getRides(from,to,date){const [y,m,d]=date.split("-"),url="https://www.buscaonibus.com.br/horario/"+from+"/"+to+"?dt="+d+"%2F"+m+"%2F"+y,r=await fetch(url,{headers:{"Accept":"text/html","Accept-Language":"pt-BR,pt;q=0.9","User-Agent":"Mozilla/5.0 (compatible; CaronaFlow/1.0)"},cf:{cacheTtl:0}});if(!r.ok)return[];const html=decode(await r.text()),rides=[],seen=new Set();for(const match of html.matchAll(/href=["']([^"']*comprar-passagem\/blablacar[^"']*deep_link=[^"']+)["']/gi)){try{const href=match[1].replace(/&amp;/g,"&"),buyUrl=new URL(href,"https://www.buscaonibus.com.br"),deep=buyUrl.searchParams.get("deep_link");if(!deep||!/^https:\/\/(www\.)?blablacar\.com\.br\/trip\?/i.test(deep)||seen.has(deep))continue;seen.add(deep);rides.push({departure:buyUrl.searchParams.get("departure"),arrival:buyUrl.searchParams.get("arrival"),price:buyUrl.searchParams.get("price"),url:deep})}catch{}}return rides}
function parseWait(v,fallback){if(v===null||v==="")return fallback;const n=Number(v);return Number.isInteger(n)?n:-1}function validSlug(v){return /^[a-z0-9-]{2,80}$/.test(v)}function displayName(v){return v.split("-").map(x=>x.charAt(0).toUpperCase()+x.slice(1)).join(" ")+", SP"}function slugify(v){return v.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")}function distance(a,b){const r=6371,p=Math.PI/180,dlat=(b.lat-a.lat)*p,dlng=(b.lng-a.lng)*p,x=Math.sin(dlat/2)**2+Math.cos(a.lat*p)*Math.cos(b.lat*p)*Math.sin(dlng/2)**2;return 2*r*Math.asin(Math.sqrt(x))}function minutes(v){const m=String(v||"").match(/(\d{1,2}):(\d{2})/);return m?Number(m[1])*60+Number(m[2]):-1}function price(v){const n=parseFloat(String(v||"0").replace(",","."));return Number.isFinite(n)?n:0}function decode(s){return s.replace(/&#38;|&amp;/g,"&").replace(/&#x3D;|&#61;/g,"=").replace(/&quot;|&#34;/g,'"').replace(/&#x27;|&#39;/g,"'")}function json(body,status=200){return new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}})}