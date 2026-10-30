import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';

const root=new URL('../',import.meta.url),requests=[];
const server=createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/api/cities'){res.setHeader('Content-Type','application/json');res.end(await readFile(new URL('cities.json',root)));return}
  if(url.pathname==='/api/exists'){
    const record={destination:url.searchParams.get('destination'),closed:false};requests.push(record);
    req.on('close',()=>record.closed=true);
    if(record.destination==='campinas')setTimeout(()=>{if(!res.destroyed){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({count:0,routes:[],incomplete:false}))}},250);
    return;
  }
  const file=url.pathname==='/'?'index.html':url.pathname.slice(1);
  try{const data=await readFile(new URL(file,root));res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':'text/html');res.end(data)}catch{res.writeHead(404).end()}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
try{
  browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.goto(`http://127.0.0.1:${server.address().port}/`);await page.waitForFunction(()=>document.querySelector('#origin').dataset.cityBound==='1');
  const choose=async(selector,value)=>{await page.locator(selector).fill(value);await page.locator(selector).press('ArrowDown');await page.locator(selector).press('Enter')};
  await choose('#origin','Taubaté');await choose('#destination','Pirassununga');await page.locator('#search').click();
  await page.waitForFunction(()=>document.querySelector('#cancelSearch').hidden===false);assert.equal(await page.locator('#search').textContent(),'Buscar novamente');
  await page.locator('#cancelSearch').click();await page.waitForFunction(()=>document.querySelector('#status').textContent==='Busca cancelada.');assert.equal(await page.locator('#cancelSearch').isHidden(),true);
  await page.locator('#destination').fill('Campinas');await page.locator('#destination').press('ArrowDown');await page.locator('#destination').press('Enter');await page.locator('#search').click();
  await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Nenhuma rota encontrada'));assert.equal(requests.at(-1).destination,'campinas');
  assert.equal(await page.locator('#cancelSearch').isHidden(),true);console.log('Search cancellation UI: manual cancel, replacement search and stale-response protection passed.');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve))}
