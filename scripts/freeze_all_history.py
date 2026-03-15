#!/usr/bin/env python3
"""Freeze ALL daily word history into words.json — legacy + post-migration.

One-time script that computes the daily word for every day from day 1 through
today, for all languages, and stores results in the words.json `history` field.

Legacy days (1-1681): Uses production _5words.txt with seed(42) shuffle + modulo.
Post-migration days (1682+): Uses consistent hashing with 60-day recency.

This makes the word archive fully self-contained — no more runtime dependency
on the legacy algorithm or separate word_history.txt files.
"""

from __future__ import annotations

import datetime
import hashlib
import json
import random
from collections import deque
from pathlib import Path

MIGRATION_DAY_IDX = 1681
RECENCY_WINDOW = 60

# Paths
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
DATA_DIR = PROJECT_ROOT / "data" / "languages"
# Production word lists (main branch)
PROD_DATA_DIR = Path("/home/hugo/Projects/wordle/webapp/data/languages")


def get_todays_idx() -> int:
    n_days = (datetime.date.today() - datetime.date(1970, 1, 1)).days
    return n_days - 18992 + 195


# ---------------------------------------------------------------------------
# Legacy algorithm (days 1..MIGRATION_DAY_IDX)
# ---------------------------------------------------------------------------


def load_prod_word_list(lang: str) -> list[str] | None:
    """Load original _5words.txt from production (main branch)."""
    path = PROD_DATA_DIR / lang / f"{lang}_5words.txt"
    if not path.exists():
        return None
    words = [line.strip().lower() for line in path.read_text("utf-8").splitlines() if line.strip()]
    # Filter to valid words (same as production app.py)
    words = [w for w in words if len(w) == 5]
    return words


def maybe_shuffle(words: list[str]) -> list[str]:
    """Replicate production's sort-detection + seed(42) shuffle."""
    if not words:
        return words
    # Detect if list is sorted (80%+ first chars in order)
    n_in_order = 0
    last = ""
    for w in words:
        if w[0] >= last:
            n_in_order += 1
        last = w[0]
    ratio = n_in_order / len(words)
    if ratio > 0.8:
        # List is sorted — shuffle with seed(42)
        shuffled = list(words)
        random.seed(42)
        random.shuffle(shuffled)
        return shuffled
    # Not sorted — use as-is (e.g., English NYT list)
    return list(words)


def legacy_word_for_day(words: list[str], day_idx: int) -> str:
    """Legacy algorithm: words[day_idx % len(words)]."""
    return words[day_idx % len(words)]


# ---------------------------------------------------------------------------
# Post-migration algorithm (days MIGRATION_DAY_IDX+1..today)
# ---------------------------------------------------------------------------


def _word_hash(word: str, lang: str) -> str:
    return hashlib.sha256(f"{lang}:{word}".encode()).hexdigest()


def _day_hash(day_idx: int, lang: str) -> str:
    return hashlib.sha256(f"{lang}:day:{day_idx}".encode()).hexdigest()


