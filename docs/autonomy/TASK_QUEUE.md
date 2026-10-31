# Fila priorizada de trabalho autônomo

Atualizada em 2026-10-31. O coordenador escolhe a primeira linha `ready` por
prioridade; `blocked` não pode ser contornada. Alterações nesta tabela passam por
PR. IDs apontam para a evidência existente, não significam que o trabalho esteja
concluído.

| Ordem | Prioridade | Estado | Trabalho | Dependência / aceite mínimo |
|---:|---|---|---|---|
| 1 | P0 | in_progress | Fundação autônoma (#147) | Branch `agent/147-post-deploy-smoke`; validar monitor pós-deploy antes da ativação humana conforme `ACTIVATION.md` |
| 2 | P1 | blocked | SEO, sitemap e histórico (#146) | Resolver/rebasear PR #146; testes, links canônicos e sitemap validados |
| 3 | P1 | ready | Monitorar regressão de falhas upstream 403 (#145) | Main já contém #145; ampliar somente com nova evidência reproduzível |
| 4 | P1 | blocked | Auditoria nacional de slugs (#143) | Execução manual com data explícita; revisar artefato antes de alterar slugs |
| 5 | P2 | ready | Acessibilidade do fluxo de busca | Testes de teclado, foco, nomes acessíveis e viewport móvel |
| 6 | P2 | ready | Performance e orçamento de busca | Baseline repetível; sem degradar p95, memória ou limite de consultas |

## Estados

- `ready`: critérios e dependências suficientes para um ciclo.
- `in_progress`: deve incluir branch/PR e início UTC; apenas uma linha por vez.
- `blocked`: exige decisão, credencial, evidência externa ou conclusão indicada.
- `done`: PR mesclado, checks e, quando aplicável, deploy verificado.

Ao iniciar, substitua o estado por `in_progress` e acrescente o PR. Ao terminar,
registre o resultado em `CHANGELOG.md`; falha repetida volta a `blocked` com causa.
