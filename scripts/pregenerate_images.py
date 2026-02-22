#!/usr/bin/env python3
"""Pre-generate AI word art images for upcoming daily words.

Run daily via cron to ensure images are cached before players see them.
Generates images for today and tomorrow across top languages.

Usage:
    uv run python scripts/pregenerate_images.py           # top 10 languages, today + tomorrow
    uv run python scripts/pregenerate_images.py --all      # all languages
    uv run python scripts/pregenerate_images.py --days 3   # today + next 3 days
    uv run python scripts/pregenerate_images.py --lang en   # single language

Requires OPENAI_API_KEY in .env or environment.
"""

import argparse
import os
import sys
import time

# Add project root to path so we can import from webapp
# The app uses relative paths from webapp/, so chdir there
_script_dir = os.path.dirname(os.path.abspath(__file__))
_project_root = os.path.join(_script_dir, "..")
sys.path.insert(0, _project_root)
os.chdir(os.path.join(_project_root, "webapp"))

from webapp.app import (
    IMAGE_LANGUAGES,
    WORD_IMAGES_DIR,
    fetch_definition_cached,
    generate_word_image,
    get_todays_idx,
    get_word_for_day,
    language_codes,
    language_configs,
)


def main():
    parser = argparse.ArgumentParser(description="Pre-generate word art images")
    parser.add_argument("--all", action="store_true", help="Generate for all languages")
    parser.add_argument("--lang", type=str, help="Generate for a single language")
    parser.add_argument(
        "--days", type=int, default=1, help="Days ahead to generate (default: 1 = today + tomorrow)"
    )
    parser.add_argument(
        "--past",
        type=int,
        default=0,
        help="Days in the past to also generate (e.g. --past 1 = yesterday)",
    )
    parser.add_argument("--dry-run", action="store_true", help="Show what would be generated")
    args = parser.parse_args()

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("Error: OPENAI_API_KEY not set in environment or .env")
        sys.exit(1)

    if args.lang:
        if args.lang not in language_codes:
            print(f"Error: Unknown language '{args.lang}'")
            sys.exit(1)
        langs = [args.lang]
    elif args.all:
        langs = list(language_codes)
    else:
        langs = IMAGE_LANGUAGES

    todays_idx = get_todays_idx()
    start_idx = max(1, todays_idx - args.past)
    day_range = range(start_idx, todays_idx + args.days + 1)

    total = len(langs) * len(day_range)
    generated = 0
    cached = 0
    errors = 0

    print(
        f"Generating images for {len(langs)} languages, days {day_range.start}-{day_range.stop - 1}"
    )
    print(f"Total words to process: {total}\n")

    for day_idx in day_range:
        for lang in langs:
            word = get_word_for_day(lang, day_idx)
            lang_name = language_configs[lang].get("name", lang)

            cache_dir = os.path.join(WORD_IMAGES_DIR, lang)
            cache_path = os.path.join(cache_dir, f"{word.lower()}.webp")

            if args.dry_run:
                status = "cached" if os.path.exists(cache_path) else "pending"
                print(f"  [{status}] {lang} #{day_idx}: {word} ({lang_name})")
                continue

            if os.path.exists(cache_path):
                cached += 1
                print(f"  [cached] {lang} #{day_idx}: {word}")
                continue

            # Fetch and cache definition
            defn = fetch_definition_cached(word, lang)
            definition_hint = ""
            if defn and defn.get("definition"):
                definition_hint = f", which means {defn['definition']}"

            # Generate image
            start = time.time()
            result = generate_word_image(word, definition_hint, api_key, cache_dir, cache_path)
            elapsed = time.time() - start

            if result == "ok":
                generated += 1
                size_kb = os.path.getsize(cache_path) / 1024
                print(
                    f"  [generated] {lang} #{day_idx}: {word} ({lang_name})"
                    f" - {size_kb:.0f}KB in {elapsed:.1f}s"
                )
            else:
                errors += 1
                print(f"  [error] {lang} #{day_idx}: {word} - {result}")

    if not args.dry_run:
        print(f"\nDone: {generated} generated, {cached} cached, {errors} errors")


if __name__ == "__main__":
    main()