def ring_select(precomputed: list[tuple[str, str]], exclude: set[str], day_h: str) -> str | None:
    """Pick the first word on the hash ring >= day_h, skipping excluded."""
    first_valid = None
    for word_h, word in precomputed:
        if word in exclude:
            continue
        if first_valid is None:
            first_valid = word
        if word_h >= day_h:
            return word
    return first_valid


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def freeze_language(lang: str, todays_idx: int) -> dict:
    """Compute full word history for a language and update words.json."""
    json_path = DATA_DIR / lang / "words.json"
    if not json_path.exists():
        return {"lang": lang, "status": "skipped", "reason": "no words.json"}

    with open(json_path, encoding="utf-8") as f:
        data = json.load(f)

    # Build word map
    word_map: dict[str, dict] = {}
    for w in data["words"]:
        word_map[w["word"]] = w
        w["history"] = []  # Clear existing history

    # --- Legacy days (1..MIGRATION_DAY_IDX) ---
    prod_words = load_prod_word_list(lang)
    legacy_count = 0
    if prod_words:
        shuffled = maybe_shuffle(prod_words)
        for day_idx in range(1, MIGRATION_DAY_IDX + 1):
            word = legacy_word_for_day(shuffled, day_idx)
            if word in word_map:
                word_map[word]["history"].append(day_idx)
                legacy_count += 1
            # If word isn't in words.json (removed by curation), we still
            # record nothing — the runtime will use disk cache for these

    # --- Post-migration days (MIGRATION_DAY_IDX+1..today) ---
    # First, load production word_history.txt (authoritative for past days)
    prod_history: list[str] = []
    prod_hist_path = PROD_DATA_DIR / lang / f"{lang}_word_history.txt"
    if prod_hist_path.exists():
        prod_history = [
            line.strip().lower()
            for line in prod_hist_path.read_text("utf-8").splitlines()
            if line.strip() and not line.startswith("#")
        ]

    daily_pool = sorted(w["word"] for w in data["words"] if w["tier"] == "daily")
    blocked = {w["word"] for w in data["words"] if w["tier"] == "blocked"}

    post_count = 0
    prod_used = 0

    if daily_pool or prod_history:
        # Precompute hash ring for days beyond word_history coverage
        precomputed = sorted((_word_hash(w, lang), w) for w in daily_pool) if daily_pool else []

        # Recency tracking (seeded from production history for continuity)
        recent: deque[str] = deque(maxlen=RECENCY_WINDOW)
        recent_set: set[str] = set()

        for day_idx in range(MIGRATION_DAY_IDX + 1, todays_idx + 1):
            hist_idx = day_idx - MIGRATION_DAY_IDX - 1

            if hist_idx < len(prod_history):
                # Use production word_history (what users actually saw)
                word = prod_history[hist_idx]
                prod_used += 1
            elif precomputed:
                # Beyond production history — use consistent hash with recency
                day_h = _day_hash(day_idx, lang)
                exclude = blocked | recent_set
                word = ring_select(precomputed, exclude, day_h)
                if word is None:
                    word = ring_select(precomputed, blocked, day_h)
                if word is None:
                    word = daily_pool[0]
            else:
                continue

            if word in word_map:
                word_map[word]["history"].append(day_idx)
                post_count += 1

            # Update recency window (regardless of source)
            if len(recent) == RECENCY_WINDOW:
                evicted = recent[0]
                recent.append(word)
                if evicted not in recent:
                    recent_set.discard(evicted)
            else:
                recent.append(word)
            recent_set.add(word)

    # Write back
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2, sort_keys=False)
        f.write("\n")

    return {
        "lang": lang,
        "status": "ok",
        "legacy_days": legacy_count,
        "post_migration_days": post_count,
        "total_days": legacy_count + post_count,
        "had_prod_wordlist": prod_words is not None,
    }


def main():
    todays_idx = get_todays_idx()
    print(f"Today: day {todays_idx}")
    print(f"Legacy days: 1-{MIGRATION_DAY_IDX} ({MIGRATION_DAY_IDX} days)")
    print(
        f"Post-migration days: {MIGRATION_DAY_IDX + 1}-{todays_idx} ({todays_idx - MIGRATION_DAY_IDX} days)"
    )
    print()

    langs = sorted(d.name for d in DATA_DIR.iterdir() if d.is_dir())
    print(f"Processing {len(langs)} languages...\n")

    results = []
    for lang in langs:
        result = freeze_language(lang, todays_idx)
        results.append(result)
        status = result["status"]
        if status == "ok":
            print(
                f"  {lang}: {result['total_days']} days "
                f"(legacy={result['legacy_days']}, post={result['post_migration_days']}) "
                f"{'✓' if result['had_prod_wordlist'] else '⚠ no prod wordlist'}"
            )
        else:
            print(f"  {lang}: {status} ({result.get('reason', '')})")

    # Summary
    ok = [r for r in results if r["status"] == "ok"]
    no_prod = [r for r in ok if not r["had_prod_wordlist"]]
    print(f"\n{'=' * 60}")
    print(f"Done: {len(ok)}/{len(results)} languages processed")
    print(f"Total legacy days frozen: {sum(r['legacy_days'] for r in ok)}")
    print(f"Total post-migration days frozen: {sum(r['post_migration_days'] for r in ok)}")
    if no_prod:
        print(f"\n⚠ {len(no_prod)} languages had no production wordlist (legacy days not frozen):")
        for r in no_prod:
            print(f"  {r['lang']}")


if __name__ == "__main__":
    main()
