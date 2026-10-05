export default{async fetch(request,env){
 const u=new URL(request.url);
 if(u.pathname!=="/api/exists"){const r=await env.ASSETS.fetch(request),h=new Headers(r.headers);if(u.pathname==="/"||u.pathname.endsWith(".html"))h.set("Cache-Control","no-cache, no-store, must-revalidate");else if(u.pathname.endsWith(".js")||u.pathname.endsWith(".css"))h.set("Cache-Control","public, max-age=0, must-revalidate");return new Response(r.body,{status:r.status,statusText:r.statusText,headers:h})}
 try{
  const date=u.searchParams.get("date"); if(!/^\d{4}-\d{2}-\d{2}$/.test(date||""))return json({error:"Data inválida"},400);
  const a=date.split("-"),searchUrl="https://www.buscaonibus.com.br/horario/pirassununga/taubate?dt="+a[2]+"%2F"+a[1]+"%2F"+a[0];
  const r=await fetch(searchUrl,{headers:{"Accept":"text/html","Accept-Language":"pt-BR,pt;q=0.9","User-Agent":"Mozilla/5.0 (compatible; CaronaFlow/1.0)"},cf:{cacheTtl:0}});
  if(!r.ok)throw new Error("BuscaOnibus HTTP "+r.status);
  const html=await r.text(),text=html.replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/\s+/g," ");
  const has=/Ofertas? de Carona|Caronas oferecidas pela BlaBlaCar/i.test(text)&&/BlaBlaCar/i.test(text);
  const summary=text.match(/preços? da carona (?:são|é) a partir de R\$\s*([0-9.,]+) em (\d+) opç/i),cards=(text.match(/Ofertas? de Carona\s*\d*/gi)||[]).length,count=summary?Number(summary[2]):cards;
  return json({date,exists:has&&(count>0||cards>0),count,source:"BuscaOnibus",searchUrl});
 }catch(e){return json({error:"Falha ao consultar o BuscaOnibus",detail:String(e&&e.message||e)},502)}
}};
function json(body,status=200){return new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}})}