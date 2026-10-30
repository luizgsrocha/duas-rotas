import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
  .split('\0').filter(Boolean);
const secretPatterns = [
  ['private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['GitHub token', /\bgh[opsu]_[A-Za-z0-9_]{20,}\b/],
  ['Cloudflare API token assignment', /CLOUDFLARE_API_TOKEN\s*=\s*[^$\s{][^\s]*/],
  ['OpenAI API key', /\bsk-[A-Za-z0-9_-]{20,}\b/],
];

const findings = [];
for (const file of tracked) {
  let value;
  try { value = readFileSync(file, 'utf8'); } catch { continue; }
  for (const [name, pattern] of secretPatterns) {
    if (pattern.test(value)) findings.push(`${file}: possível ${name}`);
  }
}
if (findings.length) throw new Error(`Possíveis segredos rastreados:\n${findings.join('\n')}`);

for (const file of ['app.js', 'worker.js', 'functions/api/rides.js']) {
  const value = readFileSync(file, 'utf8');
  if (/\beval\s*\(|\bnew Function\s*\(/.test(value)) {
    throw new Error(`${file}: execução dinâmica não permitida`);
  }
}
console.log(`Security check: ${tracked.length} arquivos rastreados, nenhum padrão bloqueante.`);
