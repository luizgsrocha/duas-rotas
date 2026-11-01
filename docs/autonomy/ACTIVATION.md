# Checklist de ativação e credenciais

Nada nesta lista está ativo apenas por estar versionado. Um administrador deve
validar cada item e registrar evidência sem valores secretos.

## GitHub

- [x] Criar ruleset para `main`: PR obrigatório, branch atualizada, conversas
      resolvidas, zero aprovações para o operador individual e checks `quality-gates / unit-and-static`,
      `quality-gates / browser`, `quality-gates / security` e
      `Transfer regression / transfer-tests` obrigatórios.
- [x] Bloquear force-push/deleção e impedir bypass pela identidade do agente.
- [x] Habilitar auto-merge nativo no repositório.
- [ ] Excluir branches automaticamente após merge, se desejado pelo operador.
- [ ] Criar GitHub App do agente com `Contents: write`, `Pull requests: write`,
      `Issues: write`, `Metadata: read`, sem Administration/Secrets/Environments.
- [ ] Usar `GITHUB_TOKEN` padrão (`contents: read`) nos testes. Criar App separada
      de merge com apenas `Contents: write` e `Pull requests: write` se necessário.
- [ ] Criar environment protegido `rollback-production` somente se o rollback
      automatizado for aprovado no futuro; sem self-review e restrito a `main`.
- [ ] Definir variables booleanas de ativação uma por vez; nunca usar secret como
      booleano de controle.
- [ ] Definir `AUTONOMY_APP_LOGIN` com o login exato da GitHub App e somente então
      `AUTO_MERGE_ENABLED=true`; o gate exige circuit breaker `closed`, autor,
      rótulo `autonomy:candidate`, ausência de `do-not-merge`, rejeita caminhos
      sensíveis diretamente e deixa os checks obrigatórios decidirem o merge.
- [ ] Definir `AUTONOMY_CIRCUIT_BREAKER=closed` somente após o ensaio manual; mudar
      para `open` interrompe novos ciclos sem cancelar uma execução já iniciada.

## Executor de agente

- [x] Validar runner GitHub-hosted efêmero sem credenciais nem mutações; runs
      `41304582338` e `41304600282` concluídos com sucesso.
- [ ] Aceitar formalmente o egress público do GitHub-hosted ou provisionar runner
      com allowlist; nenhum token de escrita deve ser entregue antes dessa decisão.
- [ ] `OPENAI_API_KEY`/identidade equivalente limitada por projeto e orçamento;
      token GitHub App de curta duração; nenhum PAT pessoal.
- [ ] Limites de custo, timeout e alerta; logs com redaction; egress allowlist para
      GitHub, registro de pacotes e API do modelo.
- [x] Instalar uma versão exata do Codex sem autenticação: `@openai/codex@0.166.0`
      validado no run `41305030433`, sem chamada ao modelo ou escrita.
- [ ] Executar ciclo autenticado supervisionado com tarefa fictícia, limites de
      custo e identidade App antes de definir `AUTONOMY_ENABLED=true`.

## Cloudflare

- [ ] Manter Workers Builds como único deploy de `main`; confirmar que o comando de
      build executa a suíte antes de `npx wrangler deploy` e que falhas bloqueiam.
- [ ] Conceder à integração Cloudflare GitHub somente leitura do conteúdo e acesso
      ao status necessário; a identidade de build fica na Cloudflare, não no GitHub.
- [ ] Habilitar histórico de versões e registrar deployment/version ID por commit.
- [ ] Definir `PRODUCTION_BASE_URL` para smoke somente leitura e validar alertas.
- [x] Confirmar que cada `push` em `main` inicia `Published site smoke`, aguarda o
      check `Workers Builds: rua-nossa` e valida a mesma versão publicada; manter
      também a execução diária como fallback.
- [ ] Ensaiar `wrangler versions list` e `wrangler rollback <version-id>` em Worker
      isolado antes de autorizar rollback de produção. O workflow manual
      `rollback-drill-setup.yml` provisiona duas versões somente no Worker fixo
      `duas-rotas-rollback-drill`, testa rollback e restaura a versão atual.
