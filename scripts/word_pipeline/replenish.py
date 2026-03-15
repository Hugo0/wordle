"""Replenish daily word pools by promoting top valid-tier words.

After LLM curation removes words from the daily pool, this stage
promotes the highest-frequency valid words back to daily to maintain
a healthy pool size (~2000 words).
"""

from __future__ import annotations

import logging

from . import DATA_DIR
from .schema import WordsYaml, load_words_yaml, save_words_yaml

log = logging.getLogger(__name__)

TARGET_DAILY = 2000


def get_candidates(words_yaml: WordsYaml) -> list:
    """Get valid-tier words sorted by frequency (best candidates first).

    Excludes words with flags (profanity, foreign, proper_noun, phrase)
    and words that were previously demoted by LLM curation.
    """
    candidates = []
    for entry in words_yaml.words:
        if entry.tier != "valid":
            continue
        # Skip words previously reviewed by LLM and demoted
        if entry.llm is not None:
            continue
        # Skip words with any flags
        if entry.flags.any_set():
            continue
        candidates.append(entry)

    # Sort by frequency descending (highest = most common)
    candidates.sort(key=lambda e: -e.frequency)
    return candidates


def replenish_daily(
    words_yaml: WordsYaml,
    lang: str,
    target: int = TARGET_DAILY,
) -> tuple[WordsYaml, list[str]]:
    """Promote top valid words to daily tier to reach target pool size.

    Returns (updated WordsYaml, list of promoted words).
    """
    current_daily = sum(1 for w in words_yaml.words if w.tier == "daily")
    needed = target - current_daily

    if needed <= 0:
        log.info(f"{lang}: daily pool already at {current_daily} (target {target})")
        return words_yaml, []

    candidates = get_candidates(words_yaml)
    if not candidates:
        log.warning(f"{lang}: no valid candidates to promote (need {needed})")
        return words_yaml, []

    # Promote top N candidates
    promoted = []
    for entry in candidates[:needed]:
        entry.tier = "daily"
        promoted.append(entry.word)

    log.info(
        f"{lang}: promoted {len(promoted)} words to daily "
        f"({current_daily} → {current_daily + len(promoted)}, target {target})"
    )

    return words_yaml, promoted


def extract_for_review(words_yaml: WordsYaml, words: list[str], lang: str) -> None:
    """Write promoted words to a review file for LLM curation check."""
    review_dir = DATA_DIR.parent.parent / "scripts" / ".curation_review"
    review_dir.mkdir(parents=True, exist_ok=True)
    out_path = review_dir / f"{lang}_promoted.txt"
    out_path.write_text("\n".join(sorted(words)) + "\n", encoding="utf-8")
    log.info(f"{lang}: wrote {len(words)} promoted words → {out_path.name}")
