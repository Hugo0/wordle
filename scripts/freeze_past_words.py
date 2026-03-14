#!/usr/bin/env python3
"""
Freeze past daily words into curated_schedule.txt files.

This ensures historical daily words are preserved in git and survive disk wipes.
The curated schedule is the highest-priority tier in word selection — it always
wins over daily_words.txt and the main word list.

Safety guarantee: once a word has been served to players, it can never change,
even if we regenerate daily_words.txt or modify the main word list.

Usage:
    python scripts/freeze_past_words.py              # Freeze all languages
    python scripts/freeze_past_words.py es fr de     # Freeze specific languages
    python scripts/freeze_past_words.py --check      # Verify coverage without writing
"""

import argparse
import datetime
import glob
import hashlib
import json
import os
import random
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
DATA_DIR = SCRIPT_DIR.parent / "webapp" / "data"
LANGUAGES_DIR = DATA_DIR / "languages"

# Must match webapp/app.py
MIGRATION_DAY_IDX = 1681


def get_todays_idx():
    """Calculate today's day index (must match webapp/app.py)."""
    n_days = (datetime.date.today() - datetime.date(1970, 1, 1)).days
    return n_days - 18992 + 195


def _word_hash(word, lang_code):
    """Hash a word for consistent hashing (must match webapp/app.py)."""
    key = f"{lang_code}:{word}"
    return hashlib.sha256(key.encode()).hexdigest()


def _day_hash(day_idx, lang_code):
    """Hash a day index for consistent hashing (must match webapp/app.py)."""
    key = f"{lang_code}:day:{day_idx}"
    return hashlib.sha256(key.encode()).hexdigest()


def get_daily_word_consistent_hash(words, blocklist, day_idx, lang_code):
    """Consistent hashing word selection (must match webapp/app.py)."""
    day_h = _day_hash(day_idx, lang_code)
    candidates = []
    for word in words:
        if word not in blocklist:
            candidates.append((_word_hash(word, lang_code), word))
    if not candidates:
        return words[0] if words else ""
    candidates.sort(key=lambda x: x[0])
    for word_h, word in candidates:
        if word_h >= day_h:
            return word
    return candidates[0][1]


def get_daily_word_legacy(words, blocklist, day_idx):
    """Legacy shuffle word selection (must match webapp/app.py)."""
    list_len = len(words)
    if not blocklist:
        return words[day_idx % list_len]
    for offset in range(list_len):
        idx = (day_idx + offset) % list_len
        if words[idx] not in blocklist:
            return words[idx]
    return words[day_idx % list_len]


def load_language_data(lang):
    """Load all word selection data for a language."""
    lang_dir = LANGUAGES_DIR / lang

    # Main word list
    word_file = lang_dir / f"{lang}_5words.txt"
    if not word_file.exists():
        return None
    words = [l.strip() for l in word_file.read_text(encoding="utf-8").splitlines() if l.strip()]

    # Load characters for QA filter
    char_file = lang_dir / f"{lang}_characters.txt"
    if char_file.exists():
        chars = {l.strip() for l in char_file.read_text(encoding="utf-8").splitlines() if l.strip()}
    else:
        chars = set(c for w in words for c in w)

    # QA filter (must match app.py load_words)
    config_file = lang_dir / "language_config.json"
    config = {}
    if config_file.exists():
        config = json.loads(config_file.read_text(encoding="utf-8"))

    use_graphemes = config.get("grapheme_mode") == "true"
    if use_graphemes:
        import grapheme

        words = [w for w in words if w.strip() and grapheme.length(w) == 5]
    else:
        words = [w.lower() for w in words if len(w) == 5 and w.isalpha()]
    words = [w for w in words if all(c in chars for c in w)]

    # Check if list needs shuffling (same logic as app.py)
    if words:
        last_letter = ""
        n_in_order = 0
        for word in words:
            if word[0] <= last_letter:
                n_in_order += 1
            last_letter = word[0]
        if n_in_order / len(words) > 0.8:
            random.seed(42)
            random.shuffle(words)

    # Daily words
    daily_file = lang_dir / f"{lang}_daily_words.txt"
    daily_words = None
    if daily_file.exists():
        daily_words = [
            l.strip() for l in daily_file.read_text(encoding="utf-8").splitlines() if l.strip()
        ]

    # Blocklist
    blocklist_file = lang_dir / f"{lang}_blocklist.txt"
    blocklist = set()
    if blocklist_file.exists():
        for line in blocklist_file.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#"):
                blocklist.add(line.lower())

    # Existing curated schedule
    schedule_file = lang_dir / f"{lang}_curated_schedule.txt"
    existing_schedule = []
    if schedule_file.exists():
        for line in schedule_file.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#"):
                existing_schedule.append(line)

    return {
        "words": words,
        "daily_words": daily_words,
        "blocklist": blocklist,
        "existing_schedule": existing_schedule,
        "config": config,
    }


