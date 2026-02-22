#!/usr/bin/env python3
"""Pre-generate AI word art images for upcoming daily words.

Run daily via cron to ensure images are cached before players see them.
Generates images for today and tomorrow across top languages.

Usage:
    uv run python scripts/pregenerate_images.py           # top 20 languages, today + tomorrow
    uv run python scripts/pregenerate_images.py --all      # all languages
    uv run python scripts/pregenerate_images.py --days 3   # today + next 3 days
    uv run python scripts/pregenerate_images.py --lang en   # single language

Requires OPENAI_API_KEY in .env or environment.
"""

import argparse
import json
import os
import re
import sys
import tempfile
import time
import urllib.parse
import urllib.request

# Add project root to path so we can import from webapp
# The app uses relative paths from webapp/, so chdir there
_script_dir = os.path.dirname(os.path.abspath(__file__))
_project_root = os.path.join(_script_dir, "..")
sys.path.insert(0, _project_root)
os.chdir(os.path.join(_project_root, "webapp"))

from webapp.app import (
    get_todays_idx,
    get_word_for_day,
    language_codes,
    language_configs,
    language_popularity,
)

# Top languages by traffic (pre-generate these by default)
TOP_LANGUAGES = language_popularity[:20]

CACHE_DIR = os.path.join(_project_root, "webapp", "static", "word-images")
DEFS_CACHE_DIR = os.path.join(_project_root, "webapp", "static", "word-defs")


def fetch_definition(word, lang_code):
    """Fetch definition from English Wiktionary (best-effort)."""
    try:
        url = f"https://en.wiktionary.org/api/rest_v1/page/definition/{urllib.parse.quote(word.lower())}"
        req = urllib.request.Request(url, headers={"User-Agent": "WordleGlobal/1.0"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read())
            for try_lang in [lang_code, "en"]:
                entries = data.get(try_lang, [])
                if entries and entries[0].get("definitions"):
                    raw_def = entries[0]["definitions"][0].get("definition", "")
                    clean_def = re.sub(r"<[^>]+>", "", raw_def).strip()
                    if clean_def:
                        return clean_def[:200]
    except Exception:
        pass
    return None


def cache_definition(word, lang_code, definition):
    """Cache definition to disk for the word page."""
    cache_dir = os.path.join(DEFS_CACHE_DIR, lang_code)
    cache_path = os.path.join(cache_dir, f"{word.lower()}.json")
    if os.path.exists(cache_path):
        return
    os.makedirs(cache_dir, exist_ok=True)
    result = {}
    if definition:
        result = {
            "definition": definition,
            "source": "english",
            "url": f"https://en.wiktionary.org/wiki/{urllib.parse.quote(word.lower())}",
        }
    with open(cache_path, "w") as f:
        json.dump(result, f)


def generate_image(word, lang_code, definition=None):
    """Generate and cache a word art image via DALL-E."""
    import openai

    lang_dir = os.path.join(CACHE_DIR, lang_code)
    cache_path = os.path.join(lang_dir, f"{word.lower()}.webp")

    if os.path.exists(cache_path):
        return "cached"

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        return "no_api_key"

    definition_hint = f' meaning "{definition}"' if definition else ""

    prompt = (
        f"A single centered watercolor illustration representing the concept "
        f'"{word}"{definition_hint}. '
        f"Soft pastel colors, gentle brush strokes, white background, "
        f"no text, no letters, no words, no numbers. "
        f"Simple and elegant, suitable as a small card illustration."
    )

    try:
        client = openai.OpenAI(api_key=api_key)
        response = client.images.generate(
            model="dall-e-3",
            prompt=prompt,
            size="1024x1024",
            quality="standard",
            n=1,
        )

        image_url = response.data[0].url
        if not image_url:
            return "no_url"

        # Download to temp file
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
            tmp_path = tmp.name
            urllib.request.urlretrieve(image_url, tmp_path)

        # Convert to WebP
        os.makedirs(lang_dir, exist_ok=True)
        try:
            from PIL import Image

            with Image.open(tmp_path) as img:
                img.save(cache_path, "WebP", quality=80)
        except ImportError:
            import shutil

            shutil.move(tmp_path, cache_path)
            tmp_path = None
        finally:
            if tmp_path and os.path.exists(tmp_path):
                os.unlink(tmp_path)

        size_kb = os.path.getsize(cache_path) / 1024
        return f"generated ({size_kb:.0f}KB)"
    except Exception as e:
        return f"error: {e}"


def main():
    parser = argparse.ArgumentParser(description="Pre-generate word art images")
    parser.add_argument("--all", action="store_true", help="Generate for all languages")
    parser.add_argument("--lang", type=str, help="Generate for a single language")
    parser.add_argument(
        "--days", type=int, default=1, help="Days ahead to generate (default: 1 = today + tomorrow)"
    )
    parser.add_argument("--dry-run", action="store_true", help="Show what would be generated")
    args = parser.parse_args()

    if not os.environ.get("OPENAI_API_KEY"):
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
        langs = TOP_LANGUAGES

    todays_idx = get_todays_idx()
    day_range = range(todays_idx, todays_idx + args.days + 1)

    total = len(langs) * len(day_range)
    generated = 0
    cached = 0
    errors = 0

    print(f"Generating images for {len(langs)} languages, days {day_range.start}-{day_range.stop - 1}")
    print(f"Total words to process: {total}\n")

    for day_idx in day_range:
        for lang in langs:
            word = get_word_for_day(lang, day_idx)
            lang_name = language_configs[lang].get("name", lang)

            if args.dry_run:
                cache_path = os.path.join(CACHE_DIR, lang, f"{word.lower()}.webp")
                status = "cached" if os.path.exists(cache_path) else "pending"
                print(f"  [{status}] {lang} #{day_idx}: {word} ({lang_name})")
                continue

            # Fetch and cache definition (fast, no rate limit concern)
            definition = fetch_definition(word, lang)
            cache_definition(word, lang, definition)

            # Generate image
            start = time.time()
            result = generate_image(word, lang, definition)
            elapsed = time.time() - start

            if result == "cached":
                cached += 1
                print(f"  [cached] {lang} #{day_idx}: {word}")
            elif result.startswith("generated"):
                generated += 1
                print(f"  [generated] {lang} #{day_idx}: {word} ({lang_name}) - {result} in {elapsed:.1f}s")
            else:
                errors += 1
                print(f"  [error] {lang} #{day_idx}: {word} - {result}")

    if not args.dry_run:
        print(f"\nDone: {generated} generated, {cached} cached, {errors} errors")


if __name__ == "__main__":
    main()
