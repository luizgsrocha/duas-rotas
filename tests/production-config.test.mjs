import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const config=readFileSync(new URL('../wrangler.toml',import.meta.url),'utf8');
const worker=readFileSync(new URL('../worker.js',import.meta.url),'utf8');

test('RN-HUB is enabled in production and previews',()=>{
  assert.match(config,/\[vars\]\s+RN_HUB_ENABLED\s*=\s*"1"/);
  assert.match(config,/\[previews\.vars\]\s+RN_HUB_ENABLED\s*=\s*"1"/);
});

test('successful segment and edge cache stay available for ten minutes',()=>{
  assert.match(worker,/SEGMENT_CACHE_TTL=600/);
  assert.match(worker,/expirationTtl:SEGMENT_CACHE_TTL/);
});
