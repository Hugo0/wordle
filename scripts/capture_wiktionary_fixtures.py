#!/usr/bin/env python3
"""Capture Wiktionary API responses as test fixtures for all 65 languages.

For each language, picks 4 words spread across the word list, fetches the raw
Wiktionary API extract, and also runs parse_wikt_definition() to get the parsed
result. Saves everything as JSON fixtures in tests/fixtures/wiktionary/.

Usage:
    uv run python scripts/capture_wiktionary_fixtures.py
"""

import json
import os
import sys
import time
import urllib.parse
import urllib.request as urlreq
from pathlib import Path

# Add webapp to path
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "webapp"))

from wiktionary import parse_wikt_definition, WIKT_LANG_MAP

LANGUAGES_DIR = PROJECT_ROOT / "webapp" / "data" / "languages"
FIXTURES_DIR = PROJECT_ROOT / "tests" / "fixtures" / "wiktionary"


def load_word_list(lang_code):
    """Load the main word list for a language."""
    word_file = LANGUAGES_DIR / lang_code / f"{lang_code}_5words.txt"
    if not word_file.exists():
        return []
    with open(word_file, "r", encoding="utf-8") as f:
        return [line.strip() for line in f if line.strip()]


def pick_test_words(lang_code, count=4):
    """Pick `count` words spread across the word list."""
    words = load_word_list(lang_code)
    if not words:
        return []

    n = len(words)
    if n <= count:
        return words

    # Pick words at evenly spaced indices: start, 1/4, 1/2, 3/4
    indices = [0, n // 4, n // 2, 3 * n // 4]
    result = []
    seen = set()
    for idx in indices:
        idx = min(idx, n - 1)
        if idx not in seen:
            seen.add(idx)
            result.append(words[idx])
        if len(result) >= count:
            break

    # Fill if needed
    i = 1
    while len(result) < count and i < n:
        if words[i] not in result:
            result.append(words[i])
        i += 1

    return result[:count]


def fetch_extract(word, wikt_lang):
    """Fetch raw Wiktionary extract for a word. Returns extract text or None."""
    # Try original word and title-case variant
    candidates = [word]
    if word[0].islower():
        candidates.append(word[0].upper() + word[1:])

    for try_word in candidates:
        api_url = (
            f"https://{wikt_lang}.wiktionary.org/w/api.php?"
            f"action=query&titles={urllib.parse.quote(try_word)}"
            f"&prop=extracts&explaintext=1&format=json"
        )
        try:
            req = urlreq.Request(
                api_url, headers={"User-Agent": "WordleGlobal/1.0 (fixture-capture)"}
            )
            with urlreq.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read())
                pages = data.get("query", {}).get("pages", {})
                for pid, page in pages.items():
                    if pid == "-1":
                        continue
                    extract = page.get("extract", "").strip()
                    if extract:
                        return extract, try_word
        except Exception as e:
            pass

    return None, word


def guess_word_type(extract, word):
    """Guess the word type from Wiktionary extract headers."""
    if not extract:
        return "unknown"

    extract_lower = extract.lower()

    # Check for POS headers
    noun_patterns = [
        "noun",
        "nom commun",
        "sustantivo",
        "substantiv",
        "sostantivo",
        "főnév",
        "nimisõna",
        "daiktavardis",
        "isim",
        "danh từ",
        "imenica",
        "именица",
        "ουσιαστικό",
        "שם עצם",
        "zelfstandig naamwoord",
        "іменник",
        "съществително",
        "podstatné jméno",
        "podstatné meno",
        "substantiivi",
        "anv-kadarn",
        "navdêr",
    ]
    verb_patterns = [
        "verb",
        "verbe",
        "verbo",
        "ige",
        "tegusõna",
        "veiksmažodis",
        "eylem",
        "động từ",
        "glagol",
        "глагол",
        "ρήμα",
        "פועל",
        "werkwoord",
        "дієслово",
        "sloveso",
        "verbi",
        "vèrb",
    ]
    adj_patterns = [
        "adjective",
        "adjectif",
        "adjetivo",
        "adjektiv",
        "aggettivo",
        "melléknév",
        "omadussõna",
        "būdvardis",
        "sıfat",
        "tính từ",
        "pridjev",
        "придев",
        "прилагателно",
        "επίθετο",
        "שם תואר",
        "bijvoeglijk",
        "прикметник",
        "přídavné",
        "prídavné",
        "adjektiivi",
        "adjectiu",
        "rengdêr",
    ]
    form_patterns = [
        "forme de",
        "forma ",
        "konjugierte form",
        "deklinierte form",
        "inflected form",
        "conjugated form",
    ]

    for pat in form_patterns:
        if pat in extract_lower:
            return "conjugated"
    for pat in noun_patterns:
        if pat in extract_lower:
            return "noun"
    for pat in verb_patterns:
        if pat in extract_lower:
            return "verb"
    for pat in adj_patterns:
        if pat in extract_lower:
            return "adj"

    return "unknown"


def main():
    FIXTURES_DIR.mkdir(parents=True, exist_ok=True)

    lang_dirs = sorted(d.name for d in LANGUAGES_DIR.iterdir() if d.is_dir())
    total_fetches = 0
    total_found = 0

    print(f"Capturing fixtures for {len(lang_dirs)} languages...")
    print()

    for lang_code in lang_dirs:
        words = pick_test_words(lang_code, count=4)
        if not words:
            print(f"  {lang_code}: no word list, skipping")
            continue

        wikt_lang = WIKT_LANG_MAP.get(lang_code, lang_code)
        fixture = {}

        for word in words:
            total_fetches += 1
            extract, tried_word = fetch_extract(word, wikt_lang)

            if extract:
                total_found += 1
                parsed = parse_wikt_definition(extract, word=tried_word, lang_code=wikt_lang)
                word_type = guess_word_type(extract, tried_word)
                fixture[word] = {
                    "extract": extract,
                    "parsed": parsed,
                    "word_type": word_type,
                    "tried_word": tried_word,
                }
            else:
                fixture[word] = {
                    "extract": None,
                    "parsed": None,
                    "word_type": "unknown",
                    "tried_word": word,
                }

            # Be polite to Wiktionary
            time.sleep(0.5)

        # Save fixture
        fixture_path = FIXTURES_DIR / f"{lang_code}.json"
        with open(fixture_path, "w", encoding="utf-8") as f:
            json.dump(fixture, f, ensure_ascii=False, indent=2)

        # Summary line
        found = sum(1 for v in fixture.values() if v["extract"] is not None)
        parsed = sum(1 for v in fixture.values() if v["parsed"] is not None)
        print(
            f"  {lang_code}: {found}/{len(words)} found, {parsed}/{len(words)} parsed  {list(fixture.keys())}"
        )

    print()
    print(f"Done! {total_found}/{total_fetches} extracts found across {len(lang_dirs)} languages.")
    print(f"Fixtures saved to {FIXTURES_DIR}/")


if __name__ == "__main__":
    main()
