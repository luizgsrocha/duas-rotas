export const RN_HUB_VERSION="rn-hub-2026.10.1";
export const RN_HUB_DEFAULTS=Object.freeze({maxCandidates:12,maxDetourRatio:.30,maxDetourKm:250,minDetourKm:60,minEndpointKm:6});

export function rnHubKey(city){return `${rnHubSlug(city.name?.replace(/,\s*[A-Z]{2}$/i,"")||city.slug)}:${city.uf||""}`}

export function rankRnHubCandidates(cities,from,to,index,options={}){
 const settings={...RN_HUB_DEFAULTS,...options},direct=rnHubDistance(from,to);
 if(!Number.isFinite(direct)||direct<10||!index?.records)return[];
 const maxDetour=Math.min(settings.maxDetourKm,Math.max(settings.minDetourKm,direct*settings.maxDetourRatio));
 return cities.flatMap(city=>{
   if(city.slug===from.slug||city.slug===to.slug||!rnHubCoordinates(city))return[];
   const first=rnHubDistance(from,city),second=rnHubDistance(city,to),detour=first+second-direct;
   if(first<settings.minEndpointKm||second<settings.minEndpointKm||detour<-.5||detour>maxDetour)return[];
   const progress=rnHubProgress(from,to,city);
   if(progress<=.02||progress>=.98)return[];
   const record=index.records[rnHubKey(city)]||[0,0,"5",0],national=record[0]/1000;
   const routeFit=Math.max(0,1-detour/maxDetour);
   const continuity=Math.max(0,1-Math.abs(.5-progress)*1.15);
   const smallConnector=Math.min(1,record[3]/8)*(1-Math.min(1,national));
   // Context is dominant. National relevance breaks ties without turning the
   // selector into a list of capitals; REGIC-connected small cities get a boost.
   const score=.50*routeFit+.18*continuity+.22*national+.10*smallConnector;
   return[{city,score,progress,detour,national,routeFit,smallConnector,record}];
 }).sort((a,b)=>b.score-a.score||a.detour-b.detour||a.city.slug.localeCompare(b.city.slug));
}

export function selectRnHubCandidates(cities,from,to,index,options={}){
 const settings={...RN_HUB_DEFAULTS,...options},ranked=rankRnHubCandidates(cities,from,to,index,settings);
 if(!ranked.length)return[];
 const selected=[],buckets=[[],[],[],[]];
 for(const candidate of ranked)buckets[Math.min(3,Math.floor(candidate.progress*4))].push(candidate);
 // Each corridor quarter gets a contextual connector and a nationally relevant
 // anchor before receiving another candidate. This avoids both extremes: only
 // capitals or only tiny towns that happen to sit exactly on the straight line.
 const take=candidate=>{
   if(!candidate||selected.some(item=>rnHubDistance(item.city,candidate.city)<35))return false;
   selected.push(candidate);return true;
 };
 for(const bucket of buckets)take(bucket[0]);
 for(const bucket of buckets)take(bucket.slice().sort((a,b)=>b.national-a.national||b.score-a.score)[0]);
 while(selected.length<settings.maxCandidates&&buckets.some(bucket=>bucket.length)){
   for(const bucket of buckets){
     while(bucket.length&&selected.some(item=>rnHubDistance(item.city,bucket[0].city)<35))bucket.shift();
     take(bucket.shift());if(selected.length===settings.maxCandidates)break;
   }
 }
 // If separation was too strict, fill by score so small/short corridors still work.
 for(const candidate of ranked){
   if(selected.length===settings.maxCandidates)break;
   if(!selected.some(item=>item.city.slug===candidate.city.slug&&item.city.uf===candidate.city.uf))selected.push(candidate);
 }
 return selected.sort((a,b)=>a.progress-b.progress).map(item=>item.city);
}

function rnHubCoordinates(city){return Number.isFinite(city?.lat)&&Number.isFinite(city?.lng)}
function rnHubSlug(value){return String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")}
function rnHubProgress(from,to,city){
 const lat=(from.lat+to.lat)*Math.PI/360,x=(city.lng-from.lng)*Math.cos(lat),y=city.lat-from.lat,dx=(to.lng-from.lng)*Math.cos(lat),dy=to.lat-from.lat;
 return (x*dx+y*dy)/Math.max(.000001,dx*dx+dy*dy);
}
function rnHubDistance(a,b){const r=6371,p=Math.PI/180,dlat=(b.lat-a.lat)*p,dlng=(b.lng-a.lng)*p,x=Math.sin(dlat/2)**2+Math.cos(a.lat*p)*Math.cos(b.lat*p)*Math.sin(dlng/2)**2;return 2*r*Math.asin(Math.sqrt(x))}
