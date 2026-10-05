const DESTINATIONS={taubate:{name:"Taubaté",slug:"taubate"},"sao-jose-dos-campos":{name:"São José dos Campos",slug:"sao-jose-dos-campos"},campinas:{name:"Campinas",slug:"campinas"}};
export default{async fetch(request,env){
 const u=new URL(request.url);
 if(u.pathname!=="/api/exists"){const r=await env.ASSETS.fetch(request),h=new Headers(r.headers);if(u.pathname==="/"||u.pathname.endsWith(".html"))h.set("Cache-Control","no-cache, no-store, must-revalidate");else if(u.pathname.endsWith(".js")||u.pathname.endsWith(".css"))h.set("Cache-Control","public, max-age=0, must-revalidate");return new Response(r.body,{status:r.status,statusText:r.statusText,headers:h})}
 try{
  const date=u.searchParams.get("date"),key=u.searchParams.get("destination")||"taubate",dest=DESTINATIONS[key];
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date||""))return json({error:"Data inválida"},400);
  if(!dest)return json({error:"Destino inválido"},400);
  const [y,m,d]=date.split("-"),sourceUrl="https://www.buscaonibus.com.br/horario/pirassununga/"+dest.slug+"?dt="+d+"%2F"+m+"%2F"+y;
  const r=await fetch(sourceUrl,{headers:{"Accept":"text/html","Accept-Language":"pt-BR,pt;q=0.9","User-Agent":"Mozilla/5.0 (compatible; CaronaFlow/1.0)"},cf:{cacheTtl:0}});
  if(!r.ok)throw new Error("BuscaOnibus HTTP "+r.status);
  const html=decode(await r.text()),rides=[],seen=new Set();
  for(const match of html.matchAll(/href=["']([^"']*comprar-passagem\/blablacar[^"']*deep_link=[^"']+)["']/gi)){try{const href=match[1].replace(/&amp;/g,"&"),buyUrl=new URL(href,"https://www.buscaonibus.com.br"),deep=buyUrl.searchParams.get("deep_link");if(!deep||!/^https:\/\/(www\.)?blablacar\.com\.br\/trip\?/i.test(deep)||seen.has(deep))continue;seen.add(deep);rides.push({departure:buyUrl.searchParams.get("departure"),arrival:buyUrl.searchParams.get("arrival"),price:buyUrl.searchParams.get("price"),url:deep})}catch{}}
  return json({date,destination:key,destinationName:dest.name,exists:rides.length>0,count:rides.length,source:"BuscaOnibus",rides,sourceUrl});
 }catch(e){return json({error:"Falha ao consultar as caronas",detail:String(e&&e.message||e)},502)}
}};
function decode(s){return s.replace(/&#38;|&amp;/g,"&").replace(/&#x3D;|&#61;/g,"=").replace(/&quot;|&#34;/g,'"').replace(/&#x27;|&#39;/g,"'")}
function json(body,status=200){return new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}})}