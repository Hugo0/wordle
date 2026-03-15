#!/usr/bin/env python3
"""Pre-generate LLM definitions for upcoming daily words.

Run daily via cron to ensure definitions are cached before players see them.
Generates definitions for today and tomorrow across all languages.

Usage:
    uv run python scripts/pregenerate_definitions.py              # all langs, today + tomorrow
    uv run python scripts/pregenerate_definitions.py --days 3     # today + 3 days ahead
    uv run python scripts/pregenerate_definitions.py --lang en    # single language
    uv run python scripts/pregenerate_definitions.py --backfill 30 # past 30 days
    uv run python scripts/pregenerate_definitions.py --dry-run    # show what would be generated

Requires OPENAI_API_KEY in .env or environment.
"""

import argparse
import os
import sys
import time

# Add project root to path so we can import from webapp
_script_dir = os.path.dirname(os.path.abspath(__file__))
_project_root = os.path.join(_script_dir, "..")
sys.path.insert(0, _project_root)
os.chdir(os.path.join(_project_root, "webapp"))

from webapp.app import (  # noqa: E402
    WORD_DEFS_DIR,
    get_todays_idx,
    get_word_for_day,
    language_codes,
    language_configs,
)
from webapp.definitions import _call_llm_definition  # noqa: E402


def main():
    parser = argparse.ArgumentParser(description="Pre-generate LLM definitions for daily words")
    parser.add_argument("--lang", type=str, help="Generate for a single language")
    parser.add_argument(
        "--days", type=int, default=1, help="Days ahead to generate (default: 1 = today + tomorrow)"
    )
    parser.add_argument(
        "--backfill",
        type=int,
        default=0,
        help="Days in the past to also generate (e.g. --backfill 30)",
    )
    parser.add_argument("--dry-run", action="store_true", help="Show what would be generated")
    args = parser.parse_args()

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key and not args.dry_run:
        print("Error: OPENAI_API_KEY not set in environment or .env")
        sys.exit(1)

    if args.lang:
        if args.lang not in language_codes:
            print(f"Error: Unknown language '{args.lang}'")
            sys.exit(1)
        langs = [args.lang]
    else:
        langs = list(language_codes)

    todays_idx = get_todays_idx()
    start_idx = max(1, todays_idx - args.backfill)
    day_range = range(start_idx, todays_idx + args.days + 1)

    total = len(langs) * len(day_range)
    generated = 0
    cached = 0
    errors = 0
    low_confidence = 0

    print(
        f"Generating definitions for {len(langs)} languages, "
        f"days {day_range.start}-{day_range.stop - 1}"
    )
    print(f"Total words to process: {total}\n")

    for day_idx in day_range:
        for lang in langs:
            word = get_word_for_day(lang, day_idx)
            lang_name = language_configs[lang].get("name", lang)

            cache_dir = os.path.join(WORD_DEFS_DIR, lang)
            cache_path = os.path.join(cache_dir, f"{word.lower()}.json")

            if args.dry_run:
                status = "cached" if os.path.exists(cache_path) else "pending"
                print(f"  [{status}] {lang} #{day_idx}: {word} ({lang_name})")
                continue

            if os.path.exists(cache_path):
                cached += 1
                continue

            # Generate definition via LLM
            start = time.time()
            result = _call_llm_definition(word, lang)
            elapsed = time.time() - start

            if result:
                confidence = result.get("confidence", 0)
                pos = result.get("part_of_speech", "?")

                # Write to cache
                import json

                os.makedirs(cache_dir, exist_ok=True)
                with open(cache_path, "w") as f:
                    json.dump(result, f)

                generated += 1
                flag = ""
                if confidence < 0.7:
                    low_confidence += 1
                    flag = " (LOW)"
                print(
                    f"  [generated] {lang} #{day_idx}: {word} ({lang_name})"
                    f" — confidence={confidence}, pos={pos}, {elapsed:.1f}s{flag}"
                )
            else:
                errors += 1
                # Write negative cache
                import json

                os.makedirs(cache_dir, exist_ok=True)
                with open(cache_path, "w") as f:
                    json.dump({"not_found": True, "ts": int(time.time())}, f)
                print(f"  [error] {lang} #{day_idx}: {word} ({lang_name}) — {elapsed:.1f}s")

            # Rate limit: 0.3s between calls
            time.sleep(0.3)

    if not args.dry_run:
        print(
            f"\nDone: {generated} generated, {cached} cached, "
            f"{errors} errors, {low_confidence} low-confidence"
        )


if __name__ == "__main__":
    main()
