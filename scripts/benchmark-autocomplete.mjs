import {readFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import assert from 'node:assert/strict';
import {cities,loadAutocomplete} from '../tests/helpers/autocomplete.mjs';
const {citySearchRecords,cityNormalize,rankCities}=loadAutocomplete();
const t=performance.now(),records=citySearchRecords(cities),cacheBuild=performance.now()-t;
function trieBuild(){const root={children:new Map(),items:[]};for(const r of records){let node=root;for(const ch of r.base){if(!node.children.has(ch))node.children.set(ch,{children:new Map(),items:[]});node=node.children.get(ch);node.items.push(r)}}return root}
function compress(node){return {items:node.items,edges:[...node.children].map(([key,child])=>{while(child.children.size===1){const [ch,next]=[...child.children][0];if(child.items.length!==next.items.length)break;key+=ch;child=next}return {key,node:compress(child)}})}}
let begin=performance.now();const trie=trieBuild(),trieBuildMs=performance.now()-begin;
begin=performance.now();const radix=compress(trie),radixCompressMs=performance.now()-begin;
function trieFind(q){let n=trie;for(const c of q){n=n.children.get(c);if(!n)return []}return n.items}
function radixFind(q){let n=radix;while(q){const e=n.edges.find(e=>e.key[0]===q[0]);if(!e)return [];if(e.key.startsWith(q))return e.node.items;if(!q.startsWith(e.key))return [];q=q.slice(e.key.length);n=e.node}return n.items}
const queries=['s','sao','sao paulo','taub','ribeirao','bom jesus','santa','campo','rio'];
function measure(fn,qs=queries){for(let i=0;i<5;i++)for(const q of qs)fn(q);const times=[];for(let i=0;i<30;i++)for(const q of qs){const t=performance.now();fn(q);times.push(performance.now()-t)}times.sort((a,b)=>a-b);return {median_ms:+times[Math.floor(times.length*.5)].toFixed(4),p95_ms:+times[Math.floor(times.length*.95)].toFixed(4)}}
for(const q of queries){const expected=records.filter(r=>r.base.startsWith(q)).map(r=>r.c.name).sort();assert.deepEqual(trieFind(q).map(r=>r.c.name).sort(),expected);assert.deepEqual(radixFind(q).map(r=>r.c.name).sort(),expected)}
function stats(node,children){const result={nodes:1,refs:node.items.length};for(const child of children(node)){const sub=stats(child,children);result.nodes+=sub.nodes;result.refs+=sub.refs}return result}
const nodeStats=n=>stats(n,n=>n.children.values());
const radixStats=n=>stats(n,n=>n.edges.map(e=>e.node));
const fullQueries=['sao paulo','taubatte','ribeirao preto','ribeirao pretoo','bom jesus rs','sao paolo','zzzzzzzzzzzz'];
const result={node:process.version,cities:cities.length,rounds:30,cache_build_ms:+cacheBuild.toFixed(3),prefix_only:{linear:measure(q=>records.filter(r=>r.base.startsWith(q))),trie:measure(trieFind),radix:measure(radixFind)},build:{trie_ms:+trieBuildMs.toFixed(3),radix_from_trie_ms:+radixCompressMs.toFixed(3)},structures:{trie:nodeStats(trie),radix:radixStats(radix)},full_ranked_search:measure(q=>rankCities(cities,q),fullQueries),queries:fullQueries.map(q=>({query:q,top:rankCities(cities,q)[0]?.name??null,...measure(v=>rankCities(cities,v),[q])}))};
if(process.env.BASELINE_APP){
 const source=readFileSync(process.env.BASELINE_APP,'utf8');
 const code=source.slice(source.indexOf('function cityDistance('),source.indexOf('function bindCity('));
 const baseline=new Function(code+';function norm(v){return String(v).normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").trim().toLowerCase()};return rankCities')();
 result.baseline=measure(q=>baseline(cities,q),fullQueries);
}
console.log(JSON.stringify(result,null,2));
