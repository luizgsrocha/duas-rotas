const $=s=>document.querySelector(s),$$=s=>document.querySelectorAll(s);
const media=matchMedia("(prefers-color-scheme: dark)");
let theme="auto";
try{theme=localStorage.getItem("theme")||"auto"}catch{}
function applyTheme(v){
  theme=["light","auto","dark"].includes(v)?v:"auto";
  document.documentElement.setAttribute("data-theme",theme==="auto"?(media.matches?"dark":"light"):theme);
  $$("[data-theme-value]").forEach(b=>{
    const active=b.dataset.themeValue===theme;
    b.classList.toggle("active",active);
    b.setAttribute("aria-pressed",String(active));
  });
}
function setTheme(v){
  try{localStorage.setItem("theme",v)}catch{}
  applyTheme(v);
}
$$("[data-theme-value]").forEach(b=>b.addEventListener("click",()=>setTheme(b.dataset.themeValue)));
applyTheme(theme);
const shareUrl="https://rua-nossa.lgsr96.workers.dev/";
$("#share-site").addEventListener("click",async()=>{
  const feedback=$("#share-feedback");
  feedback.textContent="";
  const data={title:"Rua Nossa",text:"Conheça o Rua Nossa! Encontre caronas pelo Brasil.",url:shareUrl};
  if(typeof navigator.share==="function"){
    try{await navigator.share(data);return}
    catch(error){
      if(error?.name==="AbortError")return;
    }
  }
  try{
    if(typeof navigator.clipboard?.writeText!=="function")throw new Error("Clipboard indisponível");
    await navigator.clipboard.writeText(shareUrl);
    feedback.textContent="Link copiado!";
  }catch{
    feedback.textContent="Copie o endereço: "+shareUrl;
  }
});

