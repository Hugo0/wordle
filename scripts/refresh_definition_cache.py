#!/usr/bin/env python3
"""Refresh stale definition caches on production.

After changing the definition tier hierarchy, existing disk-cached definitions
may be from kaikki (lower quality) instead of the Wiktionary parser. This script
hits the API with ?refresh=1 to force re-resolution for past daily words.

Usage:
    uv run scripts/refresh_definition_cache.py [--langs en,de,...] [--days 30] [--base-url https://wordle.global]
"""

import argparse
import json
import time
import urllib.request


def get_past_words(base_url, lang_code, n_words):
    """Get recent daily words by fetching word pages from the hub."""
    import re

    words = []
    try:
        # Get day indices from the hub page
        url = f"{base_url}/{lang_code}/words"
        req = urllib.request.Request(url, headers={"User-Agent": "WordleGlobal-CacheRefresh/1.0"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            html = resp.read().decode("utf-8")
            day_indices = re.findall(rf"/{lang_code}/word/(\d+)", html)

        # Fetch each word page to get the actual word
        for day_idx in day_indices[:n_words]:
            try:
                url = f"{base_url}/{lang_code}/word/{day_idx}"
                req = urllib.request.Request(
                    url, headers={"User-Agent": "WordleGlobal-CacheRefresh/1.0"}
                )
                with urllib.request.urlopen(req, timeout=10) as resp:
                    html = resp.read().decode("utf-8")
                    m = re.search(r"uppercase\">(\w+)</strong>", html)
                    if m:
                        words.append(m.group(1).lower())
                time.sleep(0.2)
            except Exception:
                pass
    except Exception as e:
        print(f"  Error fetching word list: {e}")
    return words


def refresh_definitions(lang_codes, days, base_url, dry_run=False):
    """Refresh cached definitions for recent daily words."""
    for lang_code in lang_codes:
        print(f"[{lang_code}] Fetching recent words...")
        words = get_past_words(base_url, lang_code, days)
        if not words:
            print(f"  [{lang_code}] No words found — skipping")
            continue

        print(f"  [{lang_code}] Found {len(words)} words")
        refreshed = 0
        skipped = 0

        for word in words:
            url = f"{base_url}/{lang_code}/api/definition/{word}?refresh=1"
            if dry_run:
                print(f"  [{lang_code}] Would refresh: {word}")
                refreshed += 1
                continue

            try:
                req = urllib.request.Request(
                    url, headers={"User-Agent": "WordleGlobal-CacheRefresh/1.0"}
                )
                with urllib.request.urlopen(req, timeout=15) as resp:
                    data = json.loads(resp.read())
                    source = data.get("source", "?")
                    defn = data.get("definition", "")[:50]
                    print(f"  [{lang_code}] {word}: source={source} → {defn}")
                    refreshed += 1
            except Exception as e:
                print(f"  [{lang_code}] {word}: ERROR {e}")
                skipped += 1

            time.sleep(0.5)  # Be polite to production

        print(f"  [{lang_code}] Done: {refreshed} refreshed, {skipped} errors\n")


def main():
    parser = argparse.ArgumentParser(description="Refresh definition caches on production")
    parser.add_argument(
        "--langs", type=str, default="en", help="Comma-separated language codes (default: en)"
    )
    parser.add_argument(
        "--days", type=int, default=30, help="Number of recent words to refresh (default: 30)"
    )
    parser.add_argument("--base-url", type=str, default="https://wordle.global", help="Base URL")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be refreshed without making requests",
    )
    args = parser.parse_args()

    lang_codes = [lc.strip() for lc in args.langs.split(",")]
    print(f"Refreshing {len(lang_codes)} language(s), last {args.days} words")
    print(f"Base URL: {args.base_url}\n")

    refresh_definitions(lang_codes, args.days, args.base_url, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
