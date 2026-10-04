import{buildRoutes,sortRoutes}from"./route-engine.js";
const $=s=>document.querySelector(s);
const fmt=d=>new Date(d).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
$("#date").value=new Date().toISOString().slice(0,10);
let current=[];
async function run(){
 const date=$("#date").value,time=$("#time").value;
 $("#status").textContent="Buscando caronas reais no BlaBlaCar…";$("#results").innerHTML="";
 try{
  const res=await fetch("/api/rides?date="+encodeURIComponent(date));
  const raw=await res.text(); let data; try{data=JSON.parse(raw)}catch{throw new Error(`API retornou resposta inválida (HTTP ${res.status})`)} if(!res.ok)throw new Error(data.error||"Falha na busca");
  const rides=data.rides.filter(r=>r.departure>=date+"T"+time);
  current=buildRoutes(rides,{minConnection:0});render();
  if(!data.count)$("#status").textContent="Nenhuma carona pôde ser lida para essa data. Abra as buscas no BlaBlaCar para conferir.";
 }catch(e){current=[];$("#status").textContent="Não foi possível consultar o BlaBlaCar agora: "+e.message;renderFallback(date)}
}
function render(){
 const routes=sortRoutes(current,$("#sort").value);
 $("#status").textContent=routes.length?routes.length+" combinações válidas encontradas no BlaBlaCar.":"Nenhuma combinação válida encontrada.";
 $("#results").innerHTML=routes.map((r,i)=>`<article class="route ${i===0?"best":""}"><h3>${i===0?"⭐ ":""}${r.connections===0?"Direto":r.connections+" baldeação"+(r.connections>1?"ões":"")}</h3><div class="legs">${r.legs.map(l=>`<div class="leg"><b>${l.from} → ${l.to}</b><br>${fmt(l.departure)} → ${fmt(l.arrival)} · R$ ${l.price.toFixed(2).replace(".",",")}</div>`).join("")}</div><div class="meta"><span>R$ ${r.price.toFixed(2).replace(".",",")}</span><span>${Math.floor(r.duration/60)}h${String(r.duration%60).padStart(2,"0")}</span></div><div class="actions">${r.legs.map((l,n)=>`<a href="${l.url}" target="_blank" rel="noopener">Abrir ${r.legs.length>1?`trecho ${n+1}`:"no BlaBlaCar"} ↗</a>`).join("")}</div></article>`).join("");
}
function renderFallback(date){
 const pairs=[["Pirassununga","Taubaté"],["Pirassununga","Campinas"],["Pirassununga","São José dos Campos"],["Campinas","Taubaté"],["Campinas","São José dos Campos"],["São José dos Campos","Taubaté"]];
 $("#results").innerHTML='<article class="route"><h3>Conferir diretamente</h3><div class="actions">'+pairs.map(([a,b])=>`<a target="_blank" rel="noopener" href="${routeUrl(a,b)}">${a} → ${b} ↗</a>`).join("")+"</div></article>";
}
function routeUrl(a,b){return "https://www.blablacar.com.br/ride-sharing/"+slug(a)+"/"+slug(b)}
function slug(s){return s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\s+/g,"-")+"-sp"}
$("#search").onclick=run;$("#sort").onchange=render;
