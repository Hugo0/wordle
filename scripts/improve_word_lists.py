#!/usr/bin/env python3
"""
FrequencyWords-based word list improvement pipeline.

Uses Hermit Dave's FrequencyWords (OpenSubtitles frequency data) to:
1. Generate {lang}_daily_words.txt — top N most common words from the existing list
2. Generate {lang}_5words_supplement.txt — additional valid 5-letter guesses

The existing _5words.txt is NEVER modified.

Usage:
    python scripts/improve_word_lists.py download
    python scripts/improve_word_lists.py process it
    python scripts/improve_word_lists.py batch --dry-run
    python scripts/improve_word_lists.py batch
"""

import argparse
import subprocess
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
DATA_DIR = SCRIPT_DIR.parent / "webapp" / "data" / "languages"
FREQ_DIR = SCRIPT_DIR / ".freq_data" / "FrequencyWords" / "content" / "2018"

DEFAULT_DAILY_COUNT = 2000

# Map our language codes → FrequencyWords language codes
FREQ_LANG_MAP = {
    "ar": "ar",
    "br": "br",
    "ca": "ca",
    "cs": "cs",
    "da": "da",
    "de": "de",
    "el": "el",
    "eo": "eo",
    "es": "es",
    "et": "et",
    "eu": "eu",
    "fa": "fa",
    "fr": "fr",
    "gl": "gl",
    "he": "he",
    "hr": "hr",
    "hu": "hu",
    "hy": "hy",
    "is": "is",
    "it": "it",
    "ka": "ka",
    "ko": "ko",
    "la": "la",
    "lt": "lt",
    "lv": "lv",
    "mk": "mk",
    "nl": "nl",
    "pt": "pt",
    "ro": "ro",
    "ru": "ru",
    "sk": "sk",
    "sl": "sl",
    "sr": "sr",
    "sv": "sv",
    "tr": "tr",
    "uk": "uk",
    "vi": "vi",
    # Close matches
    "nb": "no",
    "nn": "no",
    "hyw": "hy",
}

# Already high quality — skip
EXCLUDE = {"en", "fi", "pl", "bg", "ko"}  # ko: FrequencyWords uses syllable blocks, 0 matches

# Language names for SOURCES.md
LANG_NAMES = {
    "ar": "Arabic",
    "br": "Breton",
    "ca": "Catalan",
    "cs": "Czech",
    "da": "Danish",
    "de": "German",
    "el": "Greek",
    "eo": "Esperanto",
    "es": "Spanish",
    "et": "Estonian",
    "eu": "Basque",
    "fa": "Persian",
    "fr": "French",
    "gl": "Galician",
    "he": "Hebrew",
    "hr": "Croatian",
    "hu": "Hungarian",
    "hy": "Armenian",
    "hyw": "Western Armenian",
    "is": "Icelandic",
    "it": "Italian",
    "ka": "Georgian",
    "ko": "Korean",
    "la": "Latin",
    "lt": "Lithuanian",
    "lv": "Latvian",
    "mk": "Macedonian",
    "nb": "Norwegian Bokmål",
    "nl": "Dutch",
    "nn": "Norwegian Nynorsk",
    "pt": "Portuguese",
    "ro": "Romanian",
    "ru": "Russian",
    "sk": "Slovak",
    "sl": "Slovenian",
    "sr": "Serbian",
    "sv": "Swedish",
    "tr": "Turkish",
    "uk": "Ukrainian",
    "vi": "Vietnamese",
}


def load_characters(lang: str) -> set[str]:
    """Load valid character set for a language."""
    path = DATA_DIR / lang / f"{lang}_characters.txt"
    if not path.exists():
        return set()
    return {line.strip() for line in path.read_text(encoding="utf-8").splitlines() if line.strip()}


