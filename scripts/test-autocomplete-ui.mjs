import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url);
const server=createServer(async(req,res)=>{
 const path=new URL(req.url,'http://localhost').pathname;
 const file=path==='/api/cities'?'cities.json':path==='/'?'index.html':path.slice(1);
 if(!['index.html','app.js','style.css','cities.json','logo1.png'].includes(file)){res.writeHead(404).end();return}
 try{const data=await readFile(new URL(file,root));res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.json')?'application/json':file.endsWith('.png')?'image/png':'text/html');res.end(data)}catch{res.writeHead(404).end()}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
let browser;
try{
 browser=await chromium.launch({headless:true});
 for(const size of [{width:360,height:640,mobile:true},{width:390,height:844,mobile:true},{width:1280,height:800,mobile:false}]){
  const context=await browser.newContext({viewport:{width:size.width,height:size.height},isMobile:size.mobile,hasTouch:size.mobile});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.waitForFunction(()=>document.querySelector('#origin').dataset.cityBound==='1');
  const input=page.locator('#origin'),options=page.locator('#origin-options .city-option');
  await input.fill('taubatte');assert.equal(await options.first().textContent(),'Taubaté, SP');
  await input.press('ArrowUp');assert.equal(await input.getAttribute('aria-activedescendant'),await options.last().getAttribute('id'));
  await input.fill('sao paulo');assert.equal(await input.getAttribute('aria-activedescendant'),null);
  await input.press('ArrowDown');assert.equal(await options.first().getAttribute('aria-selected'),'true');
  await input.press('Enter');assert.equal(await input.inputValue(),'São Paulo, SP');assert.equal(await input.getAttribute('data-slug'),'sao-paulo');
  assert.equal(await input.getAttribute('aria-expanded'),'false');
  await input.fill('taubatte');assert.equal(await input.getAttribute('data-slug'),'');
  if(size.mobile)await options.first().tap();else await options.first().click();
  assert.equal(await input.inputValue(),'Taubaté, SP');assert.equal(await input.getAttribute('aria-expanded'),'false');
  await input.fill('bom jesus rs');assert.equal(await options.first().textContent(),'Bom Jesus, RS');
  await input.press('Escape');assert.equal(await input.getAttribute('aria-expanded'),'false');
  await input.fill('ribeirao preto');await input.press('Tab');assert.equal(await input.getAttribute('aria-expanded'),'false');
  await input.focus();await input.fill('sao');assert.ok(await options.count()<=40);
  const first=await options.first().boundingBox();assert.ok(first.height>=44);
  assert.equal(await options.first().getAttribute('tabindex'),'-1');
  for(const theme of ['dark','light']){
   await page.locator(`[data-theme-value="${theme}"]`).click();await input.focus();
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   const bounds=await page.locator('#origin-options').boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=size.width+1);
  }
  const session=await context.newCDPSession(page);await session.send('Emulation.setCPUThrottlingRate',{rate:4});
  const timing=await page.evaluate(()=>{const start=performance.now();for(let i=0;i<10;i++)rankCities(cities,'taubatte');return (performance.now()-start)/10});
  console.log(JSON.stringify({viewport:size,mean_fuzzy_ms_cpu4x:timing,errors}));assert.deepEqual(errors,[]);
  await context.close();
 }
 console.log('Autocomplete UI: keyboard, touch, slug, ARIA, themes, viewport and throttled search passed.');
}finally{await browser?.close();await new Promise(r=>server.close(r))}
