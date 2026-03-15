"""Pipeline orchestrator — run stages on words.yaml files."""

from __future__ import annotations

import logging

from . import DATA_DIR
from .compile import compile_language, save_compiled, validate_pool_depth
from .curate import curate_pool
from .freeze import freeze_history
from .normalize import normalize_pool
from .schema import load_words_yaml, save_words_yaml
from .score import score_pool
from .source import source_new_words

log = logging.getLogger(__name__)

ALL_STAGES = ["source", "normalize", "score", "curate", "compile", "freeze"]


def run_pipeline(
    lang: str,
    stages: list[str] | None = None,
    use_llm: bool = False,
    llm_model: str = "claude-sonnet-4-20250514",
    llm_batch_size: int = 50,
    llm_max_batches: int | None = None,
    dry_run: bool = False,
) -> dict:
    """Run the pipeline for a single language.

    Requires words.yaml to already exist (run migrate_to_yaml.py first).
    """
    if stages is None:
        stages = ALL_STAGES

    yaml_path = DATA_DIR / lang / "words.yaml"
    if not yaml_path.exists():
        log.warning(f"{lang}: no words.yaml found. Run migrate_to_yaml.py first.")
        return {"lang": lang, "status": "skipped", "reason": "no words.yaml"}

    words_yaml = load_words_yaml(yaml_path)
    config = _load_config(lang)
    result: dict = {"lang": lang, "status": "ok", "stages_run": []}

    # Stage 1: SOURCE — discover new words from external sources
    if "source" in stages:
        words_yaml = source_new_words(words_yaml, lang, config)
        result["stages_run"].append("source")

    # Stage 2: NORMALIZE — lowercase, dedup, fix length, final forms
    if "normalize" in stages:
        words_yaml = normalize_pool(words_yaml, lang)
        result["stages_run"].append("normalize")

    # Stage 3: SCORE — frequency scores, contamination flags
    if "score" in stages:
        words_yaml = score_pool(words_yaml, lang)
        result["stages_run"].append("score")

    # Stage 4: CURATE — rule-based + LLM classification + overrides
    if "curate" in stages:
        words_yaml = curate_pool(
            words_yaml,
            lang,
            use_llm=use_llm,
            llm_batch_size=llm_batch_size,
            llm_max_batches=llm_max_batches,
            llm_model=llm_model,
        )
        result["stages_run"].append("curate")

    # Stage 5: COMPILE — YAML → optimized JSON for runtime
    if "compile" in stages:
        compiled = compile_language(lang, words_yaml)
        result["stages_run"].append("compile")
        result["daily_count"] = compiled["meta"]["daily_count"]
        result["valid_count"] = compiled["meta"]["valid_count"]

        warnings = validate_pool_depth(words_yaml, lang)
        if warnings:
            result["warnings"] = warnings

        if not dry_run:
            save_compiled(lang, compiled)

    # Stage 6: FREEZE — compute word history
    if "freeze" in stages:
        words_yaml = freeze_history(words_yaml, lang)
        result["stages_run"].append("freeze")

    # Save words.yaml (if any stage besides compile ran)
    non_compile_stages = [s for s in result["stages_run"] if s != "compile"]
    if non_compile_stages and not dry_run:
        save_words_yaml(words_yaml, yaml_path)

    # Summary stats
    result["total_words"] = len(words_yaml.words)
    tier_counts = {}
    for e in words_yaml.words:
        tier_counts[e.tier] = tier_counts.get(e.tier, 0) + 1
    result["tiers"] = tier_counts

    return result


def _load_config(lang: str) -> dict | None:
    import json

    config_path = DATA_DIR / lang / "language_config.json"
    if config_path.exists():
        return json.loads(config_path.read_text(encoding="utf-8"))
    return None
