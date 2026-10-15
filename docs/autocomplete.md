# Autocomplete — v0.8.10

## Revisão do PR #124
Normalização de busca separada da normalização das rotas: acentos, caixa, espaços, hífens, apóstrofos e pontuação viram uma forma consistente. UF final explícita é filtro exato. Seleção mantém o objeto e slug existentes; nomes iguais em estados diferentes continuam separados. Há slugs iguais no catálogo original; esta alteração não redefine o contrato do provedor.

Ranking: nome exato, prefixo, início de palavra/frase, substring; fuzzy só quando não existe resultado lexical. Até uma edição em consultas de 4–5 caracteres e duas a partir de 6. Menos de quatro caracteres não usa fuzzy. Distância de prefixo usa programação dinâmica limitada, aceita inserções/exclusões e prioriza nomes curtos em empates. Limite de 40 opções mantido. Índice normalizado criado uma vez por catálogo (WeakMap); catálogo substituído invalida naturalmente o índice.

Interface: ArrowUp inicialmente seleciona a última opção; redraw limpa aria-activedescendant; navegação atualiza aria-selected; opções não entram na sequência Tab; seleção fecha a lista mesmo após recuperar foco. Eventos de composição não disparam seleção Enter. Inputs de 16px, sem correção ortográfica/capitalização; opções com alvo de 44px e rolagem por toque, altura limitada pelo viewport. Listboxes têm nomes acessíveis. RN-DIR, RN-CUR, RN-LON e RN-ROT não foram modificados.

## Benchmark local em Node 24.19.0
Catálogo: 5.571 cidades. Cinco rodadas de aquecimento e 30 medidas por consulta. Tempos locais, não garantia em qualquer celular.

| Busca completa | Mediana | p95 |
|---|---:|---:|
| PR original bbb7711 | 9,73 ms | 15,81 ms |
| Busca revisada | 1,80 ms | 6,32 ms |

Consultas: sao paulo, taubatte, ribeirao preto, ribeirao pretoo, bom jesus rs, sao paolo, zzzzzzzzzzzz. O original retornou Bom Jesus da Lapa, BA para bom jesus rs e São Paulo das Missões, RS para sao paolo; a revisão retorna Bom Jesus, RS e São Paulo, SP.

| Prefixo puro (mesmos conjuntos, equivalência conferida) | Mediana | p95 |
|---|---:|---:|
| Array normalizado | 0,0771 ms | 0,1129 ms |
| Trie | 0,0004 ms | 0,0008 ms |
| Radix | 0,0011 ms | 0,0018 ms |

Construção do cache: 7,67 ms. Trie: 17,20 ms, 31.297 nós e 64.716 referências. Compressão adicional para Radix: 19,49 ms, 7.555 nós e 33.412 referências. Contagens estruturais, não estimativas de bytes. Trie/Radix são protótipos apenas no benchmark e não são distribuídas ao cliente. O benchmark de prefixo não mede busca completa: essas estruturas não implementam substring, UF e fuzzy equivalentes. Economia absoluta do prefixo é inferior a 0,12 ms no p95 local; mantido array normalizado pelo custo/complexidade e desempenho completo já adequado.

## Validação e integração
47 testes Node passaram localmente (12 de autocomplete e 35 regressões existentes), com sintaxe válida em app.js/worker.js. Browser local indisponível: download Chromium falhou. Validação Chromium aprovada no GitHub Actions (run 38808616877, job 116675850310), nos três viewports, teclado/toque e CPU 4×; emulação não substitui teclado virtual e leitor de tela físicos.

A prévia Cloudflare inicialmente falhou por ausência do bloco `previews` no wrangler.toml. Adicionado `previews = { }`, conforme documentação atual, preservando assets e configurações de produção.

Versão e cache-busters: v0.8.10. Rollback: reverter o merge deste PR; a Cloudflare recompila main pelo trigger existente. Worker, APIs de caronas, credenciais e algoritmos de rota preservados.
