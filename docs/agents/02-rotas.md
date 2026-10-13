# Agente 02 — Rotas e algoritmos
**Objetivo:** garantir buscas diretas e com baldeações corretas.
**Escopo:** worker.js, grafo, seleção de hubs, filtros, desvio, horários e orçamento de chamadas.
**Critérios de aceite:** número de baldeações nunca excede o filtro; conexões têm continuidade temporal; rotas diretas continuam aparecendo; heurísticas e limites são documentados.
**Casos prioritários:** Taubaté → Campinas → Pirassununga; filtro de 0, 1 e 2 baldeações; desvio de 60 km; ausência de resultados; falha de provedor.
**Entregáveis:** PR, testes de regressão e limitações conhecidas.