def load_word_list(lang: str) -> list[str]:
    """Load the main word list (read-only)."""
    path = DATA_DIR / lang / f"{lang}_5words.txt"
    if not path.exists():
        return []
    return [line.strip() for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def load_existing_supplement(lang: str) -> list[str]:
    """Load existing supplement words if they exist."""
    path = DATA_DIR / lang / f"{lang}_5words_supplement.txt"
    if not path.exists():
        return []
    return [line.strip() for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def load_frequency_data(freq_code: str) -> dict[str, int]:
    """Load FrequencyWords file. Returns {word: frequency_count}."""
    # Try _50k.txt first, then _full.txt
    for suffix in ["_50k.txt", "_full.txt"]:
        path = FREQ_DIR / freq_code / f"{freq_code}{suffix}"
        if path.exists():
            words = {}
            for line in path.read_text(encoding="utf-8").splitlines():
                parts = line.strip().split()
                if len(parts) >= 2:
                    word = parts[0].lower()
                    try:
                        freq = int(parts[1])
                    except ValueError:
                        continue
                    words[word] = freq
            print(f"  Loaded {len(words)} words from {path.name}")
            return words
    return {}


def is_valid_word(word: str, char_set: set[str]) -> bool:
    """Check if a word is valid for Wordle: 5 chars, lowercase, alphabetic, valid chars."""
    return (
        len(word) == 5
        and word.isalpha()
        and word == word.lower()
        and all(c in char_set for c in word)
    )


def process_language(
    lang: str,
    daily_count: int = DEFAULT_DAILY_COUNT,
    dry_run: bool = False,
    overwrite: bool = False,
) -> dict:
    """Process a single language. Returns result dict."""
    result = {"lang": lang, "status": "ok", "daily_count": 0, "supplement_count": 0}

    freq_code = FREQ_LANG_MAP.get(lang)
    if not freq_code:
        result["status"] = "skipped"
        result["reason"] = "no FrequencyWords mapping"
        return result

    if lang in EXCLUDE:
        result["status"] = "skipped"
        result["reason"] = "excluded (already high quality)"
        return result

    print(f"\n{'='*60}")
    print(f"Processing: {lang} ({LANG_NAMES.get(lang, lang)})")
    print(f"{'='*60}")

    # Load existing data
    existing_words = load_word_list(lang)
    if not existing_words:
        result["status"] = "error"
        result["reason"] = "no word list found"
        return result

    char_set = load_characters(lang)
    if not char_set:
        result["status"] = "error"
        result["reason"] = "no character set found"
        return result

    existing_supplement = load_existing_supplement(lang)
    existing_word_set = set(existing_words)

    print(f"  Existing words: {len(existing_words)}")
    print(f"  Existing supplement: {len(existing_supplement)}")
    print(f"  Character set: {len(char_set)} chars")

    # Load frequency data
    freq_data = load_frequency_data(freq_code)
    if not freq_data:
        result["status"] = "error"
        result["reason"] = f"FrequencyWords file not found for {freq_code}"
        return result

    # Filter frequency data to valid 5-letter words for this language
    valid_freq = {w: f for w, f in freq_data.items() if is_valid_word(w, char_set)}
    print(f"  Valid 5-letter words in FrequencyWords: {len(valid_freq)}")

    # === Generate daily_words.txt ===
    # Score existing words by frequency rank
    scored = []
    unscored = []
    for word in existing_words:
        freq = valid_freq.get(word)
        if freq is not None:
            scored.append((word, freq))
        else:
            unscored.append(word)

    # Sort by frequency descending (higher = more common)
    scored.sort(key=lambda x: -x[1])

    # Take top N
    target = min(daily_count, len(existing_words))
    daily_words = [w for w, _ in scored[:target]]

    # If not enough scored words, pad with unscored
    if len(daily_words) < target:
        remaining = target - len(daily_words)
        daily_words.extend(unscored[:remaining])
        print(
            f"  WARNING: Only {len(scored)} words had frequency data, "
            f"padded with {remaining} unscored words"
        )

    # Sort alphabetically for reviewability
    daily_words.sort()

    # Safety: every daily word must be in existing word list
    invalid_daily = [w for w in daily_words if w not in existing_word_set]
    assert not invalid_daily, f"BUG: daily words not in _5words.txt: {invalid_daily[:5]}"

    print(
        f"  Daily words generated: {len(daily_words)} "
        f"(from {len(scored)} frequency-matched, {len(unscored)} unmatched)"
    )

    # Show top/bottom for review
    if scored:
        top5 = [w for w, _ in scored[:5]]
        bottom5 = [
            w for w, _ in scored[max(0, min(target, len(scored)) - 5) : min(target, len(scored))]
        ]
        print(f"  Top 5 daily words: {top5}")
        print(f"  Bottom 5 daily words: {bottom5}")

    # === Generate supplement ===
    # All valid FrequencyWords words NOT in existing word list
    new_supplement = {
        w for w in valid_freq if w not in existing_word_set and is_valid_word(w, char_set)
    }

    # Merge with existing supplement
    all_supplement = set(existing_supplement) | new_supplement
    # Remove any that are in the main list (safety)
    all_supplement -= existing_word_set
    supplement_sorted = sorted(all_supplement)

    print(f"  New supplement words from FrequencyWords: {len(new_supplement)}")
    print(f"  Total supplement (merged): {len(supplement_sorted)}")

    if supplement_sorted:
        print(f"  Sample supplement: {supplement_sorted[:10]}")

    result["daily_count"] = len(daily_words)
    result["supplement_count"] = len(supplement_sorted)
    result["freq_matched"] = len(scored)
    result["freq_unmatched"] = len(unscored)

    if dry_run:
        result["status"] = "dry_run"
        return result

    # Check for existing files
    daily_path = DATA_DIR / lang / f"{lang}_daily_words.txt"
    supplement_path = DATA_DIR / lang / f"{lang}_5words_supplement.txt"
    sources_path = DATA_DIR / lang / "SOURCES.md"

    if not overwrite:
        existing = []
        if daily_path.exists():
            existing.append(daily_path.name)
        if supplement_path.exists():
            existing.append(supplement_path.name)
        if existing:
            print(f"  WARNING: {', '.join(existing)} already exist, use --overwrite to replace")
            result["status"] = "skipped"
            result["reason"] = f"{', '.join(existing)} already exist"
            return result

    # Write daily_words
    daily_path.write_text("\n".join(daily_words) + "\n", encoding="utf-8")
    print(f"  Wrote {len(daily_words)} words to {daily_path.name}")

    # Write supplement
    supplement_path.write_text("\n".join(supplement_sorted) + "\n", encoding="utf-8")
    print(f"  Wrote {len(supplement_sorted)} words to {supplement_path.name}")

    # Write SOURCES.md (only if it doesn't exist — don't overwrite custom ones like pl)
    if not sources_path.exists():
        lang_name = LANG_NAMES.get(lang, lang)
        sources_md = f"""# {lang_name} Language Data - Sources

## Sources

### 1. Existing Word List
- **Source**: wooorm/dictionaries (Hunspell)
- **URL**: https://github.com/wooorm/dictionaries

### 2. FrequencyWords
- **URL**: https://github.com/hermitdave/FrequencyWords
- **License**: MIT (code), CC-BY-SA 4.0 (content)
- **Usage**: Frequency data for daily word ranking and supplement generation

## Modifications

- `{lang}_daily_words.txt`: Top {len(daily_words)} most common words from existing word list, ranked by OpenSubtitles frequency
- `{lang}_5words_supplement.txt`: {len(supplement_sorted)} additional valid 5-letter words from FrequencyWords corpus

## License

The frequency-derived data in this directory is provided under **CC-BY-SA 4.0**, compatible with the FrequencyWords content license.

## Acknowledgments

- **wooorm/dictionaries** for the base word list
- **Hermit Dave** ([FrequencyWords](https://github.com/hermitdave/FrequencyWords)) for frequency data derived from OpenSubtitles
"""
        sources_path.write_text(sources_md, encoding="utf-8")
        print(f"  Wrote {sources_path.name}")

    return result


def download_frequency_words():
    """Download FrequencyWords repository (shallow clone, sparse checkout)."""
    target = SCRIPT_DIR / ".freq_data"
    repo_dir = target / "FrequencyWords"

    if repo_dir.exists():
        print(f"FrequencyWords already exists at {repo_dir}")
        print("Delete it first if you want to re-download.")
        return

    target.mkdir(parents=True, exist_ok=True)
    print("Cloning FrequencyWords (sparse, shallow)...")

    subprocess.run(
        [
            "git",
            "clone",
            "--depth",
            "1",
            "--filter=blob:none",
            "--sparse",
            "https://github.com/hermitdave/FrequencyWords.git",
        ],
        cwd=target,
        check=True,
    )

    subprocess.run(
        ["git", "sparse-checkout", "set", "content/2018"],
        cwd=repo_dir,
        check=True,
    )

    print(f"\nDownloaded to {repo_dir}")

    # Report available languages
    available = []
    for our_lang, freq_code in sorted(FREQ_LANG_MAP.items()):
        if our_lang in EXCLUDE:
            continue
        freq_dir = repo_dir / "content" / "2018" / freq_code
        if freq_dir.exists():
            available.append(our_lang)

    missing = set(FREQ_LANG_MAP.keys()) - EXCLUDE - set(available)
    print(f"\nAvailable: {len(available)} languages")
    print(f"Missing: {missing or 'none'}")


def batch_process(daily_count: int, dry_run: bool, overwrite: bool):
    """Process all eligible languages."""
    # Priority order: highest impact first
    priority = [
        # Tier 1: Emergency
        "it",
        "el",
        "fr",
        # Tier 2: High impact
        "ar",
        "es",
        "da",
        "ro",
        "ru",
        "sv",
        "de",
        # Tier 3: Medium
        "hr",
        "hu",
        "he",
        "tr",
        "ca",
        "nl",
        "pt",
        "mk",
        "sr",
        "et",
        "uk",
        "sk",
        "nb",
        "nn",
        # Tier 4: Lower traffic
        "cs",
        "sl",
        "eu",
        "fa",
        "ka",
        "ko",
        "lt",
        "lv",
        "is",
        "eo",
        "la",
        "vi",
        "hy",
        "hyw",
        "gl",
        "br",
    ]

    results = []
    for lang in priority:
        result = process_language(lang, daily_count, dry_run, overwrite)
        results.append(result)

    # Summary table
    print(f"\n{'='*80}")
    print(f"{'SUMMARY':^80}")
    print(f"{'='*80}")
    print(
        f"{'Lang':<6} {'Status':<12} {'Daily':<8} {'Supplement':<12} {'Freq Match':<12} {'Notes'}"
    )
    print("-" * 80)

    ok_count = 0
    for r in results:
        lang = r["lang"]
        status = r["status"]
        daily = r.get("daily_count", "-")
        supp = r.get("supplement_count", "-")
        matched = r.get("freq_matched", "-")
        reason = r.get("reason", "")

        if status in ("ok", "dry_run"):
            ok_count += 1
            print(
                f"{lang:<6} {'OK' if status == 'ok' else 'DRY':<12} "
                f"{daily:<8} {supp:<12} {matched:<12}"
            )
        else:
            print(f"{lang:<6} {status:<12} {'-':<8} {'-':<12} {'-':<12} {reason}")

    print(f"\nProcessed: {ok_count}/{len(results)} languages")


def main():
    parser = argparse.ArgumentParser(
        description="FrequencyWords-based word list improvement pipeline"
    )
    subparsers = parser.add_subparsers(dest="command", help="Commands")

    # Download
    subparsers.add_parser("download", help="Download FrequencyWords data")

    # Process single language
    proc = subparsers.add_parser("process", help="Process a single language")
    proc.add_argument("lang", help="Language code (e.g., it, fr, es)")
    proc.add_argument(
        "--daily-count",
        type=int,
        default=DEFAULT_DAILY_COUNT,
        help=f"Target daily word count (default: {DEFAULT_DAILY_COUNT})",
    )
    proc.add_argument("--dry-run", action="store_true", help="Report only, no file writes")
    proc.add_argument("--overwrite", action="store_true", help="Overwrite existing files")

    # Batch process
    batch = subparsers.add_parser("batch", help="Process all eligible languages")
    batch.add_argument(
        "--daily-count",
        type=int,
        default=DEFAULT_DAILY_COUNT,
        help=f"Target daily word count (default: {DEFAULT_DAILY_COUNT})",
    )
    batch.add_argument("--dry-run", action="store_true", help="Report only, no file writes")
    batch.add_argument("--overwrite", action="store_true", help="Overwrite existing files")

    args = parser.parse_args()

    if args.command == "download":
        download_frequency_words()
    elif args.command == "process":
        result = process_language(args.lang, args.daily_count, args.dry_run, args.overwrite)
        if result["status"] == "error":
            print(f"\nERROR: {result.get('reason', 'unknown')}", file=sys.stderr)
            sys.exit(1)
    elif args.command == "batch":
        batch_process(args.daily_count, args.dry_run, args.overwrite)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
