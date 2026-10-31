import {readFile} from 'node:fs/promises';

// Read-only deployed-site checks. No carona availability assertions.
const base=new URL(process.env.SITE_URL||'https://rua-nossa.lgsr96.workers.dev/');
async function check(path){
  const response=await fetch(new URL(path,base),{signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw new Error(path+' returned '+response.status);
  return response;
}
const localHtml=await readFile(new URL('../index.html',import.meta.url),'utf8');
const expectedAsset=localHtml.match(/app\.js\?v=[^"']+/)?.[0];
if(!expectedAsset)throw new Error('Local release marker missing');
const html=await (await check('/')).text();
if(!html.includes('Duas Rotas')||!html.includes('id="maxTransfers"'))throw new Error('Search page missing');
if(!html.includes(expectedAsset))throw new Error(`Published release does not match ${expectedAsset}`);
console.log('PASS deployed search page');
const cities=await (await check('/api/cities')).json();
if(!Array.isArray(cities)||!cities.some(c=>c.name==='Campinas, SP'))throw new Error('City list missing Campinas');
console.log('PASS deployed city list');
const response=await fetch(new URL('/api/exists?date=2026-10-14&origin=taubate&destination=taubate',base),
  {signal:AbortSignal.timeout(20000)});
if(response.status!==400)throw new Error('API validation failed');
console.log('PASS deployed API validation');
