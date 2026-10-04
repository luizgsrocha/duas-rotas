const ROUTES=[
["Pirassununga","Taubaté"],["Pirassununga","Campinas"],["Pirassununga","São José dos Campos"],
["Campinas","Taubaté"],["Campinas","São José dos Campos"],["São José dos Campos","Taubaté"]
];
const SLUG={"Pirassununga":"pirassununga-sp","Taubaté":"taubate-sp","Campinas":"campinas-sp","São José dos Campos":"sao-jose-dos-campos-sp"};
export default{async fetch(request,env){
 const u=new URL(request.url);
 if(u.pathname!=="/api/rides"){
  const response=await env.ASSETS.fetch(request);
  const headers=new Headers(response.headers);
  if(u.pathname==="/"||u.pathname.endsWith(".html"))headers.set("Cache-Control","no-cache, no-store, must-revalidate");
  else if(u.pathname.endsWith(".js")||u.pathname.endsWith(".css"))headers.set("Cache-Control","public, max-age=3600, must-revalidate");
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
 }
 try{
  const date=u.searchParams.get("date");
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date||""))return json({error:"Data inválida"},400);
  const results=await Promise.allSettled(ROUTES.map(([a,b])=>fetchRoute(a,b,date)));
  const rides=results.flatMap(x=>x.status==="fulfilled"?x.value:[]);
  const failed=results.filter(x=>x.status==="rejected").length;
  return json({date,rides,count:rides.length,failed,source:"BlaBlaCar public route pages"});
 }catch(e){return json({error:"Falha ao consultar o BlaBlaCar",detail:String(e?.message||e)},502)}
}};
async function fetchRoute(from,to,date){
 const url=`https://www.blablacar.com.br/carpool/routes/${SLUG[from]}/${SLUG[to]}`;
 const r=await fetch(url,{headers:{"Accept":"text/html","Accept-Language":"pt-BR,pt;q=0.9","User-Agent":"Mozilla/5.0"}});
 if(!r.ok)throw new Error(`${from}→${to}: HTTP ${r.status}`);
 return parse(await r.text(),from,to,date,url);
}
function parse(html,from,to,date,url){
 const text=decode(html.replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/\s+/g," "));
 const patterns=[
  /(\d{1,2}:\d{2})\s+(?:\d+h(?:\d{1,2})?|\d{1,3}\s*min)\s+([^0-9]{2,80}?)\s+(\d{1,2}:\d{2})(?:\+1)?\s+([^R]{2,80}?)\s+R\$\s*([0-9]+)(?:\s*[,^{]00)?/g
 ];
 const out=[];
 for(const re of patterns){let m;while((m=re.exec(text))){
   const dep=m[1],actualFrom=cleanCity(m[2]),arr=m[3],actualTo=cleanCity(m[4]),price=Number(m[5]);
   if(!Number.isFinite(price))continue;
   let ad=date;if(minutes(arr)<minutes(dep))ad=nextDay(date);
   out.push({from:actualFrom||from,to:actualTo||to,departure:`${date}T${pad(dep)}:00`,arrival:`${ad}T${pad(arr)}:00`,price,url});
 }}
 return unique(out);
}
const cleanCity=s=>s.replace(/^(Mais barata e mais rápida|Mais barata|Mais rápida|Mais cedo)\s*/i,"").trim();
const minutes=t=>{const[a,b]=t.split(":").map(Number);return a*60+b};
const pad=t=>t.split(":").map((x,i)=>i===0?x.padStart(2,"0"):x).join(":");
function decode(s){return s.replace(/&nbsp;|&#160;/g," ").replace(/&amp;/g,"&").replace(/&gt;/g,">").replace(/&lt;/g,"<").replace(/&#x27;|&#39;/g,"'").replace(/&quot;/g,'"')}
function nextDay(d){const x=new Date(d+"T12:00:00Z");x.setUTCDate(x.getUTCDate()+1);return x.toISOString().slice(0,10)}
function unique(a){const s=new Set;return a.filter(x=>{const k=[x.from,x.to,x.departure,x.arrival,x.price].join("|");if(s.has(k))return false;s.add(k);return true})}
function json(body,status=200){return new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}})}
