# Rua Nossa

**Idioma / Language:** [Português (Brasil)](README.md) · [English](README.en.md)

**Encontre caminhos, mesmo quando não existe uma carona direta.**

O **Rua Nossa** é um planejador independente de caronas entre municípios brasileiros. Nosso objetivo é ajudar pessoas a descobrir possibilidades de viagem que podem passar despercebidas quando se pesquisa apenas um trajeto direto.

## O problema que queremos resolver

Imagine que você precise viajar da cidade A até a cidade C, mas não encontre uma carona direta. Pode existir uma carona de **A até B** e outra de **B até C**, com horários que permitam fazer a baldeação.

Encontrar essas combinações manualmente exige pesquisar várias cidades, comparar horários e verificar se há tempo suficiente entre os trechos. O Rua Nossa tenta reunir esse trabalho em uma única pesquisa, sugerindo itinerários com conexões quando houver ofertas compatíveis.

## De onde vêm as informações?

Atualmente, o Rua Nossa consulta informações de ofertas de caronas da **BlaBlaCar apresentadas no site BuscaÔnibus**. O Rua Nossa não é a fonte original dessas ofertas e depende da disponibilidade e da atualização das informações exibidas pelo site consultado.

As ofertas e os links de reserva pertencem às respectivas plataformas. O Rua Nossa é um projeto independente, **sem vínculo ou parceria oficial com BuscaÔnibus ou BlaBlaCar**.

## Como funciona

- Seleção de municípios dos 26 estados e do Distrito Federal.
- Busca de caronas diretas e tentativa de descobrir itinerários com baldeações.
- Comparação de horários entre os trechos e filtros de tempo de espera e quantidade máxima de baldeações.
- Ordenação por duração, preço e quantidade de baldeações.
- Interface responsiva, temas claro e escuro e compartilhamento.

**Limitações importantes:** a descoberta de conexões usa cidades candidatas selecionadas por critérios geográficos e um número limitado de consultas. Portanto, **não garante encontrar todas as caronas ou todas as combinações possíveis**. Se uma fonte externa falhar ou a pesquisa atingir o tempo limite, o resultado poderá ser incompleto. Nenhuma conexão deve ser considerada confirmada sem verificar a disponibilidade e os detalhes de cada trecho na plataforma correspondente.

## Repositório

https://github.com/luizgsrocha/rua-nossa

## Publicação

Cloudflare Workers Builds acompanha a branch `main` deste repositório e executa `npx wrangler deploy`.

O Worker usa o nome `rua-nossa`, configurado em `wrangler.toml`, com o endereço público:

https://rua-nossa.lgsr96.workers.dev/

O repositório e o Worker estão alinhados ao nome `rua-nossa`. Cloudflare Workers Builds publica automaticamente as alterações da branch `main`.
