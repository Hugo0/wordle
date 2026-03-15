"""Extract daily-tier words from words.json for LLM curation review."""

from __future__ import annotations

import json
import logging
from pathlib import Path

from . import DATA_DIR, SCRIPT_DIR
from .schema import load_words

log = logging.getLogger(__name__)

REVIEW_DIR = SCRIPT_DIR / ".curation_review"


def extract_daily(lang: str) -> Path:
    """Extract daily-tier words to a simple text file for review.

    Output: .curation_review/{lang}_daily.txt — one word per line.
    Returns the output path.
    """
    json_path = DATA_DIR / lang / "words.json"
    if not json_path.exists():
        raise FileNotFoundError(f"No words.json for {lang}")

    words_data = load_words(json_path)
    daily = [w.word for w in words_data.words if w.tier == "daily"]

    REVIEW_DIR.mkdir(parents=True, exist_ok=True)
    out_path = REVIEW_DIR / f"{lang}_daily.txt"
    out_path.write_text("\n".join(sorted(daily)) + "\n", encoding="utf-8")

    log.info(f"{lang}: extracted {len(daily)} daily words → {out_path.name}")
    return out_path


def extract_all(langs: list[str]) -> dict[str, Path]:
    """Extract daily words for multiple languages."""
    results = {}
    for lang in langs:
        try:
            results[lang] = extract_daily(lang)
        except FileNotFoundError as e:
            log.warning(str(e))
    return results


def merge_curation(lang: str) -> int:
    """Merge LLM curation results back into words.json.

    Reads: .curation_review/{lang}_curation.json
    Format: [{"word": "...", "tier": "daily|valid|reject", "confidence": 1-5, "reason": "..."}]
    """
    from .schema import LLMCuration, save_words

    results_path = REVIEW_DIR / f"{lang}_curation.json"
    if not results_path.exists():
        log.warning(f"{lang}: no curation results found at {results_path}")
        return 0

    results = json.loads(results_path.read_text(encoding="utf-8"))
    if not results:
        return 0

    # Load words.json
    json_path = DATA_DIR / lang / "words.json"
    words_data = load_words(json_path)
    word_map = {w.word: w for w in words_data.words}

    # Apply results
    applied = 0
    changed = 0
    for item in results:
        word = item.get("word", "")
        if word not in word_map:
            continue

        entry = word_map[word]
        if entry.reviewed:
            continue  # Never override human reviews

        # Set LLM field
        entry.llm = LLMCuration(
            tier=item.get("tier", "daily"),
            confidence=item.get("confidence", 3),
            reason=item.get("reason", ""),
        )
        applied += 1

        # Apply tier change if confident enough
        old_tier = entry.tier
        if entry.llm.confidence >= 3:
            if entry.llm.tier == "reject":
                entry.tier = "blocked"
            elif entry.llm.tier == "valid":
                entry.tier = "valid"
            # "daily" → keep as daily

        if entry.tier != old_tier:
            changed += 1

    save_words(words_data, json_path)
    log.info(f"{lang}: applied {applied} curation results, {changed} tier changes")
    return changed
