const CITIES={pirassununga:{name:"Pirassununga",slug:"pirassununga",lat:-21.996,lng:-47.426},taubate:{name:"Taubaté",slug:"taubate",lat:-23.026,lng:-45.555},"sao-jose-dos-campos":{name:"São José dos Campos",slug:"sao-jose-dos-campos",lat:-23.189,lng:-45.884},campinas:{name:"Campinas",slug:"campinas",lat:-22.906,lng:-47.061}};
const DEFAULT_MIN_WAIT=5,DEFAULT_MAX_WAIT=60,DEFAULT_MAX_TRANSFERS=2,MAX_TRANSFERS=10;
export default{async fetch(request,env){const u=new URL(request.url);if(u.pathname==="/api/cities"){try{const data=await loadLocalCities(env,request);return json(data.map(({name,slug,uf})=>({name,slug,uf})))}catch(e){return json({error:"Falha ao carregar municípios"},502)}}if(u.pathname!=="/api/exists"){const r=await env.ASSETS.fetch(request),h=new Headers(r.headers);if(u.pathname==="/"||u.pathname.endsWith(".html"))h.set("Cache-Control","no-cache, no-store, must-revalidate");else if(u.pathname.endsWith(".js")||u.pathname.endsWith(".css"))h.set("Cache-Control","public, max-age=0, must-revalidate");return new Response(r.body,{status:r.status,statusText:r.statusText,headers:h})}try{const date=u.searchParams.get("date"),origin=u.searchParams.get("origin")||"pirassununga",key=u.searchParams.get("destination")||"taubate",originName=u.searchParams.get("originName")||displayName(origin),destinationName=u.searchParams.get("destinationName")||displayName(key),minWait=parseWait(u.searchParams.get("minWait"),DEFAULT_MIN_WAIT),maxWait=parseWait(u.searchParams.get("maxWait"),DEFAULT_MAX_WAIT),maxTransfers=parseWait(u.searchParams.get("maxTransfers"),DEFAULT_MAX_TRANSFERS);if(minWait<0||maxWait<minWait||maxWait>720)return json({error:"Intervalo de espera inválido"},400);if(maxTransfers<0||maxTransfers>MAX_TRANSFERS)return json({error:"Quantidade máxima de baldeações inválida"},400);if(!/^\d{4}-\d{2}-\d{2}$/.test(date||""))return json({error:"Data inválida"},400);if(!validSlug(origin)||!validSlug(key))return json({error:"Cidade inválida"},400);if(origin===key)return json({error:"Origem e destino devem ser diferentes"},400);const mode=u.searchParams.get("mode")||"all";if(!["all","direct","transfers"].includes(mode))return json({error:"Modo inválido"},400);let routes;const geo=await loadLocalCities(env,request);if(mode==="direct"||maxTransfers===0){const rides=await getRides(origin,key,date,fromBuscaSlug(geo,origin),fromBuscaSlug(geo,key));routes=rides.map(ride=>makeRoute([{from:origin,to:key,fromName:originName,toName:destinationName,ride}]));if(mode==="transfers")routes=[]}else{routes=await findRoutes(origin,key,date,originName,destinationName,minWait,maxWait,maxTransfers,geo);if(mode==="transfers")routes=routes.filter(x=>x.legs.length>1)}const direct=routes.filter(x=>x.legs.length===1),transfers=routes.filter(x=>x.legs.length>1);return json({date,origin,originName,destination:key,destinationName,mode,exists:routes.length>0,count:routes.length,directCount:direct.length,transferCount:transfers.length,source:"BuscaOnibus",routes})}catch(e){return json({error:"Falha ao consultar as caronas",detail:String(e&&e.message||e)},502)}}};
const HUB_SLUGS=new Set(["sao-paulo","campinas","sao-jose-dos-campos","sorocaba","ribeirao-preto","jundiai","piracicaba","bauru","sao-jose-do-rio-preto","araraquara","limeira","americana"]);
async function findRoutes(origin,target,date,originName,targetName,minWait,maxWait,maxTransfers,geo){
 const routes=[],direct=await getRides(origin,target,date,fromBuscaSlug(geo,origin),fromBuscaSlug(geo,target));
 for(const ride of direct)routes.push(makeRoute([{from:origin,to:target,fromName:originName,toName:targetName,ride}]));
 const from=findGeoCity(geo,originName),to=findGeoCity(geo,targetName);
 if(!from||!to)return routes;
 const hubs=selectHubs(geo,from,to),nodes=[from,...hubs,to],pairs=[];
 for(let i=0;i<nodes.length;i++)for(let j=0;j<nodes.length;j++){
   if(i===j)continue;
   const a=nodes[i],b=nodes[j];
   if(a.slug===origin&&b.slug===target)continue;
   if(distance(b,to)>=distance(a,to)-1)continue;
   pairs.push([a,b])
 }
 const settled=await Promise.allSettled(pairs.map(async([a,b])=>[a.slug+"|"+b.slug,await getRides(a.slug,b.slug,date,a.buscaOnibusSlug||a.slug,b.buscaOnibusSlug||b.slug)])),edges={};
 for(const x of settled)if(x.status==="fulfilled")edges[x.value[0]]=x.value[1];
 const found=[];
 function walk(city,legs,visited){
   if(legs.length>=maxTransfers+1)return;
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
async function loadLocalCities(env,request){const url=new URL("/cities.json",request.url),r=await env.ASSETS.fetch(url);if(!r.ok)throw new Error("Base local de cidades indisponível");const data=await r.json();if(!Array.isArray(data))throw new Error("Base local de cidades inválida");return data}
function findGeoCity(cities,label){const n=normalizeName(label);return cities.find(x=>normalizeName(x.name)===n)}
function normalizeName(v){return String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toLowerCase()}
function selectHubs(cities,from,to){
 const direct=distance(from,to),maxDetour=Math.max(70,direct*.35);
 return cities.filter(c=>{
   if(!HUB_SLUGS.has(c.slug)||c.slug===from.slug||c.slug===to.slug)return false;
   const a=distance(from,c),b=distance(c,to),detour=a+b-direct,progress=direct-b;
   return progress>5&&progress<direct-5&&detour<=maxDetour
 }).sort((a,b)=>distance(from,a)-distance(from,b))
}
function waitMinutes(arrival,departure){const a=minutes(arrival),b=minutes(departure);if(a<0||b<0)return-1;return b>=a?b-a:b+1440-a}
function makeRoute(legs){return{legs,totalPrice:legs.reduce((s,x)=>s+price(x.ride.price),0)}}
function fromBuscaSlug(cities,slug){const c=cities.find(x=>x.slug===slug);return c&&c.buscaOnibusSlug||slug}
async function getRides(from,to,date,fromBusca=from,toBusca=to){const [y,m,d]=date.split("-"),url="https://www.buscaonibus.com.br/horario/"+fromBusca+"/"+toBusca+"?dt="+d+"%2F"+m+"%2F"+y,r=await fetch(url,{headers:{"Accept":"text/html","Accept-Language":"pt-BR,pt;q=0.9","User-Agent":"Mozilla/5.0 (compatible; CaronaFlow/1.0)"},cf:{cacheTtl:0}});if(!r.ok)return[];const html=decode(await r.text()),rides=[],seen=new Set();for(const match of html.matchAll(/href=["']([^"']+)["']/gi)){try{const href=decode(match[1]),buyUrl=new URL(href,"https://www.buscaonibus.com.br"),isBlaBla=/\/comprar-passagem\/blablacar(?:\/|$)/i.test(buyUrl.pathname),deep=buyUrl.searchParams.get("deep_link"),validDeep=deep&&/^https:\/\/(www\.)?blablacar\.com\.br\/trip(?:\?|\/)/i.test(deep);if(!isBlaBla&&!validDeep)continue;const departure=buyUrl.searchParams.get("departure"),arrival=buyUrl.searchParams.get("arrival"),ridePrice=buyUrl.searchParams.get("price");if(!departure||!arrival)continue;const rideUrl=validDeep?deep:buyUrl.href,key=[departure,arrival,ridePrice||"",rideUrl].join("|");if(seen.has(key))continue;seen.add(key);rides.push({departure,arrival,price:ridePrice,url:rideUrl})}catch{}}return rides}
function parseWait(v,fallback){if(v===null||v==="")return fallback;const n=Number(v);return Number.isInteger(n)?n:-1}function validSlug(v){return /^[a-z0-9-]{2,80}$/.test(v)}function displayName(v){return v.split("-").map(x=>x.charAt(0).toUpperCase()+x.slice(1)).join(" ")+", SP"}function slugify(v){return v.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")}function distance(a,b){const r=6371,p=Math.PI/180,dlat=(b.lat-a.lat)*p,dlng=(b.lng-a.lng)*p,x=Math.sin(dlat/2)**2+Math.cos(a.lat*p)*Math.cos(b.lat*p)*Math.sin(dlng/2)**2;return 2*r*Math.asin(Math.sqrt(x))}function minutes(v){const m=String(v||"").match(/(\d{1,2}):(\d{2})/);return m?Number(m[1])*60+Number(m[2]):-1}function price(v){const n=parseFloat(String(v||"0").replace(",","."));return Number.isFinite(n)?n:0}function decode(s){return s.replace(/&#38;|&amp;/g,"&").replace(/&#x3D;|&#61;/g,"=").replace(/&quot;|&#34;/g,'"').replace(/&#x27;|&#39;/g,"'")}function json(body,status=200){return new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}})}