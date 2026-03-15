"""Tests for words.yaml migration — verify no data loss or behavioral changes."""

import sys
from pathlib import Path

import pytest

# Project paths (same as conftest.py)
PROJECT_ROOT = Path(__file__).parent.parent
LANGUAGES_DIR = PROJECT_ROOT / "webapp" / "data" / "languages"

# Add scripts dir to import pipeline modules
sys.path.insert(0, str(PROJECT_ROOT / "scripts"))

from word_pipeline.schema import from_yaml, to_yaml  # noqa: E402


def _get_all_language_codes():
    return sorted(d.name for d in LANGUAGES_DIR.iterdir() if d.is_dir())


def _read_lines(path: Path) -> list[str]:
    if not path.exists():
        return []
    return [line.strip() for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def _read_non_comment_lines(path: Path) -> list[str]:
    return [line for line in _read_lines(path) if not line.startswith("#")]


def _load_word_list(lang: str) -> list[str]:
    return _read_lines(LANGUAGES_DIR / lang / f"{lang}_5words.txt")


def _load_supplement(lang: str) -> list[str]:
    return _read_lines(LANGUAGES_DIR / lang / f"{lang}_5words_supplement.txt")


def _load_daily_words(lang: str) -> list[str]:
    return [w.lower() for w in _read_non_comment_lines(LANGUAGES_DIR / lang / f"{lang}_daily_words.txt")]


def _load_blocklist(lang: str) -> set[str]:
    return {w.lower() for w in _read_non_comment_lines(LANGUAGES_DIR / lang / f"{lang}_blocklist.txt")}


# Only test languages that have been migrated
def get_migrated_languages():
    """Get language codes that have words.yaml."""
    return [
        lc
        for lc in _get_all_language_codes()
        if (LANGUAGES_DIR / lc / "words.yaml").exists()
    ]


@pytest.fixture(params=get_migrated_languages(), ids=lambda x: x)
def lang(request):
    return request.param


_yaml_cache: dict = {}


@pytest.fixture
def words_yaml(lang):
    """Load words.yaml for a language (cached)."""
    if lang not in _yaml_cache:
        from word_pipeline.schema import load_words_yaml

        yaml_path = LANGUAGES_DIR / lang / "words.yaml"
        _yaml_cache[lang] = load_words_yaml(yaml_path)
    return _yaml_cache[lang]


class TestMigrationCompleteness:
    """Verify all words from original files are present in words.yaml."""

    def test_all_main_words_present(self, lang, words_yaml):
        """Every word from _5words.txt must appear in words.yaml."""
        main_words = _load_word_list(lang)
        yaml_words = {w.word for w in words_yaml.words}
        missing = {w.lower() for w in main_words} - yaml_words
        assert not missing, f"{lang}: {len(missing)} main words missing from YAML: {list(missing)[:10]}"

    def test_all_supplement_words_present(self, lang, words_yaml):
        """Every word from _5words_supplement.txt must appear in words.yaml."""
        supplement = _load_supplement(lang)
        if not supplement:
            pytest.skip("No supplement file")
        yaml_words = {w.word for w in words_yaml.words}
        missing = {w.lower() for w in supplement} - yaml_words
        assert not missing, f"{lang}: {len(missing)} supplement words missing: {list(missing)[:10]}"


class TestTierAssignment:
    """Verify tier assignments match original file relationships."""

    def test_daily_words_have_daily_tier(self, lang, words_yaml):
        """Words from _daily_words.txt must have tier='daily' (unless blocklisted)."""
        daily = set(_load_daily_words(lang))
        if not daily:
            pytest.skip("No daily words file")
        blocklist = _load_blocklist(lang)
        yaml_map = words_yaml.word_map()
        wrong_tier = []
        for w in daily:
            if w in yaml_map:
                entry = yaml_map[w]
                if w in blocklist:
                    if entry.tier != "blocked":
                        wrong_tier.append((w, entry.tier, "expected blocked"))
                elif entry.tier != "daily":
                    wrong_tier.append((w, entry.tier, "expected daily"))
        assert not wrong_tier, f"{lang}: {len(wrong_tier)} tier mismatches: {wrong_tier[:5]}"

    def test_blocklist_words_have_blocked_tier(self, lang, words_yaml):
        """Words from _blocklist.txt must have tier='blocked'."""
        blocklist = _load_blocklist(lang)
        if not blocklist:
            pytest.skip("No blocklist file")
        yaml_map = words_yaml.word_map()
        wrong = []
        for w in blocklist:
            if w in yaml_map and yaml_map[w].tier != "blocked":
                wrong.append((w, yaml_map[w].tier))
        assert not wrong, f"{lang}: {len(wrong)} blocklisted words not blocked: {wrong[:5]}"


class TestHistoryPreservation:
    """Verify word history is correctly migrated."""

    def test_history_words_exist(self, lang, words_yaml):
        """All words with history[] must exist and have valid day indices."""
        for entry in words_yaml.words:
            if entry.history:
                assert all(
                    isinstance(d, int) and d > 1681 for d in entry.history
                ), f"{lang}: {entry.word} has invalid history: {entry.history}"

    def test_history_count_matches_file(self, lang, words_yaml):
        """Number of words with history should match word_history.txt line count."""
        history_path = LANGUAGES_DIR / lang / f"{lang}_word_history.txt"
        if not history_path.exists():
            pytest.skip("No word history file")
        history_lines = [
            line.strip()
            for line in history_path.read_text(encoding="utf-8").splitlines()
            if line.strip() and not line.strip().startswith("#")
        ]
        yaml_history_entries = sum(len(e.history) for e in words_yaml.words)
        assert yaml_history_entries == len(history_lines), (
            f"{lang}: YAML has {yaml_history_entries} history entries, "
            f"file has {len(history_lines)} lines"
        )


class TestSchemaValidity:
    """Verify words.yaml schema is valid."""

    def test_valid_tiers(self, lang, words_yaml):
        """All entries must have a valid tier."""
        valid_tiers = {"daily", "valid", "blocked"}
        for entry in words_yaml.words:
            assert entry.tier in valid_tiers, f"{lang}: {entry.word} has invalid tier: {entry.tier}"

    def test_positive_length(self, lang, words_yaml):
        """All entries must have length > 0."""
        for entry in words_yaml.words:
            assert entry.length > 0, f"{lang}: {entry.word} has length {entry.length}"

    def test_no_duplicate_words(self, lang, words_yaml):
        """No duplicate words."""
        seen = set()
        dupes = []
        for entry in words_yaml.words:
            if entry.word in seen:
                dupes.append(entry.word)
            seen.add(entry.word)
        assert not dupes, f"{lang}: {len(dupes)} duplicate words: {dupes[:10]}"

    def test_metadata_present(self, lang, words_yaml):
        """Metadata must have language_code."""
        assert words_yaml.metadata.get("language_code") == lang

    def test_yaml_roundtrip(self, lang, words_yaml):
        """YAML serialization/deserialization must be lossless."""
        serialized = to_yaml(words_yaml)
        roundtripped = from_yaml(serialized)
        assert len(roundtripped.words) == len(words_yaml.words)
        for orig, rt in zip(words_yaml.words, roundtripped.words, strict=True):
            assert orig.word == rt.word
            assert orig.tier == rt.tier
            assert orig.length == rt.length
