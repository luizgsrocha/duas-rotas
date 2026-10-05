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
media.addEventListener?.("change",()=>{if(theme==="auto")applyTheme("auto")});
$("#date").value=new Date().toLocaleDateString("en-CA",{timeZone:"America/Sao_Paulo"});$("#search").onclick=check;loadCities();async function loadCities(){try{const r=await fetch("/api/cities"),cities=await r.json();if(!r.ok||!Array.isArray(cities))return;const origin=$("#origin").value,destination=$("#destination").value,html=cities.map(c=>`<option value="${esc(c.slug)}">${esc(c.name)}</option>`).join("");$("#origin").innerHTML=html;$("#destination").innerHTML=html;$("#origin").value=origin;$("#destination").value=destination}catch{}}
async function check(){const date=$("#date").value,origin=$("#origin").value,originName=$("#origin").selectedOptions[0].text,destination=$("#destination").value,destinationName=$("#destination").selectedOptions[0].text;if(origin===destination){$("#status").textContent="Escolha cidades diferentes para origem e destino.";$("#results").innerHTML="";return}$("#status").textContent="Procurando rotas "+originName+" → "+destinationName+"…";$("#results").innerHTML="";try{const r=await fetch("/api/exists?date="+encodeURIComponent(date)+"&origin="+encodeURIComponent(origin)+"&destination="+encodeURIComponent(destination)+"&originName="+encodeURIComponent(originName)+"&destinationName="+encodeURIComponent(destinationName),{cache:"no-store"}),d=await r.json();if(!r.ok)throw new Error(d.error||"Falha na consulta");$("#status").textContent=d.exists?d.count+" combinação(ões) encontrada(s).":"NÃO — nenhuma rota encontrada nessa data.";$("#results").innerHTML=d.routes.length?groupCards(d.routes):'<article class="route"><h3>Nenhuma rota encontrada</h3><p>'+esc(d.originName)+' → '+esc(d.destinationName)+' · '+formatDate(date)+'</p></article>'}catch(e){$("#status").textContent="Não foi possível verificar agora: "+e.message}}
function groupCards(routes){const groups={};for(const route of routes){const path=route.legs.map(x=>x.fromName).concat(route.legs.at(-1).toName).join(" → ");(groups[path]??=[]).push(route)}return Object.entries(groups).map(([path,items])=>{const vias=items[0].legs.slice(0,-1).map(x=>x.toName),title=vias.length?"Via "+vias.join(" + "):"Direta",tree=buildTree(items);return '<details class="route group"><summary><span><strong>'+esc(title)+'</strong><small>'+esc(path)+'</small></span><span class="group-meta"><strong>'+items.length+' '+(items.length===1?"combinação":"combinações")+'</strong></span></summary><div class="route-tree">'+renderNodes(tree,0)+'</div></details>'}).join("")}
function buildTree(routes){const root=[];for(const route of routes){let nodes=root;for(const leg of route.legs){const key=leg.from+"|"+leg.to+"|"+leg.ride.url;let node=nodes.find(x=>x.key===key);if(!node){node={key,leg,children:[]};nodes.push(node)}nodes=node.children}}return root}
function renderNodes(nodes,depth){return nodes.map((node,i)=>{const x=node.leg,has=node.children.length>0;let html='<div class="tree-node depth-'+depth+'"><div class="leg"><strong>'+esc(x.fromName)+' → '+esc(x.toName)+'</strong><span>'+(x.ride.departure||"—")+' → '+(x.ride.arrival||"—")+(x.ride.price?" · R$ "+x.ride.price:"")+'</span><a href="'+esc(x.ride.url)+'" target="_blank" rel="noopener">Ver na BlaBlaCar ↗</a></div>';if(has){html+='<div class="connections"><small>Conexões disponíveis</small>'+node.children.map(child=>{const wait=mins(child.leg.ride.departure)-mins(x.ride.arrival);return '<div class="connection-wait">Espera: '+waitText(wait)+'</div>'+renderNodes([child],depth+1)}).join("")+'</div>'}return html+"</div>"}).join("")}
function mins(v){const m=String(v||"").match(/(\d{1,2}):(\d{2})/);return m?Number(m[1])*60+Number(m[2]):-1}function waitText(n){const h=Math.floor(n/60),m=n%60;return(h?h+"h ":"")+m+"min"}function formatDate(s){const a=s.split("-");return a[2]+"/"+a[1]+"/"+a[0]}function esc(s){return String(s).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}