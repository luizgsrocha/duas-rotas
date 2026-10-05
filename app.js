const $=s=>document.querySelector(s);
const theme=$("#theme"),media=matchMedia("(prefers-color-scheme: dark)");
function applyTheme(v){document.documentElement.dataset.theme=v==="auto"?(media.matches?"dark":"light"):v}
theme.value=localStorage.getItem("theme")||"auto";applyTheme(theme.value);
theme.onchange=()=>{localStorage.setItem("theme",theme.value);applyTheme(theme.value)};
media.addEventListener("change",()=>{if(theme.value==="auto")applyTheme("auto")});
$("#date").value=new Date().toLocaleDateString("en-CA",{timeZone:"America/Sao_Paulo"});
$("#search").onclick=check;
async function check(){
 const date=$("#date").value;$("#status").textContent="Verificando Pirassununga → Taubaté…";$("#results").innerHTML="";
 try{
  const r=await fetch("/api/exists?date="+encodeURIComponent(date),{cache:"no-store"}),raw=await r.text();let d;try{d=JSON.parse(raw)}catch{throw new Error("Resposta inválida do servidor")}
  if(!r.ok)throw new Error(d.error||"Falha na consulta");
  $("#status").textContent=d.exists?"SIM — "+d.count+" carona(s) encontrada(s).":"NÃO — nenhuma carona encontrada nessa data.";
  if(!d.exists){$("#results").innerHTML='<article class="route"><h3>Nenhuma carona encontrada</h3><p>Pirassununga → Taubaté · '+formatDate(date)+"</p></article>";return}
  $("#results").innerHTML=d.rides.map((x,i)=>'<article class="route best"><h3>Carona '+(i+1)+'</h3><p>Pirassununga → Taubaté · '+formatDate(date)+'</p><p>'+(x.departure||"—")+' → '+(x.arrival||"—")+(x.price?" · R$ "+x.price:"")+'</p><div class="actions"><a href="'+esc(x.url)+'" target="_blank" rel="noopener">Ver na BlaBlaCar ↗</a><a href="'+esc(officialSearch(date))+'" target="_blank" rel="noopener">Testar busca oficial ↗</a></div></article>').join("");
 }catch(e){$("#status").textContent="Não foi possível verificar agora: "+e.message}
}
function formatDate(s){const a=s.split("-");return a[2]+"/"+a[1]+"/"+a[0]}
function esc(s){return String(s).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}\nfunction officialSearch(date){const u=new URL("https://www.blablacar.com.br/search");u.searchParams.set("comuto_cmkt","tra_ale_3");u.searchParams.set("fn","Pirassununga, SP, Brasil");u.searchParams.set("tn","Taubaté - SP, Brasil");u.searchParams.set("db",date);u.searchParams.set("seats","1");u.searchParams.set("search_origin","HOME");u.searchParams.set("from_place_id","eyJpIjoiQ2hJSjYzYm9oczhBeUpRUkZ6NUQzbWlHUk1RIiwicCI6MSwidiI6MSwidCI6WzRdfQ==");u.searchParams.set("to_place_id","eyJpIjoiQ2hJSk93MnZHVnI0ekpRUkg3U3kzYkZDeWtrIiwicCI6MSwidiI6MSwidCI6W119");u.searchParams.set("p0[ac]","adult");return u.toString()}