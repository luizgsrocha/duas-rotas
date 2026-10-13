# Rua Nossa

Planejador de caronas pelo Brasil, com busca de viagens diretas e combinações com baldeações.

## Repositório
https://github.com/luizgsrocha/rua-nossa

## Funcionamento
- Seleção de municípios dos 26 estados e do Distrito Federal.
- Busca de ofertas da BlaBlaCar exibidas pelo BuscaOnibus.
- Filtros de espera e quantidade máxima de baldeações.
- Ordenação por duração, preço e quantidade de baldeações.
- Interface responsiva, temas claro e escuro e compartilhamento.
- Projeto independente, sem vínculo ou parceria com a BlaBlaCar.

A busca de conexões usa candidatos geográficos e limites de consultas; não garante encontrar todas as combinações possíveis. Consultas externas têm limite de tempo e erros de disponibilidade são informados.

## Publicação
Cloudflare Workers Builds acompanha a branch `main` deste repositório e executa `npx wrangler deploy`.

O Worker mantém o nome técnico `caronaflow`, configurado em `wrangler.toml`, para preservar o endereço público:
https://caronaflow.lgsr96.workers.dev/

Renomear o repositório para `rua-nossa` não altera esse endereço. A conexão do repositório no Cloudflare foi atualizada para o novo nome.
