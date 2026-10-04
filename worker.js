const ROUTES=[
["Pirassununga","Taubaté"],["Pirassununga","Campinas"],["Pirassununga","São José dos Campos"],
["Campinas","Taubaté"],["Campinas","São José dos Campos"],["São José dos Campos","Taubaté"]
];
const SLUG={"Pirassununga":"pirassununga-sp","Taubaté":"taubate-sp","Campinas":"campinas-sp","São José dos Campos":"sao-jose-dos-campos-sp"};
export default{async fetch(request,env){
 const u=new URL(request.url);
 if(u.pathname!=="/api/rides")return env.ASSETS.fetch(request);
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
 const url=`https://www.blablacar.com.br/ride-sharing/${SLUG[from]}/${SLUG[to]}`;
 const r=await fetch(url,{headers:{"Accept":"text/html","Accept-Language":"pt-BR,pt;q=0.9","User-Agent":"Mozilla/5.0"}});
 if(!r.ok)throw new Error(`${from}→${to}: HTTP ${r.status}`);
 return parse(await r.text(),from,to,date,url);
}
function parse(html,from,to,date,url){
 const text=decode(html.replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/\s+/g," "));
 const patterns=[
  /(\d{1,2}:\d{2})[\s\S]{0,260}?(\d{1,2}:\d{2})[\s\S]{0,260}?R\$\s*([0-9]+(?:[,.][0-9]{1,2})?)/g,
  /R\$\s*([0-9]+(?:[,.][0-9]{1,2})?)[\s\S]{0,260}?(\d{1,2}:\d{2})[\s\S]{0,260}?(\d{1,2}:\d{2})/g
 ];
 const out=[];
 for(let p=0;p<patterns.length;p++){let m;while((m=patterns[p].exec(text))){
   const dep=p===0?m[1]:m[2],arr=p===0?m[2]:m[3],raw=p===0?m[3]:m[1],price=Number(raw.replace(",","."));
   if(!Number.isFinite(price))continue;
   let ad=date;if(minutes(arr)<minutes(dep))ad=nextDay(date);
   out.push({from,to,departure:`${date}T${pad(dep)}:00`,arrival:`${ad}T${pad(arr)}:00`,price,url});
 }}
 return unique(out);
}
const minutes=t=>{const[a,b]=t.split(":").map(Number);return a*60+b};
const pad=t=>t.split(":").map((x,i)=>i===0?x.padStart(2,"0"):x).join(":");
function decode(s){return s.replace(/&nbsp;|&#160;/g," ").replace(/&amp;/g,"&").replace(/&gt;/g,">").replace(/&lt;/g,"<").replace(/&#x27;|&#39;/g,"'").replace(/&quot;/g,'"')}
function nextDay(d){const x=new Date(d+"T12:00:00Z");x.setUTCDate(x.getUTCDate()+1);return x.toISOString().slice(0,10)}
function unique(a){const s=new Set;return a.filter(x=>{const k=[x.from,x.to,x.departure,x.arrival,x.price].join("|");if(s.has(k))return false;s.add(k);return true})}
function json(body,status=200){return new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}})}
