#!/usr/bin/env python3
"""Prepare SEO URLs for a new canonical domain; dry-run by default."""
import argparse
import pathlib
import re
import sys
from urllib.parse import urlparse

ROOT = pathlib.Path(__file__).resolve().parents[1]
OLD = "https://rua-nossa.lgsr96.workers.dev"
FILES = [
    "index.html", "robots.txt", "sitemap.xml", "versoes.html",
    "caronas/taubate-para-campinas.html",
    "caronas/taubate-para-pirassununga.html",
    "caronas/formosa-para-brasilia.html",
]

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--domain", required=True, help="New HTTPS domain, e.g. https://example.com")
    parser.add_argument("--apply", action="store_true", help="Write changes (otherwise preview only)")
    args = parser.parse_args()
    target = args.domain.rstrip("/")
    parsed = urlparse(target)
    if (parsed.scheme != "https" or not parsed.hostname or parsed.username
            or parsed.password or parsed.port or parsed.path or parsed.query or parsed.fragment
            or not re.fullmatch(r"[a-zA-Z0-9.-]+", parsed.hostname)
            or "." not in parsed.hostname):
        parser.error("Use a bare HTTPS domain such as https://duasrotas.example")
    if target == OLD:
        parser.error("The new domain must differ from the current domain")
    modified = 0
    for relative in FILES:
        path = ROOT / relative
        if not path.is_file():
            print(f"ERROR missing {relative}", file=sys.stderr)
            return 1
        content = path.read_text(encoding="utf-8")
        updated = content.replace(OLD, target)
        if updated != content:
            modified += 1
            print(f"{'UPDATE' if args.apply else 'WOULD UPDATE'} {relative}")
            if args.apply:
                path.write_text(updated, encoding="utf-8")
        else:
            print(f"UNCHANGED {relative}")
    print(f"{modified} files {'updated' if args.apply else 'would change'}.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