- [ ] Se rollback automático for aprovado no futuro: `CLOUDFLARE_ACCOUNT_ID` como
      variável e token separado, restrito à conta e a `Workers Scripts: Edit`,
      guardado apenas no environment `rollback-production` com aprovação humana.

## Notificações e relatório diário

- [x] Relatório diário sem segredo implementado em `autonomy-report.yml`: atualiza
      um único comentário na issue #147 com metadados de Actions e PRs das últimas
      24 horas; não lê logs nem conteúdo de secrets. Ativar somente depois da
      revisão com `AUTONOMY_REPORT_ENABLED=true`.
- [ ] Se e-mail externo for necessário no futuro, preferir provedor transacional.
      Para Gmail: OAuth client, refresh token da caixa dedicada e escopo mínimo
      `gmail.send`; nunca senha. Guardar destinatário e credenciais no environment.

## Estado observado em 2026-11-01

- Auto-merge: habilitado. O ruleset `main-blocked-ruleset` está ativo na `main`
  com PR obrigatório, branch atualizada, conversas resolvidas, sem bypass e sete
  checks obrigatórios.
- O PR #158 foi mesclado apesar da falha em `Transfer regression / transfer-tests`;
  portanto esse check não estava protegido como obrigatório naquele momento.
- Cloudflare: `main` publica via Workers Builds e este desenho o preserva como único
  controlador; o run `41206952186` comprovou espera pelo build, correspondência da
  versão e smoke pós-deploy. Não há credenciais Cloudflare neste ambiente.
- Executor: runner GitHub-hosted e instalação do Codex 0.166.0 foram comprovados
  sem secrets. O ciclo real continua fail-closed até App, credencial do modelo,
  orçamento e ensaio autenticado.


## Plano de implantação do executor — issue #147 (pendente)

Este plano é preparatório: **não** ative variáveis, crie credenciais em PR,
ou considere a automação operacional sem um ensaio registrado.

### 1. Identidade e autorização

1. Operador cria e instala GitHub App exclusivamente neste repositório, com
   `Metadata: read`, `Contents: write`, `Pull requests: write` e
   `Issues: write`. Não conceder `Administration`, `Secrets` ou
   `Environments`.
2. Guardar chave privada da App somente no cofre do executor; gerar tokens
   de instalação de curta duração por ciclo. Não usar PAT pessoal.
3. Registrar `AUTONOMY_APP_LOGIN` exatamente como aparece no autor dos PRs
   da App. Verificar que o gate rejeita PR de outra identidade.

### 2. Runner e executor

1. Provisionar runner **efêmero**, rotulado `autonomous-dev`, sem Docker socket,
   rede interna, credenciais de produção ou home persistente. Revogar o runner
   ao terminar cada ciclo.
2. Fixar versão e checksum do executor Codex. Configurar identidade do modelo
   por secret de escopo mínimo e orçamento; nunca imprimir variáveis de ambiente.
3. Verificar `AUTONOMY_RUNNER_COMMAND` no runner e executar um ensaio manual
   com tarefa fictícia sem escrita no GitHub. O workflow atual apenas invoca
   esse executável: ele **não instala** Codex, não injeta credenciais e não
   implementa a seleção da fila por si só.
4. Confirmar no executor: leitura de `AGENTS.md`, seleção da primeira tarefa
   `ready`, trava de concorrência, branch `agent/<issue>-<resumo>`, no máximo
   um PR por ciclo, limite de 45 minutos e pausas por falha/custo.

### 3. Ensaio com escrita controlada

1. Usar tarefa de teste sem caminhos sensíveis e sem deploy.
2. Confirmar que a App abre um PR com rótulo `autonomy:candidate`, que os
   sete checks e a revisão obrigatória bloqueiam merge antes da aprovação.
3. Ensaiar PR de autor incorreto, ausência do rótulo, `do-not-merge`,
   `AUTONOMY_CIRCUIT_BREAKER=open` e alteração em `.github/**`; todos devem
   ser rejeitados pelo gate. Não desabilitar proteções para simular sucesso.
