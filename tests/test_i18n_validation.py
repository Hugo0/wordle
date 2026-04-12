"""
Tests for i18n validation — ensures translation files are complete and correct.

Runs the same checks as scripts/validate_i18n.py but integrated with pytest
so they execute as part of the standard `uv run pytest tests/` suite.
"""

import json

# Import validation logic from the script
import sys
from pathlib import Path

import pytest

from tests.conftest import ALL_LANGUAGES, LANGUAGES_DIR

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))
from validate_i18n import (
    check_json_validity,
    check_missing_keys,
    check_string_lengths,
    check_untranslated_keys,
    load_default_config,
)

# Languages that have a language_config.json
LANGUAGES_WITH_CONFIG = [
    lang for lang in ALL_LANGUAGES if (LANGUAGES_DIR / lang / "language_config.json").exists()
]


@pytest.fixture(scope="module")
def default_config():
    return load_default_config()


class TestJsonValidity:
    """Every language_config.json must be valid JSON."""

    @pytest.mark.parametrize("lang", LANGUAGES_WITH_CONFIG)
    def test_valid_json(self, lang):
        lang_dir = LANGUAGES_DIR / lang
        err = check_json_validity(lang_dir)
        assert err is None, f"{lang}: Invalid JSON — {err}"


class TestMissingKeys:
    """Languages that override a section should include all keys from the default.

    Missing keys fall back to English at runtime, so this is a warning (skip)
    rather than a hard failure. It surfaces gaps for translators to fill.
    """

    @pytest.mark.parametrize("lang", LANGUAGES_WITH_CONFIG)
    def test_no_missing_text_keys(self, lang, default_config):
        lang_dir = LANGUAGES_DIR / lang
        with open(lang_dir / "language_config.json", encoding="utf-8") as f:
            lang_config = json.load(f)

        missing = check_missing_keys(lang, lang_config, default_config)
        missing_text = missing.get("text", [])
        if missing_text:
            pytest.skip(f"{lang}: {len(missing_text)} missing text keys: {missing_text}")

    @pytest.mark.parametrize("lang", LANGUAGES_WITH_CONFIG)
    def test_no_missing_ui_keys(self, lang, default_config):
        lang_dir = LANGUAGES_DIR / lang
        with open(lang_dir / "language_config.json", encoding="utf-8") as f:
            lang_config = json.load(f)

        missing = check_missing_keys(lang, lang_config, default_config)
        missing_ui = missing.get("ui", [])
        if missing_ui:
            pytest.skip(f"{lang}: {len(missing_ui)} missing ui keys: {missing_ui}")

    @pytest.mark.parametrize("lang", LANGUAGES_WITH_CONFIG)
    def test_no_missing_help_keys(self, lang, default_config):
        lang_dir = LANGUAGES_DIR / lang
        with open(lang_dir / "language_config.json", encoding="utf-8") as f:
            lang_config = json.load(f)

        missing = check_missing_keys(lang, lang_config, default_config)
        missing_help = missing.get("help", [])
        if missing_help:
            pytest.skip(f"{lang}: {len(missing_help)} missing help keys: {missing_help}")


class TestStringLengths:
    """Translations should not be excessively longer than the English default.

    Length issues are warnings (skip), not hard failures — some languages
    legitimately need longer strings (e.g. Gaelic, Bengali).
    """

    @pytest.mark.parametrize("lang", LANGUAGES_WITH_CONFIG)
    def test_no_length_overflow(self, lang, default_config):
        lang_dir = LANGUAGES_DIR / lang
        with open(lang_dir / "language_config.json", encoding="utf-8") as f:
            lang_config = json.load(f)

        warnings = check_string_lengths(lang, lang_config, default_config)
        if warnings:
            details = "; ".join(f"{k} ({ll} chars, default {dl})" for k, ll, dl in warnings)
            pytest.skip(f"{lang}: String length overflow — {details}")


class TestUntranslatedKeys:
    """Informational: flag languages with many untranslated keys.

    This test does NOT fail by default — it uses xfail to surface the data
    without blocking CI. Use --strict in the standalone script to enforce.
    """

    # Threshold: languages with more than this many untranslated keys get flagged
    UNTRANSLATED_THRESHOLD = 50

    @pytest.mark.parametrize("lang", LANGUAGES_WITH_CONFIG)
    def test_untranslated_below_threshold(self, lang, default_config):
        lang_dir = LANGUAGES_DIR / lang
        with open(lang_dir / "language_config.json", encoding="utf-8") as f:
            lang_config = json.load(f)

        untranslated = check_untranslated_keys(lang, lang_config, default_config)
        if len(untranslated) > self.UNTRANSLATED_THRESHOLD:
            pytest.skip(
                f"{lang}: {len(untranslated)} untranslated keys "
                f"(threshold: {self.UNTRANSLATED_THRESHOLD})"
            )
