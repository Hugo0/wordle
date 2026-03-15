"""Stage 4: CURATE — Rule-based filtering + community overrides.

LLM curation is done manually via Claude Code sub-agents editing words.json directly.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path

from . import DATA_DIR, SCRIPT_DIR
from .schema import WordsData

log = logging.getLogger(__name__)

PROFANITY_PATH = SCRIPT_DIR / "profanity_blocklist.txt"
NAMES_PATH = SCRIPT_DIR / "common_names.txt"


def _load_set_file(path: Path) -> set[str]:
    """Load a line-based set file (comments and blanks ignored)."""
    if not path.exists():
        return set()
    result = set()
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip().lower()
        if line and not line.startswith("#"):
            result.add(line)
    return result


def curate_rules(words_data: WordsData, lang: str) -> WordsData:
    """Apply rule-based curation: profanity, names, flags → tier adjustments.

    Does NOT modify words with reviewed=True.
    """
    profanity = _load_set_file(PROFANITY_PATH)
    names = _load_set_file(NAMES_PATH)

    for entry in words_data.words:
        if entry.reviewed:
            continue

        # Profanity check
        if entry.word in profanity:
            entry.tier = "blocked"
            entry.flags.profanity = True

        # Name check
        if entry.word in names:
            entry.tier = "blocked"
            entry.flags.proper_noun = True

    return words_data


def apply_community_overrides(words_data: WordsData, lang: str) -> WordsData:
    """Apply community overrides from contribute/overrides.json."""
    overrides_path = DATA_DIR / lang / "contribute" / "overrides.json"
    if not overrides_path.exists():
        return words_data

    overrides = json.loads(overrides_path.read_text(encoding="utf-8"))
    if not overrides:
        return words_data

    word_map = {e.word: e for e in words_data.words}
    applied = 0
    for override in overrides:
        word = override.get("word", "")
        if word in word_map:
            entry = word_map[word]
            if "tier" in override:
                entry.tier = override["tier"]
            if override.get("reviewed"):
                entry.reviewed = True
            applied += 1

    if applied:
        log.info(f"{lang}: applied {applied} community overrides")
    return words_data


def curate_pool(words_data: WordsData, lang: str, **_kwargs) -> WordsData:
    """Curation pipeline: rules → community overrides."""
    words_data = curate_rules(words_data, lang)
    words_data = apply_community_overrides(words_data, lang)
    return words_data
