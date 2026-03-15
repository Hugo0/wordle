#!/usr/bin/env python3
"""Pre-compute shuffled word lists for Nuxt migration.

Python's random.seed(42) + random.shuffle() uses Mersenne Twister which is
hard to replicate exactly in Node.js. Instead, we pre-shuffle all word lists
with the same seed and save as JSON files that the Nuxt server reads directly.

This preserves perfect parity for the legacy word selection algorithm
(days before MIGRATION_DAY_IDX = 1681).

Usage:
    uv run python scripts/preshuffle_word_lists.py
"""

import glob
import json
import os
import random

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")


def load_and_shuffle_words(lang, lang_config=None):
    """Load words with the exact same logic as app.py, including seed-42 shuffle."""
    words_path = os.path.join(DATA_DIR, "languages", lang, f"{lang}_5words.txt")

    # Load characters
    char_path = os.path.join(DATA_DIR, "languages", lang, f"{lang}_characters.txt")
    if os.path.exists(char_path):
        with open(char_path) as f:
            characters = set(line.strip() for line in f)
    else:
        characters = set()
        with open(words_path) as f:
            for line in f:
                characters.update(line.strip())

    # Load words
    with open(words_path) as f:
        words = [line.strip() for line in f]

    # QA filter (same as app.py)
    use_graphemes = lang_config and lang_config.get("grapheme_mode") == "true"
    if use_graphemes:
        import grapheme as _grapheme

        words = [w for w in words if w.strip() and _grapheme.length(w) == 5]
    else:
        words = [w.lower() for w in words if len(w) == 5 and w.isalpha()]

    # Filter by valid characters
    words = [w for w in words if all(c in characters for c in w)]

    # Check if sorted and shuffle (same heuristic as app.py)
    last_letter = ""
    n_in_order = 0
    for word in words:
        if word[0] <= last_letter:
            n_in_order += 1
        last_letter = word[0]

    if len(words) > 0 and n_in_order / len(words) > 0.8:
        random.shuffle(words)
        print(f"  {lang}: shuffled {len(words)} words (was sorted)")
    else:
        print(f"  {lang}: {len(words)} words (already shuffled)")

    return words


def main():
    # CRITICAL: Use the same seed as app.py
    random.seed(42)

    # Load language configs (needed for grapheme_mode)
    lang_dirs = glob.glob(os.path.join(DATA_DIR, "languages", "*"))
    language_codes = sorted(
        os.path.basename(d)
        for d in lang_dirs
        if os.path.isfile(os.path.join(d, f"{os.path.basename(d)}_5words.txt"))
    )

    # Load default config
    with open(os.path.join(DATA_DIR, "default_language_config.json")) as f:
        default_config = json.load(f)

    configs = {}
    for lc in language_codes:
        config_path = os.path.join(DATA_DIR, "languages", lc, "language_config.json")
        if os.path.exists(config_path):
            with open(config_path) as f:
                lang_config = json.load(f)
            merged = {**default_config}
            for key, value in lang_config.items():
                if isinstance(value, dict) and key in merged and isinstance(merged[key], dict):
                    merged[key] = {**merged[key], **value}
                else:
                    merged[key] = value
            configs[lc] = merged
        else:
            configs[lc] = default_config

    print(f"Pre-shuffling word lists for {len(language_codes)} languages...")
    total_words = 0

    for lc in language_codes:
        words = load_and_shuffle_words(lc, configs[lc])
        output_path = os.path.join(DATA_DIR, "languages", lc, f"{lc}_5words_shuffled.json")
        with open(output_path, "w") as f:
            json.dump(words, f)
        total_words += len(words)

    print(f"\nDone! {total_words} total words across {len(language_codes)} languages.")
    print("Files written: data/languages/{lang}/{lang}_5words_shuffled.json")


if __name__ == "__main__":
    main()
