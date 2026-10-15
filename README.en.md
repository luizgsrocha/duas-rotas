# Rua Nossa

**Language / Idioma:** [Português (Brasil)](README.md) · [English](README.en.md)

Ride-sharing trip planner for Brazil, supporting direct rides and itineraries with transfers.

## Repository
https://github.com/luizgsrocha/rua-nossa

## How it works
- City selection across Brazil's 26 states and the Federal District.
- Searches BlaBlaCar ride offers displayed by BuscaOnibus.
- Filters for waiting time and maximum number of transfers.
- Sorting by duration, price, and number of transfers.
- Responsive interface, light and dark themes, and sharing.
- Independent project, with no affiliation or partnership with BlaBlaCar.

Connection searches use geographic candidates and query limits; they cannot guarantee finding every possible combination. External queries have time limits, and source availability errors are reported.

## Deployment
Cloudflare Workers Builds tracks this repository's `main` branch and runs `npx wrangler deploy`.

The Worker is named `rua-nossa`, configured in `wrangler.toml`, and publicly available at:
https://rua-nossa.lgsr96.workers.dev/

The repository and Worker share the name `rua-nossa`. Cloudflare Workers Builds automatically deploys changes to the `main` branch.
