"""Stage 5: FREEZE — Update word history fields from daily word computation."""

from __future__ import annotations

import datetime
import hashlib
import logging
from collections import deque

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


def _ring_select(
    precomputed: list[tuple[str, str]],
    exclude: set[str],
    day_h: str,
) -> str | None:
    """Pick the first word on the hash ring >= day_h, skipping excluded words."""
    first_valid = None
    for word_h, word in precomputed:
        if word in exclude:
            continue
        if first_valid is None:
            first_valid = word  # wraparound fallback
        if word_h >= day_h:
            return word
    return first_valid  # wraparound or None if all excluded


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

    # Precompute sorted (hash, word) pairs once — avoids rehashing per day
    precomputed = sorted((_word_hash(w, lang), w) for w in daily_pool)

    # Track recent picks with a bounded deque
    recent: deque[str] = deque(maxlen=RECENCY_WINDOW)
    recent_set: set[str] = set()

    # Compute word for each post-migration day
    for i in range(days_since_migration):
        day_idx = MIGRATION_DAY_IDX + 1 + i
        day_h = _day_hash(day_idx, lang)

        exclude = blocked | recent_set
        word = _ring_select(precomputed, exclude, day_h)

        if word is None:
            # All words excluded by recency — fall back to full pool
            word = _ring_select(precomputed, blocked, day_h)
        if word is None:
            word = daily_pool[0]

        if word in word_map:
            word_map[word].history.append(day_idx)

        # Update recency window incrementally
        if len(recent) == RECENCY_WINDOW:
            evicted = recent[0]
            # Only remove from set if no other occurrence in window
            recent.append(word)
            if evicted not in recent:
                recent_set.discard(evicted)
        else:
            recent.append(word)
        recent_set.add(word)

    history_count = sum(1 for e in words_data.words if e.history)
    log.info(f"{lang}: froze {days_since_migration} days across {history_count} unique words")

    return words_data
