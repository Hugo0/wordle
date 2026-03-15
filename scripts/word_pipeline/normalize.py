"""Stage 2: NORMALIZE — Character normalization, dedup, length computation."""

from __future__ import annotations

import json
import logging

from . import DATA_DIR
from .schema import WordsYaml

log = logging.getLogger(__name__)

GRAPHEME_LANGS = {"hi", "bn", "mr", "pa"}


def normalize_pool(words_yaml: WordsYaml, lang: str) -> WordsYaml:
    """Normalize all word entries: lowercase, dedup, fix length, apply final forms."""
    config = _load_config(lang)
    final_form_map = config.get("final_form_map", {})
    use_graphemes = config.get("grapheme_mode") == "true"

    seen: set[str] = set()
    deduped = []
    normalized_count = 0

    for entry in words_yaml.words:
        # Lowercase
        word = entry.word.lower()

        # Apply final form normalization (e.g., Greek σ→ς at word end)
        if final_form_map and word[-1:] in final_form_map:
            word = word[:-1] + final_form_map[word[-1]]

        # Dedup
        if word in seen:
            continue
        seen.add(word)

        # Update entry
        if word != entry.word:
            entry.word = word
            normalized_count += 1

        # Recompute length
        if use_graphemes:
            import grapheme

            entry.length = grapheme.length(word)
        else:
            entry.length = len(word)

        deduped.append(entry)

    removed = len(words_yaml.words) - len(deduped)
    if removed:
        log.info(f"{lang}: removed {removed} duplicates")
    if normalized_count:
        log.info(f"{lang}: normalized {normalized_count} words")

    words_yaml.words = deduped
    return words_yaml


def _load_config(lang: str) -> dict:
    config_path = DATA_DIR / lang / "language_config.json"
    if config_path.exists():
        return json.loads(config_path.read_text(encoding="utf-8"))
    return {}
