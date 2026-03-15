"""Pipeline orchestrator — run stages on words.json files."""

from __future__ import annotations

import logging

from . import DATA_DIR
from .curate import curate_pool
from .freeze import freeze_history
from .normalize import normalize_pool
from .schema import load_words, save_words
from .score import score_pool
from .source import source_new_words

log = logging.getLogger(__name__)

ALL_STAGES = ["source", "normalize", "score", "curate", "freeze"]


def run_pipeline(
    lang: str,
    stages: list[str] | None = None,
    dry_run: bool = False,
) -> dict:
    """Run the pipeline for a single language.

    Requires words.json to already exist.
    """
    if stages is None:
        stages = ALL_STAGES

    json_path = DATA_DIR / lang / "words.json"
    if not json_path.exists():
        log.warning(f"{lang}: no words.json found.")
        return {"lang": lang, "status": "skipped", "reason": "no words.json"}

    words_data = load_words(json_path)
    config = _load_config(lang)
    result: dict = {"lang": lang, "status": "ok", "stages_run": []}

    # Stage 1: SOURCE — discover new words from external sources
    if "source" in stages:
        words_data = source_new_words(words_data, lang, config)
        result["stages_run"].append("source")

    # Stage 2: NORMALIZE — lowercase, dedup, fix length, final forms
    if "normalize" in stages:
        words_data = normalize_pool(words_data, lang)
        result["stages_run"].append("normalize")

    # Stage 3: SCORE — frequency scores, contamination flags
    if "score" in stages:
        words_data = score_pool(words_data, lang)
        result["stages_run"].append("score")

    # Stage 4: CURATE — rule-based filtering + community overrides
    if "curate" in stages:
        words_data = curate_pool(words_data, lang)
        result["stages_run"].append("curate")

    # Stage 5: FREEZE — compute word history
    if "freeze" in stages:
        words_data = freeze_history(words_data, lang)
        result["stages_run"].append("freeze")

    # Save words.json
    if result["stages_run"] and not dry_run:
        save_words(words_data, json_path)

    # Summary stats
    result["total_words"] = len(words_data.words)
    tier_counts = {}
    for e in words_data.words:
        tier_counts[e.tier] = tier_counts.get(e.tier, 0) + 1
    result["tiers"] = tier_counts

    return result


def _load_config(lang: str) -> dict | None:
    import json

    config_path = DATA_DIR / lang / "language_config.json"
    if config_path.exists():
        return json.loads(config_path.read_text(encoding="utf-8"))
    return None
