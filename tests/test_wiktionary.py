"""
Integration tests for Wiktionary definition parsing.

These tests make real HTTP requests to Wiktionary APIs, so they are marked
with @pytest.mark.network and skipped by default. Run them explicitly with:

    pytest tests/test_wiktionary.py --run-network

This detects:
- Wiktionary format changes that break our parser
- Languages where definitions return the word itself (headword-line bugs)
- Regressions in POS header recognition
"""

import pytest
from webapp.wiktionary import (
    parse_wikt_definition,
    fetch_native_wiktionary,
    fetch_english_definition,
    strip_html,
)

# Known test words per language — chosen for having Wiktionary pages and
# being common enough that their pages are unlikely to be deleted.
# (lang_code, word, source, expected_min_def_length)
NATIVE_WORDS = [
    ("en", "house", 10),
    ("de", "Haus", 5),
    ("fr", "maison", 5),
    ("es", "casa", 5),
    ("it", "casa", 5),
    ("nl", "huis", 5),
    ("pl", "dom", 5),
    ("fi", "koira", 5),
    ("sv", "hund", 5),
    ("ru", "дом", 5),
    ("tr", "ev", 5),
    ("bg", "куче", 5),
    ("hu", "ablak", 5),
    ("et", "koer", 5),
    ("lt", "namas", 5),
    ("vi", "giày", 5),
]

ENGLISH_FALLBACK_WORDS = [
    ("ar", "بيت", 5),
    ("ko", "집", 3),
    ("he", "בית", 3),
]


@pytest.mark.network
class TestNativeWiktionaryParsing:
    """Test that native Wiktionary parsing returns real definitions."""

    @pytest.mark.parametrize(
        "lang_code,word,min_len",
        NATIVE_WORDS,
        ids=[f"{r[0]}-{r[1]}" for r in NATIVE_WORDS],
    )
    def test_returns_definition(self, lang_code, word, min_len):
        """Native Wiktionary should return a non-empty definition."""
        result = fetch_native_wiktionary(word, lang_code)
        assert result is not None, (
            f"Native Wiktionary returned None for {lang_code}:{word}. "
            f"Parser may not recognize this language's Wiktionary format."
        )
        defn = result.get("definition", "")
        assert (
            len(defn) >= min_len
        ), f"Definition too short for {lang_code}:{word} ({len(defn)} chars): '{defn}'"

    @pytest.mark.parametrize(
        "lang_code,word,min_len",
        NATIVE_WORDS,
        ids=[f"{r[0]}-{r[1]}" for r in NATIVE_WORDS],
    )
    def test_definition_is_not_word_itself(self, lang_code, word, min_len):
        """Definition should not just be the word repeated (headword-line bug)."""
        result = fetch_native_wiktionary(word, lang_code)
        if result is None:
            pytest.skip(f"No native definition for {lang_code}:{word}")
        defn = result["definition"].strip().lower()
        word_lower = word.lower()
        assert defn != word_lower, (
            f"Definition for {lang_code}:{word} is just the word itself! "
            f"Parser is probably picking up a headword line."
        )
        # Also catch "word (declension-class)" style headword lines
        assert not (
            defn.startswith(f"{word_lower} (") and len(defn) < len(word_lower) + 20
        ), f"Definition looks like a headword line: '{defn}'"


@pytest.mark.network
class TestEnglishWiktionaryFallback:
    """Test that English Wiktionary fallback works for non-Latin script languages."""

    @pytest.mark.parametrize(
        "lang_code,word,min_len",
        ENGLISH_FALLBACK_WORDS,
        ids=[f"{r[0]}-{r[1]}" for r in ENGLISH_FALLBACK_WORDS],
    )
    def test_returns_definition(self, lang_code, word, min_len):
        """English Wiktionary should return a definition for common words."""
        defn = fetch_english_definition(word, lang_code)
        assert defn is not None, (
            f"English Wiktionary returned None for {lang_code}:{word}. "
            f"The word may have been removed or the API format changed."
        )
        assert len(defn) >= min_len, f"Definition too short for {lang_code}:{word}: '{defn}'"


@pytest.mark.network
class TestParserRobustness:
    """Test parser edge cases and robustness."""

    def test_nonexistent_word_returns_none(self):
        result = fetch_native_wiktionary("xyzzyplugh", "en")
        assert result is None

    def test_empty_extract_returns_none(self):
        assert parse_wikt_definition("") is None

    def test_only_headers_returns_none(self):
        text = "== English ==\n=== Etymology ===\n=== Pronunciation ===\n"
        assert parse_wikt_definition(text) is None

    def test_german_numbered_definition(self):
        """German Wiktionary uses [1] [2] numbered definitions."""
        extract = (
            "== Haus (Deutsch) ==\n"
            "=== Substantiv, n ===\n"
            "Haus, Plural: Häuser\n"
            "[1] Gebäude, das zum Wohnen dient\n"
            "[2] Unternehmen\n"
        )
        result = parse_wikt_definition(extract)
        assert result is not None
        assert "Gebäude" in result or "Wohnen" in result

    def test_polish_numbered_definition(self):
        """Polish Wiktionary uses (1.1) numbered definitions."""
        extract = (
            "== dom ==\n" "znaczenia:\n" "(1.1) budynek mieszkalny\n" "(1.2) miejsce zamieszkania\n"
        )
        result = parse_wikt_definition(extract)
        assert result is not None
        assert "budynek" in result or "mieszka" in result

    def test_finnish_headword_skipped(self):
        """Finnish headword lines like 'koira  (10)' should be skipped."""
        extract = (
            "== koira ==\n"
            "=== Substantiivi ===\n"
            "koira  (10)\n"
            "nelijalkainen kotieläin, joka haukkuu\n"
        )
        result = parse_wikt_definition(extract)
        assert result is not None
        assert result.lower() != "koira"
