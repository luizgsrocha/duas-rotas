# Diagnóstico de falhas da fonte — 29/10/2026

Consultas somente leitura, data de viagem 05/11/2026. Nenhuma auditoria nacional foi executada.

| Rota | Worker público, modo direto e debug | Consulta direta deste ambiente |
| --- | --- | --- |
| Formosa GO → Brasília DF | HTTP 502; upstream 403; provider_blocked | HTTP 200; título corresponde à rota |
| Taubaté SP → Campinas SP | HTTP 502; upstream 403; provider_blocked | HTTP 200; título corresponde à rota |

Worker: https://rua-nossa.lgsr96.workers.dev/api/exists (origin, destination, date=2026-11-05, mode=direct, debug=1).
Provedor: https://www.buscaonibus.com.br/horario/formosa-go/brasilia?dt=05%2F11%2F2026 e https://www.buscaonibus.com.br/horario/taubate/campinas?dt=05%2F11%2F2026.
Formosa também retornou 200 com os mesmos Accept, Accept-Language e User-Agent usados pelo Worker. Não foram inspecionados logs internos do provedor. Isso sugere diferença de contexto de rede/execução; não determina a regra responsável pelo bloqueio. HTTP 200 e título correto não confirmam caronas disponíveis.

## Correção

- Falha 403 informa que a fonte recusou a consulta e a disponibilidade não foi verificada.
- Estado incompleto da busca direta é preservado durante a procura de conexões e na mensagem final.
- Cartão vazio de busca incompleta descreve falha de consulta, sem afirmar ausência de viagens.
- Removida segunda chamada idêntica a cada par de conexão. Erros e consultas passam a ser contabilizados uma vez.
- Versão/cache-busters: v0.9.8.

## Validação

96 testes determinísticos aprovados, incluindo 403, pares únicos e três estados de interface (falha, incompleta, vazia válida). Autocomplete aprovado em 360×640, 390×844 e 1280×800. Benchmark com respostas simuladas: uma rota, 24 consultas, limite 55 (antes: 48). Sintaxe e git diff --check aprovados.

## Limites e próximos passos

A correção não remove o bloqueio do provedor. Solicitar análise/acesso autorizado ao provedor, fornecendo rota, horário e status. Não há evidência de que alterar slugs resolva este 403. Não foram feitas tentativas de contornar o bloqueio. Produção não foi alterada nesta investigação; o push pode acionar preview automático.

Rollback: reverter o commit deste PR. Critérios de aceite: testes/CI aprovados; falha nunca vira ausência confirmada; caronas diretas preservadas; nenhuma consulta duplicada por par. A confirmação de acesso real pelo Worker permanece pendente.
