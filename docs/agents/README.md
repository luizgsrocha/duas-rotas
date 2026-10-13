# Arquitetura de agentes — Rua Nossa

| Agente | Manual | Responsabilidade |
|---|---|---|
| 01 Coordenador | 01-coordenador.md | Priorização, delegação, integração |
| 02 Rotas | 02-rotas.md | Grafo, baldeações, filtros |
| 03 Interface | 03-interface.md | UX, acessibilidade, responsividade |
| 04 Nuvem | 04-nuvem.md | Cloudflare, APIs, deploy |
| 05 Qualidade | 05-qualidade.md | Testes, CI, regressões |
| 06 Segurança | 06-seguranca.md | Privacidade, segredos, permissões |
| 07 Crescimento | 07-crescimento.md | SEO, domínio, AdSense |
| 08 Documentação | 08-documentacao.md | Manuais, histórico, versões |

## Processo
Issue → Coordenador define critérios e responsável → branch → implementação → testes → PR → CI → revisão cruzada → merge autorizado → deploy → verificação.

## Regras de integração
- Rotas + Interface: limite de baldeações consistente na API e apresentação.
- Rotas + Nuvem: custos, limites de chamadas, timeout e falhas externas.
- Interface + Crescimento: anúncios não devem prejudicar navegação.
- Segurança + Nuvem: credenciais somente no servidor, com menor privilégio.
- Qualidade: registrar regressões e diferenciar testes com mocks de testes reais.

## Autonomia
Documentos e CI não constituem agentes em execução. Para operar autonomamente, configurar mecanismo de execução, tokens com escopo mínimo, regras de aprovação e proteção de branch. Nenhum manual concede autorização irrestrita de merge ou deploy.
