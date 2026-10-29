# PR #143 — correções preparadas em 29/10/2026

Base: `06fc4ceb9ad40b08b10c992b157cf3e91c23331f`.
Branch local: `fix/pr143-audit-review`.

## Alterações

- Revalidação automática de erros e pendências ao retomar o checkpoint (P2).
- Invalidação de resultados de outra versão do validador, data, catálogo ou referências de identidade.
- Validação municipal por nome + UF ou ID independente + UF; UF isolada não aprova.
- Motivos separados para bloqueio, falha transitória, rede, 404, metadados ausentes e divergência de identidade.
- Preservação de HTML comprimido, hashes, URLs, horários e metadados individuais.
- Workflow nacional manual, somente leitura, preservando artefatos por 90 dias.
- Runner do autocomplete fixado em Ubuntu 24.04, mantendo Playwright 1.56.1.
- Nove testes de regressão para a auditoria e checagem de sintaxe no CI.
- Relatório histórico corrigido para distinguir contagem do catálogo de confirmação no provedor.

## Verificação local realizada

- `node --check scripts/audit-national-slugs.mjs`: aprovado.
- `node --test tests/*.test.mjs tests/*.test.cjs`: 90 aprovados, 0 falhas, 0 ignorados.
- `node scripts/benchmark-rn-hub.mjs`: aprovado; 1 rota, 48 consultas, limite 55; recall RN-HUB 5/5, legado 2/5. Respostas do provedor simuladas.
- `node scripts/test-autocomplete-ui.mjs`: aprovado com Chromium/Playwright 1.56.1; telas 360×640, 390×844 e 1280×800; sem erros JavaScript observados. Esse resultado local não substitui o check remoto após publicação.
- `git diff --check`: aprovado.

## Limites e pendências

Não foi executada nova coleta nacional. Os 2.336 overrides e as 1.987 pendências históricas não foram revalidados individualmente. Não há evidência retroativa das duas confirmações manuais. O extrator v2 precisa ser conferido em amostras reais do HTML antes de uma coleta nacional; a ausência dos campos necessários resulta em erro de identidade não verificável, sem aprovação automática.

Não houve push, comentário, resolução de thread, merge ou deploy. O GitHub continua com o commit antigo. Atualizar a branch do PR pode acionar preview automático do Cloudflare, observado na revisão anterior; essa consequência exige autorização compatível com a restrição de não fazer deploy. Proteções da main e publicação após merge seguem sem confirmação administrativa. O bloqueio HTTP 403 do Worker segue fora do escopo desta correção.

## Próxima ação após autorização

Aplicar o patch sobre a branch `fix/national-buscaonibus-slugs`, publicar o commit e aguardar CI/revisão. Não mesclar. Em etapa separada, conferir o extrator em amostras reais e coletar/preservar a auditoria nacional. Só então reconsiderar a confirmação dos mapeamentos e os critérios de merge.
