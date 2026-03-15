"""Stage 5: FREEZE — Update word history fields from daily word computation."""

from __future__ import annotations

import datetime
import hashlib
import logging

from . import MIGRATION_DAY_IDX
from .schema import WordsData

log = logging.getLogger(__name__)

RECENCY_WINDOW = 60


def get_todays_idx() -> int:
    """Calculate today's day index (must match server/lib/day-index.ts)."""
    n_days = (datetime.date.today() - datetime.date(1970, 1, 1)).days
    return n_days - 18992 + 195


def _word_hash(word: str, lang: str) -> str:
    return hashlib.sha256(f"{lang}:{word}".encode()).hexdigest()


def _day_hash(day_idx: int, lang: str) -> str:
    return hashlib.sha256(f"{lang}:day:{day_idx}".encode()).hexdigest()


def _consistent_hash_select(
    words: list[str], exclude: set[str], day_idx: int, lang: str
) -> str:
    """Consistent hashing word selection with exclusion set."""
    day_h = _day_hash(day_idx, lang)
    candidates = sorted((_word_hash(w, lang), w) for w in words if w not in exclude)
    if not candidates:
        # Safety: if all excluded, fall back to full pool
        candidates = sorted((_word_hash(w, lang), w) for w in words)
    if not candidates:
        return words[0] if words else ""
    for word_h, word in candidates:
        if word_h >= day_h:
            return word
    return candidates[0][1]


def freeze_history(words_data: WordsData, lang: str) -> WordsData:
    """Compute daily words for all past days and record in history field.

    Uses 60-day recency window: a word picked on day X won't be picked
    again until day X+60 (unless the pool is exhausted).
    """
    todays_idx = get_todays_idx()
    days_since_migration = todays_idx - MIGRATION_DAY_IDX

    if days_since_migration <= 0:
        return words_data

    # Build daily pool and blocklist from words.json
    daily_pool = sorted(w.word for w in words_data.words if w.tier == "daily")
    blocked = {w.word for w in words_data.words if w.tier == "blocked"}

    if not daily_pool:
        log.warning(f"{lang}: no daily words, skipping freeze")
        return words_data

    # Clear existing history
    word_map = {w.word: w for w in words_data.words}
    for entry in words_data.words:
        entry.history = []

    # Track recent picks for recency filtering
    recent_picks: list[str] = []  # ordered list of picks (most recent last)

    # Compute word for each post-migration day
    for i in range(days_since_migration):
        day_idx = MIGRATION_DAY_IDX + 1 + i

        # Build exclusion set: blocked + recently picked
        recent_set = set(recent_picks[-RECENCY_WINDOW:])
        exclude = blocked | recent_set

        word = _consistent_hash_select(daily_pool, exclude, day_idx, lang)

        if word in word_map:
            word_map[word].history.append(day_idx)

        recent_picks.append(word)

    history_count = sum(1 for e in words_data.words if e.history)
    log.info(f"{lang}: froze {days_since_migration} days across {history_count} unique words")

    return words_data
