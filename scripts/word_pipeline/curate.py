"""Stage 4: CURATE — LLM classification + rule-based filtering + community overrides."""

from __future__ import annotations

import json
import logging
import os
import time
from pathlib import Path

from . import DATA_DIR, SCRIPT_DIR
from .prompts import CURATION_SYSTEM_PROMPT, build_curation_prompt, get_script_type
from .schema import LLMCuration, WordsData

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


def curate_rules(words_yaml: WordsData, lang: str) -> WordsData:
    """Apply rule-based curation: profanity, names, flags → tier adjustments.

    Does NOT modify words with reviewed=True.
    """
    profanity = _load_set_file(PROFANITY_PATH)
    names = _load_set_file(NAMES_PATH)

    for entry in words_yaml.words:
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

    return words_yaml


def curate_llm(
    words_yaml: WordsData,
    lang: str,
    batch_size: int = 50,
    max_batches: int | None = None,
    model: str = "claude-sonnet-4-20250514",
) -> WordsData:
    """Apply LLM curation to words that haven't been curated yet.

    Only processes words where reviewed=False and llm=None.
    """
    try:
        import anthropic
    except ImportError:
        log.error("anthropic package not installed. Run: uv sync --group dev")
        return words_yaml

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        log.error("ANTHROPIC_API_KEY not set. Skipping LLM curation.")
        return words_yaml

    client = anthropic.Anthropic(api_key=api_key)

    # Get language name from metadata
    lang_name = words_yaml.metadata.get("language_name", lang)
    script_type = get_script_type(lang)

    # Filter to uncurated words
    uncurated = [e for e in words_yaml.words if not e.reviewed and e.llm is None]
    if not uncurated:
        log.info(f"{lang}: all words already curated")
        return words_yaml

    log.info(f"{lang}: {len(uncurated)} words to curate with LLM")

    # Build word map for quick lookup
    word_map = {e.word: e for e in words_yaml.words}

    # Process in batches
    batches = [uncurated[i : i + batch_size] for i in range(0, len(uncurated), batch_size)]
    if max_batches:
        batches = batches[:max_batches]

    total_curated = 0
    for batch_idx, batch in enumerate(batches):
        words = [e.word for e in batch]
        prompt = build_curation_prompt(lang, lang_name, words, script_type)

        try:
            response = client.messages.create(
                model=model,
                max_tokens=4096,
                system=CURATION_SYSTEM_PROMPT,
                messages=[{"role": "user", "content": prompt}],
            )

            # Parse response
            response_text = response.content[0].text
            result = json.loads(response_text)
            confidence = result.get("confidence", 1)

            for item in result.get("words", []):
                word = item.get("word", "")
                if word not in word_map:
                    continue
                entry = word_map[word]
                entry.llm = LLMCuration(
                    tier=item.get("tier", "valid"),
                    confidence=confidence,
                    reason=item.get("reason", ""),
                )
                total_curated += 1

            log.info(
                f"{lang}: batch {batch_idx + 1}/{len(batches)} — "
                f"confidence={confidence}, curated {len(result.get('words', []))} words"
            )

        except json.JSONDecodeError as e:
            log.warning(f"{lang}: batch {batch_idx + 1} JSON parse error: {e}")
        except Exception as e:
            log.warning(f"{lang}: batch {batch_idx + 1} API error: {e}")
            time.sleep(2)  # Back off on errors

    log.info(f"{lang}: LLM curated {total_curated} words total")
    return words_yaml


def apply_llm_tiers(words_yaml: WordsData) -> WordsData:
    """Apply LLM tier recommendations to word entries.

    Decision logic:
    - reviewed=True → keep human tier (never override)
    - llm.confidence >= 3 and llm.tier == 'reject' → tier = 'blocked'
    - llm.confidence >= 3 and llm.tier == 'valid' → tier = 'valid'
    - Otherwise → keep existing tier
    """
    changed = 0
    for entry in words_yaml.words:
        if entry.reviewed or entry.llm is None:
            continue

        old_tier = entry.tier
        if entry.llm.confidence >= 3:
            if entry.llm.tier == "reject":
                entry.tier = "blocked"
            elif entry.llm.tier == "valid":
                entry.tier = "valid"
            # llm.tier == "daily" → keep existing (don't promote)

        if entry.tier != old_tier:
            changed += 1

    if changed:
        log.info(f"Applied LLM tiers: {changed} words changed")
    return words_yaml


def apply_community_overrides(words_yaml: WordsData, lang: str) -> WordsData:
    """Apply community overrides from contribute/overrides.json."""
    overrides_path = DATA_DIR / lang / "contribute" / "overrides.json"
    if not overrides_path.exists():
        return words_yaml

    overrides = json.loads(overrides_path.read_text(encoding="utf-8"))
    if not overrides:
        return words_yaml

    word_map = {e.word: e for e in words_yaml.words}
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
    return words_yaml


def curate_pool(
    words_yaml: WordsData,
    lang: str,
    use_llm: bool = False,
    llm_batch_size: int = 50,
    llm_max_batches: int | None = None,
    llm_model: str = "claude-sonnet-4-20250514",
) -> WordsData:
    """Full curation pipeline: rules → LLM → apply LLM tiers → community overrides."""
    words_yaml = curate_rules(words_yaml, lang)

    if use_llm:
        words_yaml = curate_llm(
            words_yaml,
            lang,
            batch_size=llm_batch_size,
            max_batches=llm_max_batches,
            model=llm_model,
        )
        words_yaml = apply_llm_tiers(words_yaml)

    words_yaml = apply_community_overrides(words_yaml, lang)
    return words_yaml