def compute_word_for_day(lang, data, day_idx):
    """Compute what the daily word SHOULD be for a given day."""
    words = data["words"]
    daily_words = data["daily_words"]
    blocklist = data["blocklist"]
    schedule = data["existing_schedule"]

    if day_idx <= MIGRATION_DAY_IDX:
        return get_daily_word_legacy(words, set(), day_idx)

    schedule_idx = day_idx - MIGRATION_DAY_IDX - 1

    # If existing schedule covers this day, use it
    if schedule and schedule_idx < len(schedule):
        return schedule[schedule_idx]

    # Otherwise compute from daily_words or main list
    if daily_words:
        return get_daily_word_consistent_hash(daily_words, set(), day_idx, lang)
    return get_daily_word_consistent_hash(words, blocklist, day_idx, lang)


def freeze_language(lang, check_only=False):
    """Freeze past daily words for a language. Returns (success, message)."""
    data = load_language_data(lang)
    if data is None:
        return True, f"{lang}: no word list, skipping"

    if not data["words"]:
        return True, f"{lang}: empty word list, skipping"

    todays_idx = get_todays_idx()
    existing = data["existing_schedule"]
    days_needed = todays_idx - MIGRATION_DAY_IDX

    # Compute words for all past days since migration
    schedule = []
    for i in range(days_needed):
        day_idx = MIGRATION_DAY_IDX + 1 + i
        if i < len(existing):
            # Preserve existing schedule entries
            schedule.append(existing[i])
        else:
            word = compute_word_for_day(lang, data, day_idx)
            schedule.append(word)

    new_entries = len(schedule) - len(existing)

    if check_only:
        if new_entries > 0:
            return (
                False,
                f"{lang}: needs {new_entries} new entries (has {len(existing)}/{days_needed})",
            )
        return True, f"{lang}: OK ({len(existing)}/{days_needed} days covered)"

    if new_entries == 0:
        return True, f"{lang}: already up to date ({len(schedule)} days)"

    # Write schedule
    schedule_path = LANGUAGES_DIR / lang / f"{lang}_curated_schedule.txt"

    # Add header comment with hash of current word list for Layer 2 verification
    words_hash = hashlib.sha256("\n".join(data["words"][:100]).encode()).hexdigest()[:12]
    daily_hash = ""
    if data["daily_words"]:
        daily_hash = hashlib.sha256("\n".join(data["daily_words"][:100]).encode()).hexdigest()[:12]

    header = f"# Frozen daily words — DO NOT EDIT MANUALLY\n"
    header += f"# Generated: {datetime.date.today().isoformat()}\n"
    header += f"# word_list_hash: {words_hash}\n"
    if daily_hash:
        header += f"# daily_words_hash: {daily_hash}\n"
    header += f"# days: {len(schedule)} (MIGRATION_DAY_IDX+1 through today)\n"

    content = header + "\n".join(schedule) + "\n"
    schedule_path.write_text(content, encoding="utf-8")

    return True, f"{lang}: froze {len(schedule)} days (+{new_entries} new)"


def main():
    parser = argparse.ArgumentParser(description="Freeze past daily words to curated_schedule.txt")
    parser.add_argument("langs", nargs="*", help="Language codes (default: all)")
    parser.add_argument("--check", action="store_true", help="Check coverage without writing")
    args = parser.parse_args()

    if args.langs:
        langs = args.langs
    else:
        langs = sorted(
            f.split("/")[-1] for f in glob.glob(str(LANGUAGES_DIR / "*")) if os.path.isdir(f)
        )

    print(f"{'Checking' if args.check else 'Freezing'} {len(langs)} languages...\n")

    ok = 0
    issues = 0
    for lang in langs:
        success, msg = freeze_language(lang, check_only=args.check)
        print(f"  {msg}")
        if success:
            ok += 1
        else:
            issues += 1

    print(f"\nDone: {ok} OK, {issues} need attention")
    if issues and args.check:
        sys.exit(1)


if __name__ == "__main__":
    main()
