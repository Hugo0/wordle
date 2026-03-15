"""Stage 5: COMPILE — Generate compiled JSON for runtime consumption."""

from __future__ import annotations

import json
import logging
from pathlib import Path

from . import DATA_DIR
from .schema import WordsYaml, to_compiled_json

log = logging.getLogger(__name__)


def compile_language(lang: str, words_yaml: WordsYaml | None = None) -> dict:
    """Compile words.yaml to optimized JSON for a language.

    If words_yaml is not provided, loads from disk.
    Returns the compiled dict.
    """
    if words_yaml is None:
        from .schema import load_words_yaml

        yaml_path = DATA_DIR / lang / "words.yaml"
        if not yaml_path.exists():
            raise FileNotFoundError(f"No words.yaml for {lang}")
        words_yaml = load_words_yaml(yaml_path)

    compiled = to_compiled_json(words_yaml)

    return compiled


def save_compiled(lang: str, compiled: dict) -> Path:
    """Write compiled JSON to disk."""
    out_path = DATA_DIR / lang / "words_compiled.json"
    out_path.write_text(
        json.dumps(compiled, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    log.info(
        f"{lang}: compiled {compiled['meta']['daily_count']} daily, "
        f"{compiled['meta']['valid_count']} valid → {out_path.name}"
    )
    return out_path


def validate_pool_depth(words_yaml: WordsYaml, lang: str, min_daily: int = 365) -> list[str]:
    """Check if daily pool is deep enough for a year of play."""
    warnings = []
    daily_count = len(words_yaml.by_tier("daily"))
    if daily_count < min_daily:
        warnings.append(f"{lang}: only {daily_count} daily words (need {min_daily} for a year)")
    return warnings
