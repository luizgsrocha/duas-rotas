# Testes do Rua Nossa

## Regressões com dados controlados
Requer Node.js 24. Não precisa instalar dependências:
```sh
node --test tests/*.test.mjs
```
Os testes executam o Worker real com respostas de fonte controladas. Não acessam serviços externos. Conferem limites de baldeações, espera, meia-noite, Campinas, diversidade das cidades intermediárias, indisponibilidade, parser de HTML e cancelamento de consultas. Cada falha identifica o cenário e a comparação esperada.

O workflow Tests roda em pushes e pull requests. O build do Cloudflare também executa esta mesma suíte antes da publicação: se um teste falhar, o deploy não prossegue.

## Verificação do site publicado
```sh
node scripts/smoke.mjs
```
O workflow Published site smoke roda diariamente e pode ser acionado manualmente. Confere página de busca, lista de municípios e validação da API. É somente leitura e não depende de haver caronas disponíveis. Não é um teste de interação visual do navegador.

## Limitações
Testes controlados comprovam regras nos cenários cobertos; não provam ausência de todos os erros ou disponibilidade de terceiros. A verificação publicada não substitui uma revisão visual em celular/tablet. Ao corrigir um erro, acrescente um cenário que falhe com o código antigo e passe com a correção.

A .assetsignore impede que testes, workflows e código interno sejam servidos como arquivos públicos.


## Autocomplete
- `node --test tests/*.test.mjs tests/*.test.cjs`: regras de busca, homônimos, UF, normalização e regressões de rotas.
- `node scripts/benchmark-autocomplete.mjs`: catálogo completo; aquecimento + 30 rodadas; prefixo puro comparado separadamente da busca completa. Opcional: `BASELINE_APP=/tmp/app-pr124-original.js` compara o algoritmo original do PR. Obtenha esse arquivo com `git show bbb771160a84f3ef87dce9431d9c248269d8dfd7:app.js`.
- O workflow `Autocomplete browser checks` instala Playwright 1.56.1 e Chromium e executa `node scripts/test-autocomplete-ui.mjs`: 360×640, 390×844 e desktop, toque, teclado, ARIA, slug, temas, overflow e busca com CPU 4× mais lenta.
- Emulação não comprova teclado virtual físico, TalkBack ou VoiceOver; esses pontos exigem aparelho real.
