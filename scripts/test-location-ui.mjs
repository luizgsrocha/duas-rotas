import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';

const root=new URL('../',import.meta.url);
const server=createServer(async(req,res)=>{const path=new URL(req.url,'http://localhost').pathname,file=path==='/api/cities'?'cities.json':path==='/'?'index.html':path.slice(1);try{const data=await readFile(new URL(file,root));res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.json')?'application/json':file.endsWith('.png')?'image/png':'text/html');res.end(data)}catch{res.writeHead(404).end()}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
try{
  browser=await chromium.launch({headless:true});const context=await browser.newContext({geolocation:{latitude:-23.026,longitude:-45.555},permissions:['geolocation']});
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.route('https://nominatim.openstreetmap.org/**',route=>route.fulfill({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify({address:{city:'Taubaté',state:'São Paulo','ISO3166-2-lvl4':'BR-SP',country:'Brasil',country_code:'br'}})}));
  await page.goto(`http://127.0.0.1:${server.address().port}/`);await page.waitForFunction(()=>document.querySelector('#origin').dataset.cityBound==='1');await page.locator('#locate').click();await page.waitForFunction(()=>document.querySelector('#origin').dataset.slug==='taubate');
  assert.equal(await page.locator('#origin').inputValue(),'Taubaté, SP');assert.equal(await page.locator('#location-feedback').textContent(),'');assert.equal(await page.locator('#locate').isEnabled(),true);assert.deepEqual(errors,[]);
  console.log('Location UI: Taubaté coordinates and Nominatim municipality resolve to Taubaté, SP.');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve))}
