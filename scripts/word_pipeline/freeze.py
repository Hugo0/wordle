"""Stage 6: FREEZE — Update word history fields from daily word computation."""

from __future__ import annotations

import datetime
import hashlib
import logging

from . import MIGRATION_DAY_IDX
from .schema import WordsYaml

log = logging.getLogger(__name__)


def get_todays_idx() -> int:
    """Calculate today's day index (must match webapp/app.py)."""
    n_days = (datetime.date.today() - datetime.date(1970, 1, 1)).days
    return n_days - 18992 + 195


def _word_hash(word: str, lang: str) -> str:
    return hashlib.sha256(f"{lang}:{word}".encode()).hexdigest()


def _day_hash(day_idx: int, lang: str) -> str:
    return hashlib.sha256(f"{lang}:day:{day_idx}".encode()).hexdigest()


def _consistent_hash_select(words: list[str], blocklist: set[str], day_idx: int, lang: str) -> str:
    """Consistent hashing word selection (must match webapp/app.py)."""
    day_h = _day_hash(day_idx, lang)
    candidates = sorted((_word_hash(w, lang), w) for w in words if w not in blocklist)
    if not candidates:
        return words[0] if words else ""
    for word_h, word in candidates:
        if word_h >= day_h:
            return word
    return candidates[0][1]


def freeze_history(words_yaml: WordsYaml, lang: str) -> WordsYaml:
    """Compute daily words for all past days and set history field per word.

    This replaces the old freeze_past_words.py script.
    """
    todays_idx = get_todays_idx()
    days_since_migration = todays_idx - MIGRATION_DAY_IDX

    if days_since_migration <= 0:
        return words_yaml

    # Build daily pool and blocklist from words.yaml
    daily_pool = sorted(w.word for w in words_yaml.words if w.tier == "daily")
    blocked = {w.word for w in words_yaml.words if w.tier == "blocked"}

    if not daily_pool:
        log.warning(f"{lang}: no daily words, skipping freeze")
        return words_yaml

    # Clear existing history
    word_map = {w.word: w for w in words_yaml.words}
    for entry in words_yaml.words:
        entry.history = []
        entry.scheduled_day = None

    # Precompute sorted candidates once (avoids re-sorting each day)
    candidates = sorted((_word_hash(w, lang), w) for w in daily_pool if w not in blocked)

    # Compute word for each post-migration day
    for i in range(days_since_migration):
        day_idx = MIGRATION_DAY_IDX + 1 + i
        day_h = _day_hash(day_idx, lang)
        word = None
        for word_h, w in candidates:
            if word_h >= day_h:
                word = w
                break
        if word is None and candidates:
            word = candidates[0][1]
        if word and word in word_map:
            word_map[word].history.append(day_idx)

    history_count = sum(1 for e in words_yaml.words if e.history)
    log.info(f"{lang}: froze {days_since_migration} days across {history_count} unique words")

    return words_yaml
