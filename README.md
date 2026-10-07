# Rua Nossa

Planejador de caronas para **Pirassununga → Taubaté**, priorizando viagem direta e montando baldeações por **Campinas** e **São José dos Campos** quando necessário.

## MVP
- Prioriza rota direta.
- Aceita até 2 baldeações.
- Margem mínima de conexão configurável.
- Ordenação por recomendação, duração ou preço.
- Interface responsiva e estática, adequada para Cloudflare Pages.
- Motor de rotas separado da fonte de dados.

## Estado atual
A interface e o algoritmo já funcionam com dados demonstrativos. A próxima etapa é implementar um adaptador de dados para obter ofertas reais de uma fonte permitida/estável (por exemplo, integração oficial quando disponível), sem acoplar o algoritmo ao HTML de terceiros.

## Publicação
Cloudflare Pages pode publicar diretamente a raiz do repositório, sem etapa de build.
