#!/usr/bin/env python3
"""Build the checked-in RN-HUB national index from official IBGE workbooks.

Development dependencies: pandas, openpyxl and xlrd. The generated JSON is the
only artifact read by the Worker; production performs no IBGE network calls.
"""
from __future__ import annotations

import argparse
import json
import math
import re
import unicodedata
from collections import Counter
from pathlib import Path

import pandas as pd

HIERARCHY = {
    "1A": 1.0, "1B": .96, "1C": .92,
    "2A": .84, "2B": .78, "2C": .72,
    "3A": .61, "3B": .54, "4A": .43, "4B": .36, "5": .20,
}


def normalized(value: object) -> str:
    text = unicodedata.normalize("NFD", str(value or ""))
    text = "".join(char for char in text if unicodedata.category(char) != "Mn")
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--cities", default="cities.json")
    parser.add_argument("--population", required=True)
    parser.add_argument("--regic", required=True)
    parser.add_argument("--links", required=True)
    parser.add_argument("--output", default="rn-hub-index.json")
    args = parser.parse_args()

    cities = json.loads(Path(args.cities).read_text(encoding="utf-8"))
    population = pd.read_excel(args.population, sheet_name="Municípios", header=1)
    population.columns = ["uf", "coduf", "codmun", "name", "population", "note"]
    population["key"] = population.apply(lambda r: f"{normalized(r['name'])}:{r['uf']}", axis=1)
    populations = {r.key: int(r.population) for r in population.itertuples() if pd.notna(r.population)}

    regic = pd.read_excel(args.regic, sheet_name="Hierarquia e região")
    regic_by_code = {int(r.codmun): r for r in regic.itertuples()}
    regic_by_key = {f"{normalized(r.Município)}:{r.siguf}": r for r in regic.itertuples()}
    links = pd.read_excel(args.links, sheet_name="2018")
    incoming = Counter(int(x) for x in links["coddest"].dropna())
    outgoing = Counter(int(x) for x in links["codorig"].dropna())
    max_degree = max([1, *incoming.values(), *outgoing.values()])
    max_population = max(populations.values())

    records: dict[str, list[int]] = {}
    unmatched_population: list[str] = []
    unmatched_regic: list[str] = []
    for city in cities:
        key = f"{normalized(city['name'].rsplit(',', 1)[0])}:{city['uf']}"
        population_value = populations.get(key)
        regic_row = regic_by_key.get(key)
        if population_value is None:
            unmatched_population.append(key)
            population_value = 0
        if regic_row is None:
            unmatched_regic.append(key)
            hierarchy_code, degree = "5", 0
        else:
            hierarchy_code = str(getattr(regic_row, "_10", "5"))
            # pandas sanitizes the duplicate "Hierarquia 3" heading; prefer the
            # stable codmun lookup and obtain the code by position.
            raw = str(regic.loc[regic["codmun"] == regic_row.codmun, "Hierarquia 3"].iloc[0])
            match = re.match(r"([1-5](?:A|B|C)?)", raw)
            hierarchy_code = match.group(1) if match else "5"
            # codcid is the core city for members of a population arrangement;
            # REGIC links are keyed by that core rather than every municipality.
            code = int(regic_row.codcid)
            degree = incoming[code] + outgoing[code]
        hierarchy = HIERARCHY.get(hierarchy_code, .20)
        pop_component = math.log1p(population_value) / math.log1p(max_population) if population_value else 0
        connection_component = math.log1p(degree) / math.log1p(max_degree) if degree else 0
        # Population is deliberately not dominant: small regional connectors
        # can outrank larger cities with weak REGIC connectivity.
        national = round(1000 * (.38 * hierarchy + .32 * connection_component + .30 * pop_component))
        records[key] = [national, population_value, hierarchy_code, degree]

    payload = {
        "version": "rn-hub-2026.10.1",
        "generatedFrom": {
            "population": "IBGE Estimativas da População 2025 (arquivo atualizado em 28/08/2026)",
            "hierarchy": "IBGE REGIC 2018 - Municípios, hierarquia e região",
            "connectivity": "IBGE REGIC 2018 - Tabela de ligações",
        },
        "weights": {"hierarchy": .38, "connectivity": .32, "population": .30},
        "fields": ["nationalScore", "population", "hierarchy", "regicDegree"],
        "records": records,
        "coverage": {
            "cities": len(cities),
            "population": len(cities) - len(unmatched_population),
            "regic": len(cities) - len(unmatched_regic),
        },
    }
    Path(args.output).write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(json.dumps(payload["coverage"], ensure_ascii=False))
    if unmatched_population or unmatched_regic:
        print("population unmatched:", unmatched_population[:20])
        print("REGIC unmatched:", unmatched_regic[:20])


if __name__ == "__main__":
    main()
