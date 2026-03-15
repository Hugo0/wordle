"""Tests for words.json — verify schema validity and data integrity."""

import sys
from pathlib import Path

import pytest

# Project paths (same as conftest.py)
PROJECT_ROOT = Path(__file__).parent.parent
LANGUAGES_DIR = PROJECT_ROOT / "data" / "languages"

# Add scripts dir to import pipeline modules
sys.path.insert(0, str(PROJECT_ROOT / "scripts"))

from word_pipeline.schema import from_json, to_json  # noqa: E402


def _get_all_language_codes():
    return sorted(d.name for d in LANGUAGES_DIR.iterdir() if d.is_dir())


def get_migrated_languages():
    """Get language codes that have words.json."""
    return [lc for lc in _get_all_language_codes() if (LANGUAGES_DIR / lc / "words.json").exists()]


@pytest.fixture(params=get_migrated_languages(), ids=lambda x: x)
def lang(request):
    return request.param


_json_cache: dict = {}


@pytest.fixture
def words_data(lang):
    """Load words.json for a language (cached)."""
    if lang not in _json_cache:
        from word_pipeline.schema import load_words

        json_path = LANGUAGES_DIR / lang / "words.json"
        _json_cache[lang] = load_words(json_path)
    return _json_cache[lang]


class TestHistoryPreservation:
    """Verify word history is valid."""

    def test_history_words_exist(self, lang, words_data):
        """All words with history[] must have valid day indices."""
        for entry in words_data.words:
            if entry.history:
                assert all(isinstance(d, int) and d > 1681 for d in entry.history), (
                    f"{lang}: {entry.word} has invalid history: {entry.history}"
                )

    def test_history_no_gaps(self, lang, words_data):
        """History entries should form a contiguous sequence of days."""
        all_days = set()
        for entry in words_data.words:
            for d in entry.history:
                assert d not in all_days, (
                    f"{lang}: day {d} appears in history for multiple words"
                )
                all_days.add(d)


class TestSchemaValidity:
    """Verify words.json schema is valid."""

    def test_valid_tiers(self, lang, words_data):
        """All entries must have a valid tier."""
        valid_tiers = {"daily", "valid", "blocked"}
        for entry in words_data.words:
            assert entry.tier in valid_tiers, f"{lang}: {entry.word} has invalid tier: {entry.tier}"

    def test_positive_length(self, lang, words_data):
        """All entries must have length > 0."""
        for entry in words_data.words:
            assert entry.length > 0, f"{lang}: {entry.word} has length {entry.length}"

    def test_no_duplicate_words(self, lang, words_data):
        """No duplicate words."""
        seen = set()
        dupes = []
        for entry in words_data.words:
            if entry.word in seen:
                dupes.append(entry.word)
            seen.add(entry.word)
        assert not dupes, f"{lang}: {len(dupes)} duplicate words: {dupes[:10]}"

    def test_metadata_present(self, lang, words_data):
        """Metadata must have language_code."""
        assert words_data.metadata.get("language_code") == lang

    def test_json_roundtrip(self, lang, words_data):
        """JSON serialization/deserialization must be lossless."""
        serialized = to_json(words_data)
        roundtripped = from_json(serialized)
        assert len(roundtripped.words) == len(words_data.words)
        for orig, rt in zip(words_data.words, roundtripped.words, strict=True):
            assert orig.word == rt.word
            assert orig.tier == rt.tier
            assert orig.length == rt.length
