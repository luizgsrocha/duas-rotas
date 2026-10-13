import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../worker.js', import.meta.url), 'utf8');
const start = source.indexOf('async function findRoutes(');
const end = source.indexOf('\nfunction selectBrgHubs(', start);
assert.ok(start >= 0 && end > start, 'findRoutes must be present');
const findRoutesSource = source.slice(start, end);

test('orçamento de consultas limitado sinaliza pesquisa incompleta', async () => {
  let calls = 0;
  const cities = [
    { slug: 'origem', name: 'Origem', lat: 0, lng: 0 },
    { slug: 'destino', name: 'Destino', lat: 0, lng: 1 },
    ...Array.from({ length: 10 }, (_, i) => ({
      slug: 'hub-' + i, name: 'Hub ' + i, lat: 0, lng: (i + 1) / 12
    }))
  ];
  const makeFindRoutes = new Function(
    'getDirectRides', 'fromBuscaSlug', 'selectBrgHubs', 'distance', 'HUB_SLUGS',
    'BRG_MAX_QUERIES', 'BRG_MAX_RESULTS', 'BRG_BEAM_WIDTH', 'minutes', 'makeRoute',
    'return ( ' + findRoutesSource + '\n )'
  );
  const findRoutes = makeFindRoutes(
    async () => { calls++; return []; },
    (_, slug) => slug,
    (geo) => geo.slice(2),
    (a, b) => Math.abs(a.lng - b.lng) * 100,
    new Set(), 55, 80, 12,
    () => 0, (legs) => ({ legs })
  );
  const result = await findRoutes('origem', 'destino', '2026-10-14', 'Origem', 'Destino', 5, 60, 2, cities, false);
  assert.equal(result.incomplete, true);
  assert.deepEqual(result.routes, []);
  assert.ok(calls <= 55, 'não ultrapassar o limite global');
});
