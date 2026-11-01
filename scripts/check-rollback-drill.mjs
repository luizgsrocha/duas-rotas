const [url, expectedVersion] = process.argv.slice(2);

if (!url || !/^https:\/\/[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev\/$/.test(url)) {
  throw new Error('invalid isolated Worker URL');
}
if (!['v1', 'v2'].includes(expectedVersion)) {
  throw new Error('expected version must be v1 or v2');
}

let lastVersion = 'unavailable';
for (let attempt = 1; attempt <= 30; attempt++) {
  try {
    const response = await fetch(url, {
      headers: {'cache-control': 'no-cache'},
      signal: AbortSignal.timeout(5_000),
    });
    if (response.ok) {
      const body = await response.json();
      lastVersion = body.version ?? 'missing';
      if (body.service === 'duas-rotas-rollback-drill' && lastVersion === expectedVersion) {
        console.log(`Isolated Worker reached ${expectedVersion} on attempt ${attempt}.`);
        process.exit(0);
      }
    } else {
      lastVersion = `HTTP ${response.status}`;
    }
  } catch (error) {
    lastVersion = error.name;
  }
  await new Promise(resolve => setTimeout(resolve, 2_000));
}

throw new Error(`isolated Worker did not reach ${expectedVersion}; last state: ${lastVersion}`);

