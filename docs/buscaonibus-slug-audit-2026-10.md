# Auditoria nacional de slugs do BuscaÔnibus — outubro de 2026

## Escopo

- 5.571 localidades do `cities.json` verificadas.
- A capital da própria UF foi usada como origem; para a capital, foi usada uma origem alternativa.
- Cada destino foi consultado com o slug interno e, quando necessário, com a variante `-uf`.
- A auditoria confirma reconhecimento do município e da UF pelo BuscaÔnibus; não confirma existência de carona.

## Resultado

| Classificação | Quantidade |
| --- | ---: |
| Slug interno reconhecido | 1.248 |
| Mapeamento já existente e reconfirmado | 402 |
| Novos overrides confirmados automaticamente | 1.932 |
| Overrides confirmados após repetição manual | 2 |
| Sem correspondência confirmada | 1.987 |
| Total | 5.571 |

Foram adicionados 1.934 mapeamentos e o catálogo passou a conter 2.336 campos `buscaOnibusSlug` confirmados. Os 1.987 casos sem correspondência permanecem sem override, para evitar identificadores inventados.

## Cobertura por UF

| UF | Municípios | Overrides confirmados |
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
