"""
Test suite for Wiktionary definition parser across all 65 languages.

Tests fetch_native_wiktionary() for 5 words per language and validates
that returned definitions are reasonable (not garbage metadata).

These tests hit the network and are slow. Run explicitly with:
    uv run pytest tests/test_wiktionary_definitions.py -v --run-network --timeout=300
"""

import sys
from pathlib import Path

import pytest

# Add webapp to path so we can import wiktionary module
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "webapp"))

sys.path.insert(0, str(PROJECT_ROOT / "tests"))

from wiktionary import fetch_native_wiktionary
from wiktionary_test_utils import is_quality_definition

LANGUAGES_DIR = PROJECT_ROOT / "webapp" / "data" / "languages"


def load_word_list(lang_code):
    """Load the main word list for a language."""
    word_file = LANGUAGES_DIR / lang_code / f"{lang_code}_5words.txt"
    if not word_file.exists():
        return []
    with open(word_file, "r", encoding="utf-8") as f:
        return [line.strip() for line in f if line.strip()]


def pick_test_words(lang_code, count=5):
    """Pick `count` words spread across the word list for a language."""
    words = load_word_list(lang_code)
    if not words:
        return []

    n = len(words)
    if n <= count:
        return words

    # Pick words at spread-out indices (not evenly spaced):
    # For n=1000:  indices 0, 100, 200, 500, 999
    # For n=10000: indices 0, 1000, 2000, 5000, 1000
    target_indices = [0, n // 10, n // 5, n // 2, min(n - 1, 1000)]
    # Deduplicate and cap
    seen = set()
    result = []
    for idx in target_indices:
        idx = min(idx, n - 1)
        if idx not in seen:
            seen.add(idx)
            result.append(words[idx])
        if len(result) >= count:
            break

    # If we still need more (unlikely), fill from the start
    i = 0
    while len(result) < count and i < n:
        if words[i] not in result:
            result.append(words[i])
        i += 1

    return result[:count]


def generate_test_cases():
    """Generate (lang_code, word) pairs for parametrize."""
    cases = []
    lang_dirs = sorted(d.name for d in LANGUAGES_DIR.iterdir() if d.is_dir())
    for lang_code in lang_dirs:
        words = pick_test_words(lang_code)
        for word in words:
            cases.append((lang_code, word))
    return cases


TEST_CASES = generate_test_cases()


@pytest.mark.network
@pytest.mark.parametrize(
    "lang_code,word",
    TEST_CASES,
    ids=[f"{lc}-{w}" for lc, w in TEST_CASES],
)
def test_wiktionary_definition(lang_code, word):
    """Fetch a definition from native Wiktionary and validate quality."""
    result = fetch_native_wiktionary(word, lang_code)

    if result is None:
        pytest.skip(f"No definition found for {lang_code}:{word}")
        return

    assert isinstance(result, dict), f"Expected dict, got {type(result)}"
    assert "definition" in result, f"Missing 'definition' key in result: {result}"

    defn = result["definition"]
    is_good, reason = is_quality_definition(word, defn)

    if not is_good:
        pytest.fail(
            f"Bad definition for {lang_code}:{word}\n"
            f"  Reason: {reason}\n"
            f"  Definition: {defn!r}"
        )


@pytest.mark.network
def test_wiktionary_coverage_summary(capsys):
    """Run all test words and print a coverage summary.

    This is a single test that reports aggregate stats across all languages.
    """
    results = {
        "total": 0,
        "found": 0,
        "not_found": 0,
        "garbage": 0,
        "good": 0,
    }
    per_lang = {}

    lang_dirs = sorted(d.name for d in LANGUAGES_DIR.iterdir() if d.is_dir())
    for lang_code in lang_dirs:
        words = pick_test_words(lang_code)
        lang_stats = {"total": 0, "good": 0, "not_found": 0, "garbage": 0, "details": []}

        for word in words:
            results["total"] += 1
            lang_stats["total"] += 1

            try:
                result = fetch_native_wiktionary(word, lang_code)
            except Exception as e:
                lang_stats["details"].append((word, "error", str(e)[:80]))
                results["not_found"] += 1
                lang_stats["not_found"] += 1
                continue

            if result is None:
                results["not_found"] += 1
                lang_stats["not_found"] += 1
                lang_stats["details"].append((word, "not_found", ""))
                continue

            results["found"] += 1
            defn = result.get("definition", "")
            is_good, reason = is_quality_definition(word, defn)

            if is_good:
                results["good"] += 1
                lang_stats["good"] += 1
                lang_stats["details"].append((word, "good", defn[:60]))
            else:
                results["garbage"] += 1
                lang_stats["garbage"] += 1
                lang_stats["details"].append((word, "garbage", f"{reason}: {defn!r}"[:80]))

        per_lang[lang_code] = lang_stats

    # Print summary
    with capsys.disabled():
        print("\n" + "=" * 80)
        print("WIKTIONARY DEFINITION COVERAGE SUMMARY")
        print("=" * 80)
        print(f"Total words tested: {results['total']}")
        print(
            f"Definitions found:  {results['found']} ({results['found']*100//max(results['total'],1)}%)"
        )
        print(f"  Good quality:     {results['good']}")
        print(f"  Garbage:          {results['garbage']}")
        print(f"Not found:          {results['not_found']}")
        print()

        # Per-language breakdown
        print(f"{'Lang':<6} {'Total':>5} {'Good':>5} {'None':>5} {'Bad':>5}  Details")
        print("-" * 80)
        for lang_code in lang_dirs:
            s = per_lang.get(lang_code, {})
            if not s:
                continue
            detail_str = "; ".join(
                f"{w}={'OK' if st == 'good' else st}" for w, st, _ in s.get("details", [])
            )
            print(
                f"{lang_code:<6} {s['total']:>5} {s['good']:>5} "
                f"{s['not_found']:>5} {s['garbage']:>5}  {detail_str[:60]}"
            )

        print("=" * 80)

    # This test always passes -- it's for reporting
    assert True
