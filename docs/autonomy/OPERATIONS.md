# Arquitetura operacional

## Fluxo inerte por padrão

```text
schedule/manual -> orchestrator (1 ciclo) -> branch/PR -> quality-gates
                                                   -> human-sensitive-path gate
                                                   -> merge gate
main -> Cloudflare Workers Builds -> deploy -> smoke/read-only monitor
                                         \-> rollback runbook + circuit breaker
```

O repositório entrega os contratos, gates e runbooks. O executor autônomo é um
runner efêmero ou serviço externo independente de uma conversa aberta. Ele deve
usar GitHub App, identidade OpenAI e ambiente Cloudflare separados. Até o checklist
de ativação, `AUTONOMY_ENABLED`, `AUTO_MERGE_ENABLED`, `STAGING_DEPLOY_ENABLED` e
`PRODUCTION_DEPLOY_ENABLED` permanecem ausentes ou `false`.

## Recorrência e concorrência

O workflow `autonomous-cycle.yml` acorda a cada hora, usa `concurrency` sem
cancelamento e só chama o runner quando `AUTONOMY_ENABLED=true`. O runner recebe
uma cópia limpa, lê `AGENTS.md`, reivindica uma tarefa e encerra após um PR. O
estado durável é a fila versionada, issues/PRs e artefatos do Actions — nunca a
memória de uma sessão.

## Gates de merge

Um PR autônomo somente é elegível quando:

- branch baseada no `main` atual e todos os checks de `quality-gates` passam;
- autor é a GitHub App esperada e o rótulo `autonomy:candidate` está presente;
- não toca caminhos sensíveis (`.github/**`, `wrangler.toml`, `AGENTS.md`,
  `docs/autonomy/**`) e não possui `do-not-merge`;
- nenhuma conversa/revisão está pendente e a proteção da branch exige aprovação;
- auto-merge está habilitado no repositório e o circuit breaker está fechado.

O gate deve solicitar auto-merge pela API; não deve fazer merge direto nem usar
token de administrador. Este PR adiciona somente a especificação: a ativação exige
ruleset e GitHub App conforme `ACTIVATION.md`.

## Deploy e rollback

Cloudflare Workers Builds continua como único controlador: acompanha `main`, roda
os testes configurados e executa `npx wrangler deploy`. O GitHub não recebe token
de deploy nem publica uma segunda vez. O fluxo alvo:

1. merge elegível em `main` dispara o build da Cloudflare;
2. o monitor aguarda o deployment/version ID e registra commit, horário e estado;
3. smoke somente leitura valida a URL publicada;
4. nesta primeira fase, uma falha abre alerta/issue e exige rollback humano com
   `wrangler rollback <previous-version-id>` no painel ou CLI autorizado;
5. depois de validar rollback em ambiente isolado, uma fase futura poderá entregar
   token Cloudflare exclusivo a um workflow protegido para executar esse comando;
6. após rollback ou 3 falhas consecutivas, o operador pausa Workers Builds até
   reset humano do circuit breaker.

Nunca inferir sucesso apenas pelo status do commit: o smoke e o ID de versão são
obrigatórios. Migrações destrutivas e mudanças de bindings não entram no rollback.

## Registros

Cada PR atualiza `CHANGELOG.md` quando muda comportamento. Releases usam tags
SemVer e GitHub Release; cada execução mantém summary e artefato JSON com SHA,
PR, checks, deploy/version ID, rollback, duração e custos disponíveis. Retenção
recomendada: 90 dias. Relatório diário deve ser gerado desses registros, sem dados
sensíveis; envio de e-mail é uma integração posterior e separada.
