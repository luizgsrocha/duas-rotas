# SEO e versões — v0.10.0

Domínio canônico preservado: https://rua-nossa.lgsr96.workers.dev/ (HTTP 200 verificado em 29/10/2026). Metadados, compartilhamento, WebSite JSON-LD, links internos e sitemap usam essa origem. Em migração de domínio, revisar todos os canônicos, sitemap, robots e shareUrl em conjunto.

Guias estáticos: Taubaté → Campinas, Taubaté → Pirassununga e Formosa GO → Brasília DF. O HTML entrega conteúdo sem depender de JavaScript. O botão abre a busca com cidades validadas pelo catálogo; não inicia consultas nem promete vagas, horários ou preços. Não há marcação de ofertas/viagens fictícias.

A versão aparece no rodapé da página inicial e dos guias, ligada a /versoes.html. Em cada entrega funcional, atualizar versão, cache-busters e histórico. O histórico registra recursos do código, não é evidência de implantação em produção.

## Search Console — pendente

Após publicação, adicionar/verificar a propriedade de prefixo https://rua-nossa.lgsr96.workers.dev/ no Google Search Console com uma conta autorizada. Se for escolhido arquivo HTML de verificação, adicionar o arquivo exato via PR. Não inventar token de verificação. Enviar /sitemap.xml e inspecionar as cinco URLs. Nenhuma propriedade foi criada, token inserido ou sitemap enviado nesta tarefa. Acompanhar páginas indexadas, impressões, cliques e consultas; não há garantia de indexação ou posição.

Referências: https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap e https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls.

## Validação e rollback

99 testes determinísticos, autocomplete em três telas e fluxo SEO em mobile/desktop aprovados localmente. O CI executa também test-seo-ui.mjs. Validar no preview/produção os arquivos robots.txt, sitemap.xml, guias, metadados e preenchimento da busca após publicação. Reverter o commit para rollback. O bloqueio 403 da fonte permanece fora do escopo.