4. Registrar links dos runs e PRs, hashes e resultados na issue #147.

### 4. Ativação gradual e recuperação

1. Manter `AUTONOMY_ENABLED=false` e `AUTO_MERGE_ENABLED=false` até o
   ensaio completo. Habilitar primeiro ciclos manuais supervisionados.
2. Após aprovação humana, fechar circuit breaker e habilitar uma variável
   por vez. Confirmar que `open` impede novos ciclos.
3. Manter Workers Builds como único deploy e rollback de produção humano.
   Ensaiar rollback em Worker isolado e registrar version IDs antes de
   propor qualquer rollback automático.
4. Configurar relatório diário com identidade própria e `gmail.send` ou
   serviço transacional; conferir envio real antes de marcar a etapa concluída.

**Critério de conclusão:** logs verificáveis de runner efêmero, identidade App,
execução do modelo, PR de ensaio, checks, bloqueios negativos, orçamento,
smoke e rollback isolado. Sem esses registros, a issue permanece aberta.


## Runner hospedado no GitHub — proposta para a issue #147

O workflow `.github/workflows/autonomous-cycle.yml` agora seleciona
`ubuntu-latest` (runner hospedado e descartável gerenciado pelo GitHub), sem
necessidade de cadastrar um runner self-hosted. Isso **não equivale** a uma
máquina isolada com rede de saída restrita ou a um executor Codex instalado.

**Ensaio inicial:** executar manualmente `autonomous-cycle` com
`dry_run=true` após a revisão e merge deste PR. O job
`hosted-runner-preflight` só verifica o tipo de runner e a presença de
`AGENTS.md`, `TASK_QUEUE.md` e `ACTIVATION.md`. Não chama IA, não recebe
credenciais e não cria commits ou PRs. Registrar URL e conclusão do run na
issue #147. O ciclo real permanece inerte sem `AUTONOMY_ENABLED=true`.

**Bloqueio intencional:** a etapa `cycle` ainda exige um
`AUTONOMY_RUNNER_COMMAND` executável. Como o runner hospedado é limpo a cada
execução, não há comando pré-instalado; habilitar a variável sem adicionar
instalação verificada do executor fará o ciclo falhar fechado. Antes de
ativá-lo, criar PR separado que instale versão imutável e verificada do Codex,
configure credenciais da App e do modelo em secrets protegidos, execute
tarefa de ensaio e demonstre limites de custo, timeout e rede. Não usar
`pull_request_target` para executar código não confiável com secrets.

**Limites:** `ubuntu-latest` não garante egress allowlist, isolamento de
rede configurável nem ausência absoluta de acesso a serviços públicos.
Validar essas propriedades ou escolher infraestrutura mais restrita antes
de fornecer tokens com permissão de escrita. O workflow de preflight
não deve ser usado como prova de desenvolvimento autônomo.


## Ensaio de instalação do Codex (sem autenticação)

Após revisão e merge do PR correspondente, execute manualmente
`autonomous-cycle` na `main` com `dry_run=true`,
`codex_install_test=true` e `codex_version` definida como versão
**exata** do pacote npm `@openai/codex` verificada pelo operador.
Não use `latest`. O job `codex-install-preflight` usa runner hospedado,
Node 22, instala a versão escolhida com scripts npm desabilitados e executa
somente `codex --version`. Não recebe `OPENAI_API_KEY`, não chama modelos,
não altera código e não autoriza merge/deploy.

**Importante:** versão exata não equivale a pin por hash de integridade.
Antes de usar segredos, verificar a integridade do pacote, dependências,
comportamento de rede, permissões e custo. A instalação não configura o
`AUTONOMY_RUNNER_COMMAND` nem substitui a GitHub App. Manter
`AUTONOMY_ENABLED` e `AUTO_MERGE_ENABLED` ausentes ou `false`.
Registrar URL, versão e conclusão do ensaio na issue #147.
