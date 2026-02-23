#!/usr/bin/env python3
"""
Word quality analysis tool for Arabic and Hebrew.

Analyzes daily word lists to identify quality issues:
- Character frequency and difficulty scoring
- Hebrew suffix variant groups (possessive/construct forms)
- Cross-referencing against multiple frequency sources

This script is READ-ONLY — it analyzes existing data and prints reports.
Use improve_word_lists.py to actually regenerate word lists.

Usage:
    python scripts/analyze_word_quality.py char-freq ar
    python scripts/analyze_word_quality.py char-freq he
    python scripts/analyze_word_quality.py difficult-words ar
    python scripts/analyze_word_quality.py difficult-words ar --threshold 0.03
    python scripts/analyze_word_quality.py hebrew-suffixes
    python scripts/analyze_word_quality.py hebrew-quality
"""

import argparse
import sys
from collections import defaultdict
from math import log
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
DATA_DIR = SCRIPT_DIR.parent / "webapp" / "data" / "languages"


# ---------------------------------------------------------------------------
# Data loading (reuse patterns from improve_word_lists.py)
# ---------------------------------------------------------------------------


def load_word_list(lang: str) -> list[str]:
    """Load the main word list."""
    path = DATA_DIR / lang / f"{lang}_5words.txt"
    if not path.exists():
        return []
    return [line.strip() for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def load_daily_words(lang: str) -> list[str]:
    """Load the daily word list (curated subset)."""
    path = DATA_DIR / lang / f"{lang}_daily_words.txt"
    if not path.exists():
        return []
    return [
        line.strip()
        for line in path.read_text(encoding="utf-8").splitlines()
        if line.strip() and not line.startswith("#")
    ]


def load_characters(lang: str) -> list[str]:
    """Load valid character set for a language (preserving order)."""
    path = DATA_DIR / lang / f"{lang}_characters.txt"
    if not path.exists():
        return []
    return [line.strip() for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def load_blocklist(lang: str) -> set[str]:
    """Load blocklist words."""
    path = DATA_DIR / lang / f"{lang}_blocklist.txt"
    if not path.exists():
        return set()
    blocklist = set()
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#"):
            blocklist.add(line.lower())
    return blocklist


# ---------------------------------------------------------------------------
# Character frequency analysis
# ---------------------------------------------------------------------------


def compute_char_frequency(words: list[str]) -> dict[str, float]:
    """Compute fraction of words containing each character.

    Returns {char: fraction} where fraction is in [0, 1].
    A character that appears in every word has fraction 1.0.
    """
    if not words:
        return {}
    char_counts = defaultdict(int)
    for word in words:
        for char in set(word):  # count each char once per word
            char_counts[char] += 1
    return {char: count / len(words) for char, count in char_counts.items()}


def word_min_char_freq(word: str, char_freq: dict[str, float]) -> tuple[float, str]:
    """Return (min_frequency, rarest_char) for a word."""
    if not word:
        return (0.0, "")
    rarest_char = min(set(word), key=lambda c: char_freq.get(c, 0.0))
    return (char_freq.get(rarest_char, 0.0), rarest_char)


# ---------------------------------------------------------------------------
# Subcommand: char-freq
# ---------------------------------------------------------------------------


def cmd_char_freq(args):
    """Print character frequency table for a language."""
    lang = args.lang
    use_daily = not args.main_list

    if use_daily:
        words = load_daily_words(lang)
        source = "daily_words"
    else:
        words = load_word_list(lang)
        source = "main list"

    if not words:
        print(f"No words found for {lang} ({source})", file=sys.stderr)
        sys.exit(1)

    char_freq = compute_char_frequency(words)
    sorted_chars = sorted(char_freq.items(), key=lambda x: x[1])

    print(f"Character frequency for {lang} ({source}, {len(words)} words)")
    print(f"{'Char':<6} {'Count':>6} {'Freq %':>8} {'Bar'}")
    print("-" * 50)
    for char, freq in sorted_chars:
        count = int(freq * len(words))
        bar = "#" * int(freq * 100)
        print(f"  {char}    {count:>6} {freq*100:>7.1f}%  {bar}")

    # Threshold analysis
    print(f"\n{'Threshold analysis':}")
    print(f"{'Threshold':>10} {'Chars below':>12} {'Words filtered':>15} {'Words remaining':>16}")
    print("-" * 55)
    for threshold in [0.01, 0.02, 0.03, 0.05, 0.10]:
        rare_chars = {c for c, f in char_freq.items() if f < threshold}
        filtered = [w for w in words if any(c in rare_chars for c in w)]
        remaining = len(words) - len(filtered)
        print(
            f"    {threshold*100:>4.0f}%    {len(rare_chars):>6}       {len(filtered):>8}          {remaining:>6}"
        )


# ---------------------------------------------------------------------------
# Subcommand: difficult-words
# ---------------------------------------------------------------------------


def cmd_difficult_words(args):
    """List words containing characters rarer than threshold."""
    lang = args.lang
    threshold = args.threshold
    limit = args.limit

    words = load_daily_words(lang)
    if not words:
        words = load_word_list(lang)

    if not words:
        print(f"No words found for {lang}", file=sys.stderr)
        sys.exit(1)

    char_freq = compute_char_frequency(words)

    # Score each word by its rarest character
    scored = []
    for word in words:
        min_freq, rarest = word_min_char_freq(word, char_freq)
        scored.append((word, min_freq, rarest))

    # Sort by difficulty (rarest char frequency ascending = hardest first)
    scored.sort(key=lambda x: x[1])

    # Filter by threshold if specified
    if threshold is not None:
        scored = [(w, f, c) for w, f, c in scored if f < threshold]
        print(f"Words in {lang} daily list with rarest character below {threshold*100:.0f}%:")
    else:
        print(f"All words in {lang} daily list sorted by difficulty (hardest first):")

    if limit:
        scored = scored[:limit]

    print(f"{'Word':<12} {'Rarest Char':>12} {'Char Freq %':>12}")
    print("-" * 38)
    for word, freq, char in scored:
        print(f"  {word:<10} {char:>8}      {freq*100:>7.1f}%")

    print(f"\nTotal: {len(scored)} words")


# ---------------------------------------------------------------------------
# Subcommand: hebrew-suffixes
# ---------------------------------------------------------------------------

# Hebrew possessive/construct suffixes
HEBREW_SUFFIXES = {
    "ו": "his",
    "י": "my/adj",
    "ם": "their-m",
    "ן": "their-f",
    "ה": "her/fem",
    "ך": "your",
    "ת": "construct/fem",
}


def find_suffix_groups(words: list[str], min_group_size: int = 3) -> dict[str, list[str]]:
    """Find groups of words sharing a stem with different suffixes.

    Returns {stem: [word1, word2, ...]} for groups with >= min_group_size members.
    """
    groups = defaultdict(list)
    word_set = set(words)

    for word in words:
        if len(word) == 5 and word[-1] in HEBREW_SUFFIXES:
            stem = word[:-1]
            groups[stem].append(word)

    # Filter to groups with enough variants
    return {stem: variants for stem, variants in groups.items() if len(variants) >= min_group_size}


def cmd_hebrew_suffixes(args):
    """Find Hebrew suffix variant groups in daily words."""
    words = load_daily_words("he")
    if not words:
        print("No Hebrew daily words found", file=sys.stderr)
        sys.exit(1)

    min_size = args.min_group_size
    groups = find_suffix_groups(words, min_size)

    print(f"Hebrew suffix groups (>= {min_size} variants) in daily words ({len(words)} words)")
    print(f"Found {len(groups)} groups\n")

    # Sort by group size descending
    sorted_groups = sorted(groups.items(), key=lambda x: -len(x[1]))

    total_to_blocklist = 0
    blocklist_words = []

    for stem, variants in sorted_groups:
        suffix_info = []
        for word in sorted(variants):
            suffix = word[-1]
            suffix_name = HEBREW_SUFFIXES.get(suffix, "?")
            suffix_info.append(f"  {word}  (-{suffix} = {suffix_name})")

        print(f"Stem: {stem}  ({len(variants)} variants)")
        for info in suffix_info:
            print(info)

        # Keep first variant (alphabetically), blocklist the rest
        keep = sorted(variants)[0]
        to_block = [w for w in sorted(variants) if w != keep]
        blocklist_words.extend(to_block)
        total_to_blocklist += len(to_block)
        print(f"  → Keep: {keep}, blocklist: {to_block}")
        print()

    print(f"{'='*50}")
    print(f"Total groups: {len(groups)}")
    print(f"Total words to blocklist: {total_to_blocklist}")
    print(f"\nBlocklist additions (copy-paste ready):")
    for w in sorted(blocklist_words):
        print(w)


# ---------------------------------------------------------------------------
# Subcommand: hebrew-quality
# ---------------------------------------------------------------------------


def cmd_hebrew_quality(args):
    """Cross-reference Hebrew daily words against wordfreq for quality issues."""
    try:
        from wordfreq import zipf_frequency
    except ImportError:
        print(
            "Error: wordfreq library required. Install with: pip install wordfreq", file=sys.stderr
        )
        sys.exit(1)

    words = load_daily_words("he")
    if not words:
        print("No Hebrew daily words found", file=sys.stderr)
        sys.exit(1)

    print(f"Hebrew daily word quality analysis ({len(words)} words)")
    print(f"Cross-referencing with wordfreq (Wikipedia, Reddit, Google Books, etc.)\n")

    # Score each word
    not_in_wordfreq = []
    low_wordfreq = []
    normal = []

    for word in words:
        zf = zipf_frequency(word, "he")
        if zf == 0.0:
            not_in_wordfreq.append((word, zf))
        elif zf < 2.0:
            low_wordfreq.append((word, zf))
        else:
            normal.append((word, zf))

    # Report
    print(f"Category breakdown:")
    print(f"  Normal (zipf >= 2.0):      {len(normal):>5} words")
    print(f"  Low frequency (zipf < 2.0): {len(low_wordfreq):>5} words")
    print(f"  Not in wordfreq at all:     {len(not_in_wordfreq):>5} words")

    if not_in_wordfreq:
        print(f"\n{'='*50}")
        print(f"Words NOT found in wordfreq ({len(not_in_wordfreq)} words)")
        print(f"These may be proper nouns, obscure, or malformed:")
        print(f"{'='*50}")
        # Show first N
        limit = args.limit or 100
        for word, zf in sorted(not_in_wordfreq)[:limit]:
            print(f"  {word}")
        if len(not_in_wordfreq) > limit:
            print(f"  ... and {len(not_in_wordfreq) - limit} more")

    if low_wordfreq:
        print(f"\n{'='*50}")
        print(f"Low-frequency words (zipf < 2.0, {len(low_wordfreq)} words)")
        print(f"These may be uncommon or domain-specific:")
        print(f"{'='*50}")
        low_wordfreq.sort(key=lambda x: x[1])
        limit = args.limit or 50
        for word, zf in low_wordfreq[:limit]:
            print(f"  {word}  (zipf={zf:.2f})")
        if len(low_wordfreq) > limit:
            print(f"  ... and {len(low_wordfreq) - limit} more")

    # Summary stats
    all_zf = [zipf_frequency(w, "he") for w in words]
    has_freq = [z for z in all_zf if z > 0]
    if has_freq:
        avg = sum(has_freq) / len(has_freq)
        print(
            f"\nWordfreq coverage: {len(has_freq)}/{len(words)} words ({100*len(has_freq)/len(words):.1f}%)"
        )
        print(f"Average zipf frequency (of found words): {avg:.2f}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main():
    parser = argparse.ArgumentParser(description="Word quality analysis for Arabic and Hebrew")
    subparsers = parser.add_subparsers(dest="command", help="Commands")

    # char-freq
    cf = subparsers.add_parser("char-freq", help="Character frequency table")
    cf.add_argument("lang", help="Language code (e.g., ar, he)")
    cf.add_argument(
        "--main-list", action="store_true", help="Use main word list instead of daily words"
    )

    # difficult-words
    dw = subparsers.add_parser("difficult-words", help="List words with rare characters")
    dw.add_argument("lang", help="Language code")
    dw.add_argument(
        "--threshold", type=float, default=None, help="Min char frequency threshold (e.g., 0.03)"
    )
    dw.add_argument("--limit", type=int, default=None, help="Max words to show")

    # hebrew-suffixes
    hs = subparsers.add_parser("hebrew-suffixes", help="Find Hebrew suffix variant groups")
    hs.add_argument(
        "--min-group-size", type=int, default=3, help="Min group size to report (default: 3)"
    )

    # hebrew-quality
    hq = subparsers.add_parser(
        "hebrew-quality", help="Cross-reference Hebrew daily words with wordfreq"
    )
    hq.add_argument("--limit", type=int, default=None, help="Max words to show per category")

    args = parser.parse_args()

    if args.command == "char-freq":
        cmd_char_freq(args)
    elif args.command == "difficult-words":
        cmd_difficult_words(args)
    elif args.command == "hebrew-suffixes":
        cmd_hebrew_suffixes(args)
    elif args.command == "hebrew-quality":
        cmd_hebrew_quality(args)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
