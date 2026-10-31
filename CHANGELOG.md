# Changelog

O projeto segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e
versionamento semântico. Datas usam UTC.

## [Unreleased]

### Added

- Metadados SEO, sitemap, robots, guias de rotas e histórico público v0.10.0.
- Contrato permanente de agentes, fila priorizada e runbooks de ativação.
- Quality gates para testes, browser, segurança e validação Cloudflare sem deploy.
- Arquitetura inerte de execução recorrente, merge controlado e monitoramento do
  deploy existente via Cloudflare Workers Builds, com runbook de rollback.

### Changed

- Regressão de transferências passa a executar os testes atuais de rotas, RN-HUB,
  cache e falhas upstream; os gates de browser cobrem todos os fluxos existentes.
- Lista de cidades restaurada nos campos vazios, com ranking e fuzzy preservados.

### Fixed

- CI deixa de referenciar `tests/transfer-search.test.cjs`, removido junto com o
  algoritmo legado, e valida que todos os alvos de teste dos workflows existem.
- Cache de trechos ganhou regressão funcional para expiração após dez minutos.
- Rotas em destaque agora preenchem a busca diretamente, sem página intermediária.
- Redesenho responsivo e compacto das rotas em destaque na página inicial.

## [0.0.0] - 2026-10-04

- Início do histórico retroativo. Versões funcionais anteriores permanecem no Git.
