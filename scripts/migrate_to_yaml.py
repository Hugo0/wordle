#!/usr/bin/env python3
"""
Migrate existing word data files to words.yaml per language.

Reads: _5words.txt, _daily_words.txt, _5words_supplement.txt, _blocklist.txt,
       _word_history.txt, _curated_schedule.txt
Writes: words.yaml

Usage:
    uv run python scripts/migrate_to_yaml.py es          # single language
    uv run python scripts/migrate_to_yaml.py --all       # all languages
    uv run python scripts/migrate_to_yaml.py --all --dry-run
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
from datetime import UTC, datetime
from pathlib import Path

import grapheme

# Add parent dir so we can import word_pipeline
sys.path.insert(0, str(Path(__file__).parent))

from word_pipeline.schema import WordEntry, WordsYaml, save_words_yaml

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
log = logging.getLogger(__name__)

SCRIPT_DIR = Path(__file__).parent
DATA_DIR = SCRIPT_DIR.parent / "webapp" / "data" / "languages"
MIGRATION_DAY_IDX = 1681  # Jan 25, 2026

# Pre-curated languages: all main words are daily-quality, human-reviewed
PRE_CURATED = {"en", "fi"}

# Grapheme-mode languages: word length counted by grapheme clusters
GRAPHEME_LANGS = {"hi", "bn", "mr", "pa"}


def read_lines(path: Path) -> list[str]:
    """Read non-empty, non-comment lines from a text file."""
    if not path.exists():
        return []
    lines = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#"):
            lines.append(line)
    return lines


def word_length(word: str, lang: str) -> int:
    """Compute word length, grapheme-aware for Indic scripts."""
    if lang in GRAPHEME_LANGS:
        return grapheme.length(word)
    return len(word)


def load_language_config(lang_dir: Path) -> dict:
    """Load language_config.json if it exists."""
    config_path = lang_dir / "language_config.json"
    if config_path.exists():
        return json.loads(config_path.read_text(encoding="utf-8"))
    return {}


def get_wordfreq_score(word: str, lang: str) -> float:
    """Get wordfreq Zipf frequency, returning 0.0 if unavailable."""
    try:
        from wordfreq import zipf_frequency

        score = zipf_frequency(word, lang)
        return round(score, 2) if score > 0 else 0.0
    except Exception:
        return 0.0


def migrate_language(lang: str, dry_run: bool = False, skip_freq: bool = False) -> dict:
    """Convert existing text files to words.yaml for one language.

    Returns a summary dict with counts.
    """
    lang_dir = DATA_DIR / lang

    if not lang_dir.exists():
        log.warning(f"{lang}: directory not found, skipping")
        return {"lang": lang, "status": "skipped", "reason": "no directory"}

    # Load existing files
    main_words_path = lang_dir / f"{lang}_5words.txt"
    if not main_words_path.exists():
        log.warning(f"{lang}: no _5words.txt, skipping")
        return {"lang": lang, "status": "skipped", "reason": "no word list"}

    main_words = read_lines(main_words_path)
    daily_words = set(read_lines(lang_dir / f"{lang}_daily_words.txt"))
    supplement_words = read_lines(lang_dir / f"{lang}_5words_supplement.txt")
    blocklist = set(read_lines(lang_dir / f"{lang}_blocklist.txt"))
    word_history = read_lines(lang_dir / f"{lang}_word_history.txt")
    curated_schedule = read_lines(lang_dir / f"{lang}_curated_schedule.txt")

    main_set = set(main_words)

    # Build word history map: word → [day_idx, ...]
    history_map: dict[str, list[int]] = {}
    for i, w in enumerate(word_history):
        day_idx = MIGRATION_DAY_IDX + 1 + i
        history_map.setdefault(w, []).append(day_idx)

    # Build curated schedule map: word → scheduled_day
    schedule_map: dict[str, int] = {}
    for i, w in enumerate(curated_schedule):
        day_idx = MIGRATION_DAY_IDX + 1 + i
        schedule_map[w] = day_idx

    # Determine tier per word
    is_pre_curated = lang in PRE_CURATED
    all_words_ordered: list[str] = []
    seen: set[str] = set()

    # Main words first (preserves original order)
    for w in main_words:
        wl = w.lower()
        if wl not in seen:
            all_words_ordered.append(wl)
            seen.add(wl)

    # Then supplement words
    for w in supplement_words:
        wl = w.lower()
        if wl not in seen:
            all_words_ordered.append(wl)
            seen.add(wl)

    # Also include any history words not in main/supplement (shouldn't happen, but safety)
    for w in word_history:
        wl = w.lower()
        if wl not in seen:
            all_words_ordered.append(wl)
            seen.add(wl)

    # Check if wordfreq supports this language
    wordfreq_available = False
    if not skip_freq:
        try:
            from wordfreq import zipf_frequency

            zipf_frequency("test", lang)
            wordfreq_available = True
        except Exception:
            pass

    entries: list[WordEntry] = []
    supplement_set = set(supplement_words)
    for word in all_words_ordered:
        in_main = word in main_set
        in_daily = word in daily_words
        in_blocklist = word in blocklist

        # Determine tier
        if in_blocklist:
            tier = "blocked"
        elif (is_pre_curated and in_main) or in_daily:
            tier = "daily"
        elif in_main:
            tier = "daily" if not daily_words else "valid"
        else:
            tier = "valid"

        # Frequency
        freq = 0.0
        if wordfreq_available:
            freq = get_wordfreq_score(word, lang)

        # Sources
        sources = []
        if in_main:
            sources.append("main_list")
        if word in supplement_set:
            sources.append("supplement")

        entry = WordEntry(
            word=word,
            length=word_length(word, lang),
            tier=tier,
            frequency=freq,
            sources=sources,
            reviewed=is_pre_curated and in_main,
            history=history_map.get(word, []),
            scheduled_day=schedule_map.get(word),
        )
        entries.append(entry)

    # Build metadata
    config = load_language_config(lang_dir)
    metadata = {
        "language_code": lang,
        "language_name": config.get("name", lang),
        "last_pipeline_run": datetime.now(UTC).isoformat(),
        "migrated_from": "text_files",
        "sources": [
            {"name": "main_list", "type": "community", "file": f"{lang}_5words.txt"},
        ],
    }
    if supplement_words:
        metadata["sources"].append(
            {"name": "supplement", "type": "pipeline", "file": f"{lang}_5words_supplement.txt"}
        )
    if daily_words:
        metadata["sources"].append(
            {"name": "daily_words", "type": "pipeline", "file": f"{lang}_daily_words.txt"}
        )

    words_yaml = WordsYaml(metadata=metadata, words=entries)

    # Summary
    tier_counts = {}
    for e in entries:
        tier_counts[e.tier] = tier_counts.get(e.tier, 0) + 1
    history_count = sum(1 for e in entries if e.history)

    summary = {
        "lang": lang,
        "status": "dry_run" if dry_run else "migrated",
        "total_words": len(entries),
        "tiers": tier_counts,
        "with_history": history_count,
        "with_frequency": sum(1 for e in entries if e.frequency > 0),
        "reviewed": sum(1 for e in entries if e.reviewed),
    }

    if not dry_run:
        output_path = lang_dir / "words.yaml"
        save_words_yaml(words_yaml, output_path)
        log.info(f"{lang}: wrote {len(entries)} words to {output_path.name}")
    else:
        log.info(f"{lang}: would write {len(entries)} words (dry run)")

    return summary


def main():
    parser = argparse.ArgumentParser(description="Migrate word data to words.yaml")
    parser.add_argument("langs", nargs="*", help="Language codes to migrate")
    parser.add_argument("--all", action="store_true", help="Migrate all languages")
    parser.add_argument("--dry-run", action="store_true", help="Preview without writing")
    parser.add_argument("--skip-freq", action="store_true", help="Skip wordfreq lookups (faster)")
    args = parser.parse_args()

    if args.all:
        langs = sorted(d.name for d in DATA_DIR.iterdir() if d.is_dir())
    elif args.langs:
        langs = args.langs
    else:
        parser.print_help()
        sys.exit(1)

    log.info(f"Migrating {len(langs)} language(s)...")

    results = []
    for lang in langs:
        result = migrate_language(lang, dry_run=args.dry_run, skip_freq=args.skip_freq)
        results.append(result)

    # Print summary
    print(
        f"\n{'Lang':<6} {'Status':<10} {'Total':>7} {'Daily':>7} {'Valid':>7} {'Block':>7} {'Freq':>7} {'Hist':>5}"
    )
    print("-" * 65)
    for r in results:
        if r["status"] == "skipped":
            print(f"{r['lang']:<6} {'SKIP':<10} {r.get('reason', '')}")
            continue
        t = r["tiers"]
        print(
            f"{r['lang']:<6} {'OK':<10} {r['total_words']:>7} "
            f"{t.get('daily', 0):>7} {t.get('valid', 0):>7} {t.get('blocked', 0):>7} "
            f"{r['with_frequency']:>7} {r['with_history']:>5}"
        )

    total = sum(r["total_words"] for r in results if r["status"] != "skipped")
    migrated = sum(1 for r in results if r["status"] != "skipped")
    print(f"\nTotal: {total:,} words across {migrated} languages")


if __name__ == "__main__":
    main()
