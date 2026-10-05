const SEARCH_URL="https://www.blablacar.com.br/carpool/routes/pirassununga-sp/taubate-sp";
export default{async fetch(request,env){
 const u=new URL(request.url);
 if(u.pathname!=="/api/exists"){const r=await env.ASSETS.fetch(request),h=new Headers(r.headers);if(u.pathname==="/"||u.pathname.endsWith(".html"))h.set("Cache-Control","no-cache, no-store, must-revalidate");else if(u.pathname.endsWith(".js")||u.pathname.endsWith(".css"))h.set("Cache-Control","public, max-age=0, must-revalidate");return new Response(r.body,{status:r.status,statusText:r.statusText,headers:h})}
 try{
  const date=u.searchParams.get("date");if(!/^\d{4}-\d{2}-\d{2}$/.test(date||""))return json({error:"Data inválida"},400);
  const r=await fetch(SEARCH_URL,{headers:{"Accept":"text/html","Accept-Language":"pt-BR,pt;q=0.9","User-Agent":"Mozilla/5.0 (compatible; CaronaFlow/1.0)"},cf:{cacheTtl:0}});
  if(!r.ok)throw new Error("BlaBlaCar HTTP "+r.status);
  const text=decode((await r.text()).replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/\s+/g," "));
  const label=dateLabel(date),pos=text.toLowerCase().indexOf(label.toLowerCase());
  if(pos<0)return json({date,exists:false,source:"BlaBlaCar",searchUrl:SEARCH_URL,reason:"date_not_listed"});
  const slice=text.slice(pos,pos+180),price=slice.match(/A partir de R\$\s*([0-9]+)/i);
  return json({date,exists:!!price,priceFrom:price?Number(price[1]):null,source:"BlaBlaCar",searchUrl:SEARCH_URL});
 }catch(e){return json({error:"Falha ao consultar a BlaBlaCar",detail:String(e&&e.message||e)},502)}
}};
function dateLabel(date){const[y,m,d]=date.split("-").map(Number),months=["jan.","fev.","mar.","abr.","mai.","jun.","jul.","ago.","set.","out.","nov.","dez."];return d+" de "+months[m-1]}
function decode(s){return s.replace(/&nbsp;|&#160;/g," ").replace(/&amp;/g,"&").replace(/&#x27;|&#39;/g,"'").replace(/&quot;/g,'"')}
function json(body,status=200){return new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}})}