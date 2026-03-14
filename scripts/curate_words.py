#!/usr/bin/env python3
"""
Word list curation helper script.

This script helps with:
1. Extracting next N words for review
2. Checking blocklist coverage
3. Viewing curation status

IMPORTANT: Blocklists are applied at RUNTIME in webapp/app.py, not by modifying
word list files. This preserves shuffle order for backwards compatibility.
Blocklisted words are still valid guesses, just skipped as daily words.

Usage:
    python scripts/curate_words.py extract ar 365    # Extract next 365 Arabic words
    python scripts/curate_words.py status ar         # Show curation status
    python scripts/curate_words.py check-blocklist ar  # Check blocklist coverage
    python scripts/curate_words.py backup ar         # Backup word list
"""

import argparse
import datetime
import os
import shutil
from pathlib import Path

# Paths
SCRIPT_DIR = Path(__file__).parent
DATA_DIR = SCRIPT_DIR.parent / "webapp" / "data" / "languages"


def get_todays_idx(date: datetime.date = None) -> int:
    """Calculate the word index for a given date (matches webapp/app.py)."""
    if date is None:
        date = datetime.datetime.utcnow().date()
    if isinstance(date, datetime.date) and not isinstance(date, datetime.datetime):
        dt = datetime.datetime.combine(date, datetime.time())
    else:
        dt = date
    epoch = datetime.datetime(1970, 1, 1)
    n_days = (dt - epoch).days
    idx = n_days - 18992 + 195
    return idx


def load_word_list(lang: str) -> list[str]:
    """Load word list for a language."""
    path = DATA_DIR / lang / f"{lang}_5words.txt"
    if not path.exists():
        raise FileNotFoundError(f"Word list not found: {path}")
    return path.read_text().strip().split("\n")


def save_word_list(lang: str, words: list[str]) -> None:
    """Save word list for a language."""
    path = DATA_DIR / lang / f"{lang}_5words.txt"
    path.write_text("\n".join(words) + "\n")
    print(f"Saved {len(words)} words to {path}")


def extract_next_words(lang: str, num_days: int = 365) -> None:
    """Extract next N words for review."""
    words = load_word_list(lang)
    today = datetime.date.today()
    start_idx = get_todays_idx(today)

    print(f"Language: {lang}")
    print(f"Total words: {len(words)}")
    print(f"Today's date: {today}")
    print(f"Current index: {start_idx}")
    print(f"Extracting words {start_idx} to {start_idx + num_days - 1}")
    print()

    output_file = f"{lang}_next{num_days}_for_review.txt"
    with open(output_file, "w") as f:
        for i in range(num_days):
            idx = (start_idx + i) % len(words)
            word = words[idx]
            f.write(f"{start_idx + i}: {word}\n")

    print(f"Wrote {num_days} words to {output_file}")
    print(f"Review the file and identify words to remove.")


def remove_words(lang: str, words_to_remove: list[str]) -> None:
    """Remove specific words from the word list."""
    words = load_word_list(lang)
    original_count = len(words)

    # Find and remove words
    removed = []
    not_found = []
    for word in words_to_remove:
        word = word.strip().lower()
        if word in words:
            words.remove(word)
            removed.append(word)
        else:
            not_found.append(word)

    if removed:
        save_word_list(lang, words)
        print(f"Removed {len(removed)} words: {removed[:10]}{'...' if len(removed) > 10 else ''}")
        print(f"Word count: {original_count} -> {len(words)}")

    if not_found:
        print(f"Not found: {not_found}")


def backup_word_list(lang: str) -> None:
    """Create a timestamped backup of the word list."""
    words = load_word_list(lang)
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = DATA_DIR / lang / f"{lang}_5words_backup_{timestamp}.txt"
    backup_path.write_text("\n".join(words) + "\n")
    print(f"Backed up {len(words)} words to {backup_path}")


def show_status(lang: str) -> None:
    """Show curation status for a language."""
    words = load_word_list(lang)
    today = datetime.date.today()
    start_idx = get_todays_idx(today)

    print(f"Language: {lang}")
    print(f"Total words: {len(words)}")
    print(f"Current index: {start_idx}")
    print(f"Days until cycle repeats: {len(words) - (start_idx % len(words))}")
    print()

    # Check for blocklist
    blocklist_path = DATA_DIR / lang / f"{lang}_blocklist.txt"
    if blocklist_path.exists():
        blocklist = load_blocklist(lang)
        print(f"Blocklist: {len(blocklist)} words")
    else:
        print("Blocklist: None")
    print()

    # Check for upcoming issues
    print("Next 10 words:")
    for i in range(10):
        idx = (start_idx + i) % len(words)
        date = today + datetime.timedelta(days=i)
        print(f"  {date}: {words[idx]}")


def load_blocklist(lang: str) -> set[str]:
    """Load blocklist for a language."""
    path = DATA_DIR / lang / f"{lang}_blocklist.txt"
    if not path.exists():
        return set()

    blocklist = set()
    for line in path.read_text().strip().split("\n"):
        line = line.strip()
        if line and not line.startswith("#"):
            blocklist.add(line.lower())
    return blocklist


def check_blocklist(lang: str) -> None:
    """Check how many words in word list would be filtered by blocklist.

    NOTE: Blocklists are applied at RUNTIME in webapp/app.py, not by modifying
    word list files. This preserves shuffle order for backwards compatibility.
    Blocklisted words are still valid guesses, just skipped as daily words.
    """
    blocklist = load_blocklist(lang)
    if not blocklist:
        print(f"No blocklist found for {lang}")
        return

    words = load_word_list(lang)

    # Count blocked words
    blocked_in_list = [w for w in words if w in blocklist]

    print(f"Language: {lang}")
    print(f"Total words: {len(words)}")
    print(f"Blocklist entries: {len(blocklist)}")
    print(f"Words in list that match blocklist: {len(blocked_in_list)}")
    print(f"Effective daily word pool: {len(words) - len(blocked_in_list)}")
    print()
    print("NOTE: Blocklist is applied at RUNTIME in app.py.")
    print("Word list files should NOT be modified to preserve shuffle order.")


def main():
    parser = argparse.ArgumentParser(description="Word list curation helper")
    subparsers = parser.add_subparsers(dest="command", help="Commands")

    # Extract command
    extract_parser = subparsers.add_parser("extract", help="Extract next N words for review")
    extract_parser.add_argument("lang", help="Language code (e.g., ar, tr, bg)")
    extract_parser.add_argument("days", type=int, nargs="?", default=365, help="Number of days to extract")

    # Remove command
    remove_parser = subparsers.add_parser("remove", help="Remove words from list")
    remove_parser.add_argument("lang", help="Language code")
    remove_parser.add_argument("words", nargs="+", help="Words to remove")

    # Backup command
    backup_parser = subparsers.add_parser("backup", help="Backup word list")
    backup_parser.add_argument("lang", help="Language code")

    # Status command
    status_parser = subparsers.add_parser("status", help="Show curation status")
    status_parser.add_argument("lang", help="Language code")

    # Check blocklist command
    blocklist_parser = subparsers.add_parser("check-blocklist", help="Check blocklist coverage (runtime filtering)")
    blocklist_parser.add_argument("lang", help="Language code")

    args = parser.parse_args()

    if args.command == "extract":
        extract_next_words(args.lang, args.days)
    elif args.command == "remove":
        remove_words(args.lang, args.words)
    elif args.command == "backup":
        backup_word_list(args.lang)
    elif args.command == "status":
        show_status(args.lang)
    elif args.command == "check-blocklist":
        check_blocklist(args.lang)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
