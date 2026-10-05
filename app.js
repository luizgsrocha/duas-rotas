const $=s=>document.querySelector(s);
const theme=$("#theme"),media=matchMedia("(prefers-color-scheme: dark)");
function applyTheme(v){document.documentElement.dataset.theme=v==="auto"?(media.matches?"dark":"light"):v}
theme.value=localStorage.getItem("theme")||"auto";applyTheme(theme.value);
theme.onchange=()=>{localStorage.setItem("theme",theme.value);applyTheme(theme.value)};
media.addEventListener("change",()=>{if(theme.value==="auto")applyTheme("auto")});
$("#date").value=new Date().toLocaleDateString("en-CA",{timeZone:"America/Sao_Paulo"});
$("#search").onclick=check;
async function check(){
 const date=$("#date").value; $("#status").textContent="Verificando Pirassununga → Taubaté…"; $("#results").innerHTML="";
 try{
  const r=await fetch("/api/exists?date="+encodeURIComponent(date),{cache:"no-store"});
  const raw=await r.text(); let d; try{d=JSON.parse(raw)}catch{throw new Error("Resposta inválida do servidor")}
  if(!r.ok)throw new Error(d.error||"Falha na consulta");
  $("#status").textContent=d.exists?"SIM — existe carona nessa data.":"NÃO — nenhuma carona encontrada nessa data.";
  $("#results").innerHTML="<article class=\"route "+(d.exists?"best":"")+"\"><h3>"+(d.exists?"✓ Carona encontrada":"Nenhuma carona encontrada")+"</h3><p>Pirassununga → Taubaté · "+formatDate(date)+"</p>"+(d.count?"<p>"+d.count+" opção(ões) identificada(s) no BuscaOnibus.</p>":"")+"<div class=\"actions\"><a href=\""+d.searchUrl+"\" target=\"_blank\" rel=\"noopener\">Abrir no BuscaOnibus ↗</a></div></article>";
 }catch(e){$("#status").textContent="Não foi possível verificar agora: "+e.message}
}
function formatDate(s){const a=s.split("-");return a[2]+"/"+a[1]+"/"+a[0]}