media.addEventListener?.("change",()=>{if(theme==="auto")applyTheme("auto")});
$("#date").value=spDate(new Date());$("#openCalendar").addEventListener("click",()=>{const input=$("#date");try{if(typeof input.showPicker==="function"){input.showPicker();return}}catch{}input.focus();input.click()});$("#search").onclick=check;$("#sort").onchange=renderLastResults;$("#swap").onclick=swapRoute;$("#locate").onclick=useLocation;let cities=[],cityByName=new Map(),lastResults=null,lastDate="";loadCities();async function loadCities(){try{const r=await fetch("/api/cities"),data=await r.json();if(!r.ok||!Array.isArray(data))return;cities=data;cityByName=new Map(cities.map(c=>[cityNormalize(c.name),c]));$$(".city-input").forEach(input=>{bindCity(input);input._refreshCities?.()})}catch{}}// Search-only normalization: route/provider normalization remains unchanged.
function cityNormalize(value){
  return String(value??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
}
const citySearchCache=new WeakMap();
const cityStates=new Set("AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".toLowerCase().split(" "));
function citySearchRecords(items){
  if(!citySearchCache.has(items))citySearchCache.set(items,items.map(c=>{
    const name=cityNormalize(c.name),uf=String(c.uf||c.name.match(/,\s*([a-z]{2})$/i)?.[1]||"").toLowerCase();
    const base=uf&&name.endsWith(" "+uf)?name.slice(0,-3):name;
    return {c,name,base,uf,words:base.split(" ")};
  }));
  return citySearchCache.get(items);
}
function cityDistance(a,b,limit=2){
  if(Math.abs(a.length-b.length)>limit)return limit+1;
  let prev=Array.from({length:b.length+1},(_,i)=>i);
  for(let i=1;i<=a.length;i++){
    const next=[i];let min=i;
    for(let j=1;j<=b.length;j++){
      next[j]=Math.min(next[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));
      min=Math.min(min,next[j]);
    }
    if(min>limit)return limit+1;
    prev=next;
  }
  return prev[b.length];
}
// Minimum edit distance to a candidate prefix in one DP pass.
function cityPrefixDistance(query,word,limit){
  if(word.length<query.length-limit)return limit+1;
  word=word.slice(0,query.length+limit);
  let prev=Array.from({length:word.length+1},(_,i)=>i);
  for(let i=1;i<=query.length;i++){
    const next=Array(word.length+1).fill(limit+1);next[0]=i;let min=i;
    for(let j=Math.max(1,i-limit);j<=Math.min(word.length,i+limit);j++){
      next[j]=Math.min(next[j-1]+1,prev[j]+1,prev[j-1]+(query[i-1]===word[j-1]?0:1));
      min=Math.min(min,next[j]);
    }
    if(min>limit)return limit+1;
    prev=next;
  }
  return Math.min(...prev.slice(Math.max(1,query.length-limit)));
}
function rankCities(items,query,limit=40){
  let q=cityNormalize(query);
  if(!q)return items.slice(0,limit);
  const tokens=q.split(" ");let state="";
  if(tokens.length>1&&cityStates.has(tokens.at(-1))){state=tokens.pop();q=tokens.join(" ")}
  const matches=[],fuzzy=[];
  for(const r of citySearchRecords(items)){
    if(state&&r.uf!==state)continue;
    const {base,words}=r;let score=Infinity;
    if(base===q)score=0;
    else if(base.startsWith(q))score=10+(base.length-q.length)*.001;
    else if(words.some((_,i)=>words.slice(i).join(" ").startsWith(q)))score=20;
    else if(base.includes(q))score=30;
    if(Number.isFinite(score))matches.push({r,score});
    else if(q.length>=4)fuzzy.push(r);
  }
  // Exact/prefix/substring results always win. Avoid fuzzy work when the list is full.
  if(!matches.length&&q.length>=4){
    const edits=q.length<6?1:2;
    for(const r of fuzzy){
      let distance=edits+1;
      const candidates=q.includes(" ")?[r.base]:r.words;
      for(const word of candidates){
        distance=Math.min(distance,cityPrefixDistance(q,word,edits));
      }
      if(distance<=edits)matches.push({r,score:40+distance+Math.abs(r.base.length-q.length)*.001});
    }
  }
  matches.sort((a,b)=>a.score-b.score||a.r.c.name.localeCompare(b.r.c.name,"pt-BR")||a.r.c.slug.localeCompare(b.r.c.slug));
  return matches.slice(0,limit).map(x=>x.r.c);
}
function bindCity(input){if(input.dataset.cityBound)return;input.dataset.cityBound="1";const box=input.closest(".city-combobox"),list=box.querySelector(".city-options");let active=-1;function close(){list.hidden=true;input.setAttribute("aria-expanded","false");active=-1;input.removeAttribute("aria-activedescendant")}function draw(){const matches=rankCities(cities,input.value);list.replaceChildren();active=-1;input.removeAttribute("aria-activedescendant");if(!matches.length){const empty=document.createElement("div");empty.className="city-empty";empty.textContent=cities.length?"Nenhuma cidade encontrada.":"Carregando cidades…";list.append(empty)}else matches.forEach((c,i)=>{const option=document.createElement("button");option.type="button";option.tabIndex=-1;option.className="city-option";option.id=input.id+"-option-"+i;option.setAttribute("role","option");option.setAttribute("aria-selected",String(cityNormalize(input.value)===cityNormalize(c.name)));option.textContent=c.name;option.addEventListener("pointerdown",e=>e.preventDefault());option.addEventListener("click",()=>{setCity(input,c);input.focus();close()});list.append(option)});list.hidden=false;input.setAttribute("aria-expanded","true")}function move(n){const opts=[...list.querySelectorAll(".city-option")];if(!opts.length)return;active=active<0?(n>0?0:opts.length-1):(active+n+opts.length)%opts.length;opts.forEach((o,i)=>{o.classList.toggle("highlighted",i===active);o.setAttribute("aria-selected",String(i===active))});input.setAttribute("aria-activedescendant",opts[active].id);opts[active].scrollIntoView({block:"nearest"})}input.addEventListener("focus",draw);input.addEventListener("input",()=>{const c=cityByName.get(cityNormalize(input.value));input.dataset.slug=c?c.slug:"";draw()});input.addEventListener("keydown",e=>{if(e.isComposing)return;if(e.key==="Escape"){close();return}if(e.key==="ArrowDown"||e.key==="ArrowUp"){e.preventDefault();if(list.hidden)draw();move(e.key==="ArrowDown"?1:-1)}if(e.key==="Enter"&&!list.hidden&&active>=0){e.preventDefault();list.querySelectorAll(".city-option")[active]?.click()}if(e.key==="Tab")close()});input.addEventListener("blur",()=>setTimeout(()=>{if(!box.contains(document.activeElement))close()},100));document.addEventListener("pointerdown",e=>{if(!box.contains(e.target))close()});input.addEventListener("change",()=>{const c=cityByName.get(cityNormalize(input.value));input.dataset.slug=c?c.slug:""});input._refreshCities=()=>{if(document.activeElement===input)draw()}}function setCity(input,c){input.value=c.name;input.dataset.slug=c.slug}function swapRoute(){const origin=$("#origin"),dest=$(".destination"),a=selectedCity(origin),b=selectedCity(dest);if(!a||!b){$("#status").textContent="Escolha uma origem e um destino válidos antes de inverter.";return}setCity(origin,b);setCity(dest,a)}function locationFeedback(message,error=false){const el=$("#location-feedback");el.textContent=message;el.hidden=!message;el.classList.toggle("error",error)}
async function useLocation(){
 const btn=$("#locate");
 locationFeedback("");
 if(!window.isSecureContext){locationFeedback("A localização exige uma conexão HTTPS segura.",true);return}
 if(!navigator.geolocation){locationFeedback("Seu navegador não oferece geolocalização. Selecione a cidade manualmente.",true);return}
 btn.disabled=true;btn.textContent="📍 Localizando…";
 const reset=()=>{btn.disabled=false;btn.textContent="📍 Usar minha localização"};
 navigator.geolocation.getCurrentPosition(async p=>{
   try{
     const {latitude,longitude}=p.coords;
     const r=await fetch("https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat="+encodeURIComponent(latitude)+"&lon="+encodeURIComponent(longitude)+"&zoom=10&addressdetails=1",{headers:{"Accept-Language":"pt-BR"}});
     if(!r.ok)throw new Error("Não foi possível consultar a cidade. Tente novamente ou selecione manualmente.");
     const d=await r.json(),name=d.address?.city||d.address?.town||d.address?.municipality||d.address?.village;
     const iso=d.address?.["ISO3166-2-lvl4"]||d.address?.["ISO3166-2-lvl6"]||"",uf=(iso.match(/BR-([A-Z]{2})$/)||[])[1]||"";
     const c=name&&uf&&cityByName.get(norm(name+", "+uf));
     if(!c)throw new Error("Município não encontrado na lista de todo o Brasil (26 estados e DF). Selecione a origem manualmente.");
     setCity($("#origin"),c);
     locationFeedback("");
   }catch(e){locationFeedback(e.message||"Não foi possível identificar sua cidade.",true)}
   finally{reset()}
 },error=>{
   reset();
   const messages={1:"Permissão de localização negada. Autorize o acesso nas configurações do navegador e tente novamente.",2:"Localização indisponível. Verifique o GPS e tente novamente.",3:"A localização demorou demais. Tente novamente ou selecione a cidade manualmente."};
   locationFeedback(messages[error.code]||"Não foi possível acessar sua localização. Tente novamente.",true);
 },{enableHighAccuracy:false,timeout:20000,maximumAge:300000});
}
function selectedCity(input){const c=cityByName.get(cityNormalize(input.value));if(c){input.dataset.slug=c.slug;return c}return null}function norm(v){return String(v).normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toLowerCase()}
function spDate(d){return d.toLocaleDateString("en-CA",{timeZone:"America/Sao_Paulo"})}
async function runSearchModes(fetchMode,maxTransfers,onUpdate=()=>{}){
 let direct=null,directError=null,transfers=null,transferError=null;
 try{direct=await fetchMode("direct")}catch(error){directError=error}
 onUpdate({phase:"direct",direct,directError});
 if(maxTransfers>0){
  onUpdate({phase:"transfers",direct,directError});
  try{transfers=await fetchMode("transfers")}catch(error){transferError=error}
 }
 return{direct,directError,transfers,transferError};
}
async function check(){
 window.scrollTo({top:document.documentElement.scrollHeight,behavior:"smooth"});
 const date=$("#date").value,maxWait=Number($("#maxWait").value),maxTransfers=Number($("#maxTransfers").value),originCity=selectedCity($("#origin")),destinationCity=selectedCity($(".destination"));
 if(!Number.isInteger(maxWait)||maxWait<0||maxWait>720){$("#status").textContent="Defina um tempo máximo de espera entre 0 e 720 minutos.";$("#results").innerHTML="";return}
 if(!Number.isInteger(maxTransfers)||maxTransfers<0||maxTransfers>10){$("#status").textContent="Defina no máximo de 0 a 10 baldeações.";$("#results").innerHTML="";return}
 if(!originCity||!destinationCity){$("#status").textContent="Selecione uma cidade válida na lista.";$("#results").innerHTML="";return}
 if(originCity.slug===destinationCity.slug){$("#status").textContent="A origem não pode ser igual ao destino.";$("#results").innerHTML="";return}
 const originName=originCity.name,destinationName=destinationCity.name;
 const base="/api/exists?date="+encodeURIComponent(date)+"&origin="+encodeURIComponent(originCity.slug)+"&destination="+encodeURIComponent(destinationCity.slug)+"&originName="+encodeURIComponent(originName)+"&destinationName="+encodeURIComponent(destinationName)+"&minWait=0&maxWait="+encodeURIComponent(maxWait)+"&maxTransfers="+encodeURIComponent(maxTransfers);
 const fetchMode=async mode=>{
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),mode==="direct"?35000:305000);
  try{const r=await fetch(base+"&mode="+mode,{cache:"no-store",signal:controller.signal}),d=await r.json();if(!r.ok)throw new Error(d.error||"Falha na consulta");return d}
  catch(error){if(controller.signal.aborted)throw new Error("A consulta demorou demais. Tente novamente.");throw error}
  finally{clearTimeout(timer)}
 };
 $("#search").disabled=true;lastDate=date;lastResults={originName,destinationName,routes:[],count:0};$("#transferLoading").hidden=true;$("#status").textContent="Procurando caronas diretas…";$("#results").innerHTML="";
 try{
  const search=await runSearchModes(fetchMode,maxTransfers,state=>{
   if(state.phase==="direct"){
    if(state.direct){lastResults=state.direct;renderLastResults();$("#status").textContent=state.direct.incomplete?(state.direct.warning||"Não foi possível concluir a busca direta."):state.direct.count?state.direct.count+" carona(s) direta(s) encontrada(s).":"Nenhuma carona direta encontrada."}
    else{$("#status").textContent=maxTransfers>0?"A consulta direta falhou. Continuando a busca por baldeações…":"Não foi possível consultar caronas diretas.";lastResults={originName,destinationName,routes:[],count:0,incomplete:true};renderLastResults()}
   }
   if(state.phase==="transfers"){
    $("#status").textContent=(state.directError||state.direct?.incomplete?"Busca direta incompleta. ":state.direct?.count?state.direct.count+" carona(s) direta(s). ":"Nenhuma carona direta encontrada. ")+"Buscando baldeações…";
    $("#transferLoading").hidden=false;
   }
  });
  const directTotal=search.direct?.count||0,transferTotal=search.transfers?.count||0;
  const transferError=search.transferError?.message||(search.transfers?.incomplete?(search.transfers.warning||"Alguns trechos não puderam ser consultados."):"");
  const incomplete=Boolean(search.directError||search.direct?.incomplete||search.transferError||search.transfers?.incomplete);
  const routes=[...(search.direct?.routes||[]),...(search.transfers?.routes||[])];
  lastResults={...(search.direct||{}),originName,destinationName,routes,count:routes.length,directCount:directTotal,transferCount:transferTotal,incomplete};
  renderLastResults();$("#transferLoading").hidden=true;
  if(maxTransfers===0){
   $("#status").textContent=search.directError?"Não foi possível verificar a busca direta: "+search.directError.message:search.direct?.incomplete?(search.direct.warning||"A busca ficou incompleta."):directTotal?directTotal+" carona(s) direta(s) encontrada(s).":"Nenhuma rota encontrada nessa data.";
   return;
  }
  if(incomplete){
   const reasons=[search.directError?"A consulta direta falhou: "+search.directError.message:search.direct?.incomplete?(search.direct.warning||"A busca direta ficou incompleta."):"",transferError?"A busca de baldeações ficou incompleta: "+transferError:""].filter(Boolean).join(" ");
   $("#status").textContent=routes.length?routes.length+" opção(ões) verificada(s), mas a busca ficou incompleta. "+reasons:"Não foi possível concluir toda a busca. "+(reasons||"Tente novamente em instantes.");
   return;
  }
  $("#status").textContent=routes.length?routes.length+" combinação(ões) encontrada(s) — "+directTotal+" direta(s) e "+transferTotal+" com baldeação.":"Nenhuma rota encontrada nessa data.";
 }catch(error){$("#transferLoading").hidden=true;$("#status").textContent="Não foi possível verificar agora: "+error.message}
 finally{$("#transferLoading").hidden=true;$("#search").disabled=false}
}

