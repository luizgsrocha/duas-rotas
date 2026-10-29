# Auditoria nacional de slugs do BuscaÔnibus — outubro de 2026

> Registro histórico do PR #143 no commit `06fc4ceb9a`. As contagens do catálogo são verificáveis; os resultados individuais de consultas e as duas confirmações manuais não foram preservados no repositório. A validação original comparava somente a UF e não comprova identidade municipal. Os totais abaixo são resultados declarados da execução anterior, pendentes de revalidação com o validador v2.

## Escopo declarado da execução original

- A execução original declara ter consultado 5.571 localidades do `cities.json`.
- A capital da própria UF foi usada como origem; para a capital, foi usada uma origem alternativa.
- Cada destino foi consultado com o slug interno e, quando necessário, com a variante `-uf`.
- A validação original verificava HTTP bem-sucedido e UF; não comparava a identidade do município nem confirmava existência de carona.

## Resultado declarado, não revalidado

| Classificação | Quantidade |
| --- | ---: |
| Slug interno reconhecido | 1.248 |
| Mapeamento já existente e reconfirmado | 402 |
| Novos overrides confirmados automaticamente | 1.932 |
| Overrides confirmados após repetição manual | 2 |
| Sem correspondência confirmada | 1.987 |
| Total | 5.571 |

Foram adicionados 1.934 mapeamentos e o catálogo passou a conter 2.336 campos `buscaOnibusSlug`. Os 1.987 casos sem correspondência permanecem sem override, para evitar identificadores inventados.

## Cobertura por UF

| UF | Municípios | Overrides no catálogo |
| --- | ---: | ---: |
| AC | 22 | 2 |
| AL | 102 | 6 |
| AP | 16 | 0 |
| AM | 62 | 3 |
| BA | 417 | 42 |
| CE | 184 | 25 |
| DF | 1 | 0 |
| ES | 78 | 5 |
| GO | 246 | 183 |
| MA | 217 | 14 |
| MG | 853 | 664 |
| MS | 79 | 49 |
| MT | 142 | 5 |
| PA | 144 | 20 |
| PB | 223 | 13 |
| PE | 185 | 14 |
| PI | 224 | 7 |
| PR | 399 | 289 |
| RJ | 92 | 30 |
| RN | 167 | 5 |
| RO | 52 | 5 |
| RR | 15 | 0 |
| RS | 497 | 391 |
| SC | 295 | 181 |
| SE | 75 | 2 |
| SP | 645 | 372 |
| TO | 139 | 9 |

## Limitações

- HTTP 404 ou ausência de correspondência não provam que o município nunca será suportado pelo provedor.
- Disponibilidade de carona não foi usada para inferir validade do slug.
- O bloqueio HTTP 403 observado no Cloudflare Worker é um problema separado e não é resolvido por esta base.

## Revalidação v2 e evidências

O script agora exige UF e identidade municipal: nome de destino normalizado correspondente ao nome do catálogo, ou `destinationId` correspondente a uma referência independente fornecida em JSON (`UF|slug` → ID do provedor). A referência não deve ser gerada do slug sendo testado. Sem nome ou referência independente, o resultado é `identity_unverified`, nunca confirmado. Alterações de grafia não equivalentes exigem revisão humana; ausência desses metadados pode exigir adaptar o extrator com amostras reais antes da execução nacional.

```bash
TRAVEL_DATE=2026-11-05 DELAY_MS=1200 CONCURRENCY=8 node scripts/audit-national-slugs.mjs
# Opcional: IDENTITIES_PATH=reports/provider-identities.json
```

Também existe `.github/workflows/audit-national-slugs.yml`, somente manual e com permissão `contents: read`. Ele não altera o catálogo nem publica o site. Preserva JSON, CSV e checkpoint por 90 dias; sucesso do job significa que a coleta terminou, não que todas as localidades foram reconhecidas. Verifique `summary`, `byReason` e os registros individuais.

Cada resposta preserva URL solicitada/final, horário, status HTTP, tentativa, metadados de identidade e hash SHA-256 do corpo. O HTML de cada resposta é preservado comprimido em `evidence/<hash>.html.gz`. O relatório inclui hash do catálogo, contexto e versão do validador. O caminho da evidência é registrado junto à resposta e deve acompanhar o relatório e o checkpoint ao retomar uma execução. Os resultados v2 não podem ser apresentados como evidência retroativa da auditoria original. As duas confirmações manuais precisam de registro próprio (localidade, URL, horário, identidade e responsável).

403, 429/5xx, falhas de rede, metadados ausentes e identidade não verificável são erros de coleta/validação. 404, UF divergente e identidade divergente ficam separados nos motivos. `unresolved` continua sem significar ausência de suporte ou de carona.

Para retomar uma execução interrompida, restaure o `checkpoint.jsonl` do artefato em `audit-results/national/` e rode com o mesmo catálogo, data e referências. Somente sucessos do mesmo contexto são reutilizados. Erros e pendências são tentados novamente; checkpoints antigos ou de outro contexto são revalidados. Uma linha final incompleta é descartada; corrupção anterior provoca falha explícita.

## Critérios de aceite e rollback

- Resolver o P2 de retomada com regressões aprovadas.
- Executar o teste de navegador em `ubuntu-24.04`, compatível com a versão fixada de Playwright; confirmar o resultado no GitHub após atualização autorizada.
- Manter suíte e benchmark aprovados no commit final.
- Preservar e revisar as novas evidências individuais antes de chamar os mapeamentos de confirmados.
- Rever separadamente os 1.987 casos históricos; não classificá-los todos como municípios sem suporte.
- Confirmar proteções da main e o efeito do merge na publicação. O PR original teve preview automático; atualizar sua branch pode disparar outro preview. Não publicar alterações sem autorização compatível com essa consequência.
- O bloqueio 403 do Worker segue pendente; benchmark com respostas simuladas não comprova funcionamento real do provedor.

Esta correção não modifica `cities.json`, Worker, interface ou versão pública. Para rollback das ferramentas, reverta o commit de correção. Nenhuma alteração de produção é necessária.
