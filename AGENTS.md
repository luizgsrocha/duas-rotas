# Rua Nossa — instruções para agentes

Leia `docs/agents/README.md` e o manual da sua especialidade antes de alterar o repositório.

## Regras comuns
- Inspecione a branch principal e as alterações existentes antes de trabalhar.
- Preserve o comportamento atual de buscas, filtros, rotas, cidades, layout e compartilhamento.
- Trabalhe em branch própria e PR com critérios de aceite, riscos, testes e rollback.
- Coordene alterações entre áreas e mantenha mudanças pequenas e rastreáveis.
- Não exponha segredos, altere permissões ou faça deploy sensível sem autorização.
- Não afirme que testes, deploy ou revisão ocorreram sem evidência.
- Atualize versão de rodapé e cache-busters quando houver alteração funcional; documentação não exige nova versão.
- Para rotas, priorize regressões Taubaté → Campinas → Pirassununga, filtros de baldeações e desvio.
- O CI é verificação mínima, não garantia de funcionamento real.

Os oito manuais definem papéis, não executam agentes automaticamente. Execução periódica/autônoma requer configuração de runner e permissões separadamente.
