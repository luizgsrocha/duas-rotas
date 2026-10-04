const ROUTES=[
["Pirassununga","Taubaté"],["Pirassununga","Campinas"],["Pirassununga","São José dos Campos"],
["Campinas","Taubaté"],["Campinas","São José dos Campos"],["São José dos Campos","Taubaté"]
];
const SLUG={"Pirassununga":"pirassununga-sp","Taubaté":"taubate-sp","Campinas":"campinas-sp","São José dos Campos":"sao-jose-dos-campos-sp"};
export async function onRequestGet({request}){
 const date=new URL(request.url).searchParams.get("date");
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date||""))return json({error:"Data inválida"},400);
 const settled=await Promise.all(ROUTES.map(([from,to])=>fetchRoute(from,to,date)));
 const rides=settled.flat();
 return json({date,rides,count:rides.length,source:"BlaBlaCar public route pages"},{headers:{"Cache-Control":"public, max-age=300"}});
}
async function fetchRoute(from,to,date){
 const url=`https://www.blablacar.com.br/ride-sharing/${SLUG[from]}/${SLUG[to]}`;
 const res=await fetch(url,{headers:{"Accept":"text/html","Accept-Language":"pt-BR,pt;q=0.9","User-Agent":"Mozilla/5.0 (compatible; CaronaFlow/1.0)"}});
 if(!res.ok)return[];
 const html=await res.text();
 return parse(html,from,to,date,url);
}
function parse(html,from,to,date,url){
 const text=decode(html.replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/\s+/g," "));
 // Public pages expose cards in the form HH:MM duration Origin HH:MM Destination ... R$ price.
 const re=/(\d{2}:\d{2})\s+(\d+h(?:\d{1,2})?|\d{1,3}\s*min)\s+([^R]{1,80}?)\s+(\d{2}:\d{2})\s+([^R]{1,80}?)\s+R\$\s*([0-9]+(?:[,.][0-9]{1,2})?)/g;
 const out=[]; let m;
 while((m=re.exec(text))){
  const dep=m[1],arr=m[4],price=Number(m[6].replace(",","."));
  if(!Number.isFinite(price))continue;
  let arrivalDate=date;if(arr<dep)arrivalDate=nextDay(date);
  out.push({from,to,departure:`${date}T${dep}:00`,arrival:`${arrivalDate}T${arr}:00`,price,url});
 }
 return unique(out);
}
function decode(s){return s.replace(/&nbsp;|&#160;/g," ").replace(/&amp;/g,"&").replace(/&gt;/g,">").replace(/&lt;/g,"<").replace(/&#x27;|&#39;/g,"'").replace(/&quot;/g,'"')}
function nextDay(d){const x=new Date(d+"T12:00:00Z");x.setUTCDate(x.getUTCDate()+1);return x.toISOString().slice(0,10)}
function unique(a){const seen=new Set;return a.filter(x=>{const k=x.from+x.to+x.departure+x.arrival+x.price;if(seen.has(k))return false;seen.add(k);return true})}
function json(body,statusOrInit=200){const init=typeof statusOrInit==="number"?{status:statusOrInit}:statusOrInit;return new Response(JSON.stringify(body),{...init,headers:{"Content-Type":"application/json; charset=utf-8",...(init.headers||{})}})}
