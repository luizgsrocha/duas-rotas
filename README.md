# Rua Nossa

**Idioma / Language:** [Português (Brasil)](README.md) · [English](README.en.md)

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

O RN-HUB é um seletor nacional opcional de cidades intermediárias. Ele é pré-calculado com dados do IBGE, valida cada trecho na fonte e permanece desligado por padrão até a validação do PR. Consulte [docs/rn-hub.md](docs/rn-hub.md).

## Publicação
Cloudflare Workers Builds acompanha a branch `main` deste repositório e executa `npx wrangler deploy`.

O Worker usa o nome `rua-nossa`, configurado em `wrangler.toml`, com o endereço público:
https://rua-nossa.lgsr96.workers.dev/

O repositório e o Worker estão alinhados ao nome `rua-nossa`. Cloudflare Workers Builds publica automaticamente as alterações da branch `main`.

