# Checklist de ativação e credenciais

Nada nesta lista está ativo apenas por estar versionado. Um administrador deve
validar cada item e registrar evidência sem valores secretos.

## GitHub

- [ ] Criar ruleset para `main`: PR obrigatório, branch atualizada, conversas
      resolvidas, ao menos 1 aprovação e checks `quality-gates / unit-and-static`,
      `quality-gates / browser`, `quality-gates / security` e
      `Transfer regression / transfer-tests` obrigatórios.
- [ ] Bloquear force-push/deleção e impedir bypass pela identidade do agente.
- [ ] Habilitar auto-merge e excluir branches após merge.
- [ ] Criar GitHub App do agente com `Contents: write`, `Pull requests: write`,
      `Issues: write`, `Metadata: read`, sem Administration/Secrets/Environments.
- [ ] Usar `GITHUB_TOKEN` padrão (`contents: read`) nos testes. Criar App separada
      de merge com apenas `Contents: write` e `Pull requests: write` se necessário.
- [ ] Criar environment protegido `rollback-production` somente se o rollback
      automatizado for aprovado no futuro; sem self-review e restrito a `main`.
- [ ] Definir variables booleanas de ativação uma por vez; nunca usar secret como
      booleano de controle.
- [ ] Definir `AUTONOMY_CIRCUIT_BREAKER=closed` somente após o ensaio manual; mudar
      para `open` interrompe novos ciclos sem cancelar uma execução já iniciada.

## Executor de agente

- [ ] Runner efêmero rotulado `autonomous-dev`, sem acesso à rede interna, Docker
      socket, home persistente ou credenciais de produção.
- [ ] `OPENAI_API_KEY`/identidade equivalente limitada por projeto e orçamento;
      token GitHub App de curta duração; nenhum PAT pessoal.
- [ ] Limites de custo, timeout e alerta; logs com redaction; egress allowlist para
      GitHub, registro de pacotes e API do modelo.
- [ ] Confirmar comando e versão fixada do executor Codex em um teste manual antes
      de definir `AUTONOMY_ENABLED=true`.

## Cloudflare

- [ ] Manter Workers Builds como único deploy de `main`; confirmar que o comando de
      build executa a suíte antes de `npx wrangler deploy` e que falhas bloqueiam.
- [ ] Conceder à integração Cloudflare GitHub somente leitura do conteúdo e acesso
      ao status necessário; a identidade de build fica na Cloudflare, não no GitHub.
- [ ] Habilitar histórico de versões e registrar deployment/version ID por commit.
- [ ] Definir `PRODUCTION_BASE_URL` para smoke somente leitura e validar alertas.
- [ ] Confirmar que cada `push` em `main` inicia `Published site smoke`, aguarda o
      check `Workers Builds: rua-nossa` e valida a mesma versão publicada; manter
      também a execução diária como fallback.
- [ ] Ensaiar `wrangler versions list` e `wrangler rollback <version-id>` em Worker
      isolado antes de autorizar rollback de produção.
- [ ] Se rollback automático for aprovado no futuro: `CLOUDFLARE_ACCOUNT_ID` como
      variável e token separado, restrito à conta e a `Workers Scripts: Edit`,
      guardado apenas no environment `rollback-production` com aprovação humana.

## Notificações e relatório diário

- [ ] Preferir provedor transacional/service account. Para Gmail: OAuth client,
      refresh token da caixa dedicada e escopo mínimo `gmail.send`; nunca senha.
- [ ] Guardar destinatário como variável e credenciais no environment de relatório.
- [ ] O relatório lê metadados de Actions/GitHub/Cloudflare; permissões de leitura
      para Actions, PRs, deployments e billing/custos apenas quando disponíveis.

## Estado observado em 2026-10-31

- Auto-merge: desabilitado; rulesets retornaram lista vazia.
- Proteção de `main`: não verificável, pois a integração recebeu HTTP 403.
- O PR #158 foi mesclado apesar da falha em `Transfer regression / transfer-tests`;
  portanto esse check não estava protegido como obrigatório naquele momento.
- Cloudflare: `main` publica via Workers Builds e este desenho o preserva como único
  controlador; não há credenciais Cloudflare neste ambiente e nenhum deploy ocorreu.
