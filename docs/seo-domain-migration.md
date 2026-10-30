# SEO e migração para domínio próprio

## Estado atual
O endereço canônico é `https://rua-nossa.lgsr96.workers.dev`. Há um `robots.txt`, um `sitemap.xml` e três páginas de rotas. **Não há comprovação de indexação no Google ou configuração do Search Console.**

## Antes de comprar o domínio
- Melhorar o conteúdo das páginas e os links internos sem gerar páginas vazias ou duplicadas.
- Manter o domínio atual como canônico até o novo domínio estar operacional.
- Não adicionar `noindex` ao site atual e não alterar DNS antecipadamente.
- O script `scripts/prepare-seo-domain.py` permite visualizar as mudanças, sem aplicar nada por padrão.

## Quando o domínio estiver disponível
1. Configurar DNS e rota do Worker no Cloudflare e verificar HTTPS e respostas HTTP.
2. Criar branch e executar `python3 scripts/prepare-seo-domain.py --domain https://DOMINIO` para visualizar os arquivos afetados.
3. Executar com `--apply` na branch, revisar o diff, conferir URLs canônicas, Open Graph, robots e sitemap, rodar testes e abrir PR.
4. Verificar todas as URLs do sitemap e ausência de redirecionamentos em cadeia.
5. Publicar o novo domínio e implementar **redirecionamentos HTTP 301** de cada URL antiga para a correspondente nova, preservando caminho e parâmetros. A configuração depende da rota Cloudflare e deve ser testada antes de ativar.
6. Verificar propriedade no Google Search Console, enviar o sitemap do novo domínio, inspecionar URLs e acompanhar indexação e erros.
7. Manter os 301 e monitorar logs, Search Console e métricas por semanas. Não desligar o domínio antigo imediatamente.

## Restrições
- Não substituir o domínio em produção antes da validação.
- Não confundir URLs listadas no sitemap com URLs indexadas.
- Não prometer posição ou prazo de indexação no Google.
- Não gerar milhares de páginas de rotas sem conteúdo útil e distinto.
- Revisar eventuais referências adicionais ao domínio antigo no Worker, testes, workflows e documentação antes do corte.
