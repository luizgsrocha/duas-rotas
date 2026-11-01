# Changelog

O projeto segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e
versionamento semântico. Datas usam UTC.

## [Unreleased]

### Added

- Ensaio autenticado supervisionado com GitHub App de curta duração, Codex fixado,
  sandbox, allowlist de arquivo, CI completo e PR obrigatoriamente marcado para
  não mesclar.
- Relatório diário idempotente na issue #147 e workflow manual de rollback que
  aceita somente Worker isolado, restaura a versão original e rejeita produção.
- Ensaio protegido que provisiona duas versões no Worker descartável fixo,
  comprova rollback e restauração pelo conteúdo retornado em cada versão.
- Gate fail-closed para solicitar auto-merge somente em PRs candidatos da GitHub
  App esperada, mantendo o ruleset como autoridade de liberação.
- Metadados SEO, sitemap, robots, guias de rotas e histórico público v0.10.0.
- Contrato permanente de agentes, fila priorizada e runbooks de ativação.
- Quality gates para testes, browser, segurança e validação Cloudflare sem deploy.
- Arquitetura inerte de execução recorrente, merge controlado e monitoramento do
  deploy existente via Cloudflare Workers Builds, com runbook de rollback.

### Changed

- Recuperação de deploy registra o run protegido `41363404781`, que comprovou
  deploy v1/v2, rollback para v1 e restauração da v2 no Worker isolado, sem tocar
  a produção.
- Estado da autonomia registra os preflights reais do runner GitHub-hosted e da
  instalação exata do Codex 0.166.0, mantendo a ativação bloqueada sem credenciais.
- Regressão de transferências passa a executar os testes atuais de rotas, RN-HUB,
  cache e falhas upstream; os gates de browser cobrem todos os fluxos existentes.
- Lista de cidades restaurada nos campos vazios, com ranking e fuzzy preservados.

### Fixed

- Smoke do drill de rollback aguarda a propagação de cada versão antes de validar
  v2, rollback v1 e restauração v2, com timeout e tentativas limitadas.
- Monitor pós-deploy passa a aguardar o check do Cloudflare após cada `push` em
  `main` e confirma que a versão publicada corresponde ao commit verificado.
- CI deixa de referenciar `tests/transfer-search.test.cjs`, removido junto com o
  algoritmo legado, e valida que todos os alvos de teste dos workflows existem.
- Cache de trechos ganhou regressão funcional para expiração após dez minutos.
- Rotas em destaque agora preenchem a busca diretamente, sem página intermediária.
- Redesenho responsivo e compacto das rotas em destaque na página inicial.

## [0.0.0] - 2026-10-04

- Início do histórico retroativo. Versões funcionais anteriores permanecem no Git.