function renderLastResults(){if(!lastResults)return;const mode=$("#sort").value;$("#results").innerHTML=[lastResults].map(d=>{const routes=sortRoutes(d.routes||[],mode);return '<section class="destination-result"><h2>'+esc(d.destinationName)+'</h2><small>'+esc(d.originName)+' → '+esc(d.destinationName)+' · '+formatDate(lastDate)+'</small>'+(routes.length?groupCards(routes):(d.incomplete?'<article class="route"><h3>Busca incompleta</h3><p>Não foi possível concluir a consulta à fonte de caronas. A disponibilidade não foi confirmada. Tente novamente.</p></article>':'<article class="route"><h3>Nenhuma rota encontrada</h3></article>'))+'</section>'}).join("")}
function sortRoutes(routes,mode){const list=[...routes];if(mode==="fastest")return list.sort((a,b)=>routeDuration(a)-routeDuration(b));if(mode==="cheapest")return list.sort((a,b)=>routePrice(a)-routePrice(b));if(mode==="fewest")return list.sort((a,b)=>a.legs.length-b.legs.length||routeDuration(a)-routeDuration(b));return list.sort((a,b)=>a.legs.length-b.legs.length||routeDuration(a)-routeDuration(b)||routePrice(a)-routePrice(b))}function routeDuration(route){if(!route.legs.length)return Infinity;const a=mins(route.legs[0].ride.departure),b=mins(route.legs.at(-1).ride.arrival);if(a<0||b<0)return Infinity;return b>=a?b-a:b+1440-a}function routePrice(route){if(Number.isFinite(route.totalPrice))return route.totalPrice;return route.legs.reduce((n,x)=>n+(parseFloat(String(x.ride.price||"0").replace(",","."))||0),0)}
function connectionSummary(route){if(route.legs.length<2)return "";const waits=[];for(let i=1;i<route.legs.length;i++){const previous=route.legs[i-1],next=route.legs[i],start=mins(previous.ride.arrival),end=mins(next.ride.departure);if(start<0||end<0){waits.push("Espera não informada em "+previous.toName);continue}const duration=(end-start+1440)%1440;waits.push("Espera em "+previous.toName+": "+waitText(duration))}return '<span class="combination-waits">'+waits.map(esc).join(" · ")+'</span>'}
function routeCard(route){const legs=route.legs;if(!legs.length)return "";const first=legs[0],last=legs.at(-1),departure=first.ride.departure||"—",arrival=last.ride.arrival||"—",duration=routeDuration(route),durationText=Number.isFinite(duration)?waitText(duration):"Duração indisponível",connections=legs.length-1,hasPrices=Number.isFinite(route.totalPrice)||legs.every(x=>x.ride.price!==undefined&&x.ride.price!==null&&String(x.ride.price).trim()!=="");const price=hasPrices?"R$ "+routePrice(route).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2}):"Preço indisponível";return '<details class="route-combination"><summary><span class="combination-top"><span class="combination-tag">'+(connections===0?"Direta":connections+" "+(connections===1?"baldeação":"baldeações"))+'</span><strong class="combination-price">'+esc(price)+'</strong></span><span class="combination-times"><span><strong>'+esc(departure)+'</strong><small>'+esc(first.fromName)+'</small></span><span class="combination-duration"><small>'+esc(durationText)+'</small><span aria-hidden="true">🚗 ───→</span></span><span class="combination-arrival"><strong>'+esc(arrival)+'</strong><small>'+esc(last.toName)+'</small></span></span>'+connectionSummary(route)+'<span class="combination-expand">Ver percurso completo <span aria-hidden="true">⌄</span></span></summary><div class="combination-details">'+renderNodes(buildTree([route]),0)+'</div></details>'}
function groupCards(routes){const groups={};for(const route of routes){if(!route.legs.length)continue;const path=route.legs.map(x=>x.fromName).concat(route.legs.at(-1).toName).join(" → ");(groups[path]??=[]).push(route)}return Object.entries(groups).map(([path,items],index)=>{const vias=items[0].legs.slice(0,-1).map(x=>x.toName),title=vias.length?"Via "+vias.join(" + "):"Direta",map=routeMap(items[0]);return '<details class="route group"'+(index===0?' open':'')+'><summary><span><strong>'+esc(title)+'</strong><small>'+esc(path)+'</small></span><span class="group-meta"><strong>'+items.length+' '+(items.length===1?"combinação":"combinações")+'</strong></span></summary><div class="route-map">'+map+'</div><div class="combination-list">'+items.map(routeCard).join("")+'</div></details>'}).join("")}
function routeMap(route){const names=route.legs.map(x=>x.fromName).concat(route.legs.at(-1).toName),origin=names[0],destination=names.at(-1),waypoints=names.slice(1,-1),q="https://www.google.com/maps/dir/?api=1&origin="+encodeURIComponent(origin)+"&destination="+encodeURIComponent(destination)+(waypoints.length?"&waypoints="+encodeURIComponent(waypoints.join("|")):"");return '<a class="map-link" href="'+esc(q)+'" target="_blank" rel="noopener"><span class="map-route">🗺️ '+names.map(esc).join(" → ")+'</span><strong>Ver trajeto no mapa ↗</strong></a>'}
function buildTree(routes){const root=[];for(const route of routes){let nodes=root;for(const leg of route.legs){const key=leg.from+"|"+leg.to+"|"+leg.ride.url;let node=nodes.find(x=>x.key===key);if(!node){node={key,leg,children:[]};nodes.push(node)}nodes=node.children}}return root}
function renderNodes(nodes,depth){return nodes.map(node=>{const x=node.leg,has=node.children.length>0,dep=x.ride.departure||"—",arr=x.ride.arrival||"—";let html='<div class="tree-node depth-'+depth+'"><div class="timeline-stop"><span class="timeline-time">'+esc(dep)+'</span><span class="timeline-dot"></span><strong>'+esc(x.fromName)+'</strong></div><div class="timeline-ride"><div class="ride-card"><div><strong>🚗 '+esc(x.fromName)+' → '+esc(x.toName)+'</strong><span>'+esc(dep)+' → '+esc(arr)+(x.ride.price?" · R$ "+esc(x.ride.price):"")+'</span></div><a href="'+esc(x.ride.url)+'" target="_blank" rel="noopener">Ver na BlaBlaCar ↗</a></div></div><div class="timeline-stop arrival"><span class="timeline-time">'+esc(arr)+'</span><span class="timeline-dot"></span><strong>'+esc(x.toName)+'</strong></div>';if(has){html+='<div class="connections"><small>Conexões disponíveis</small>'+node.children.map(child=>{const wait=mins(child.leg.ride.departure)-mins(x.ride.arrival);return '<div class="connection-wait">⏱ Espera de '+waitText(wait)+'</div>'+renderNodes([child],depth+1)}).join("")+'</div>'}return html+"</div>"}).join("")}
function mins(v){const m=String(v||"").match(/(\d{1,2}):(\d{2})/);return m?Number(m[1])*60+Number(m[2]):-1}function waitText(n){const h=Math.floor(n/60),m=n%60;return(h?h+"h ":"")+m+"min"}function formatDate(s){const a=s.split("-");return a[2]+"/"+a[1]+"/"+a[0]}function esc(s){return String(s).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}
