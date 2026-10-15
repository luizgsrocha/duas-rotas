# Rua Nossa

**Language / Idioma:** [Português (Brasil)](README.md) · [English](README.en.md)

**Find a way to travel, even when there is no direct ride.**

**Rua Nossa** is an independent ride-sharing trip planner connecting cities across Brazil. Our goal is to help people discover travel options that may be missed when searching only for direct rides.

## The problem we're trying to solve

Imagine you need to travel from city A to city C, but cannot find a direct ride. There might be a ride from **A to B** and another from **B to C**, with schedules that allow a transfer.

Finding these combinations manually means searching multiple cities, comparing departure and arrival times, and checking whether there is enough time to make each connection. Rua Nossa aims to bring this work into a single search, suggesting multi-leg itineraries when compatible offers are found.

## Where does the information come from?

Rua Nossa currently retrieves information about **BlaBlaCar ride offers displayed on the BuscaÔnibus website**. Rua Nossa is not the original source of these offers and depends on the availability and freshness of information provided by the website being consulted.

Ride offers and booking links belong to their respective platforms. Rua Nossa is an independent project, **with no official affiliation or partnership with BuscaÔnibus or BlaBlaCar**.

## How it works

- City selection across Brazil's 26 states and the Federal District.
- Direct-ride searches and attempts to discover itineraries with transfers.
- Schedule comparison between legs, with filters for connection waiting time and maximum number of transfers.
- Sorting by duration, price, and number of transfers.
- Responsive interface, light and dark themes, and sharing.

**Important limitations:** connection discovery relies on geographically selected candidate cities and a limited number of external queries. It therefore **cannot guarantee finding every ride or possible combination**. External source failures or search time limits may lead to incomplete results. No connection should be treated as confirmed without checking each leg's availability and details on the corresponding platform.

## Repository

https://github.com/luizgsrocha/rua-nossa

## Deployment

Cloudflare Workers Builds tracks this repository's `main` branch and runs `npx wrangler deploy`.

The Worker is named `rua-nossa`, configured in `wrangler.toml`, and publicly available at:

https://rua-nossa.lgsr96.workers.dev/

The repository and Worker share the name `rua-nossa`. Cloudflare Workers Builds automatically deploys changes to the `main` branch.
