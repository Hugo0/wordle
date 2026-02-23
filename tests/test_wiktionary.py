"""
Tests for Wiktionary definition parsing, lemma lookup, and LLM fallback.

Offline tests (parser, lemma, mocked LLM) run by default.
Network tests hit real Wiktionary APIs and are skipped unless --run-network.

    pytest tests/test_wiktionary.py              # offline tests only
    pytest tests/test_wiktionary.py --run-network # all tests
"""

import io
import json
import sys
from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest

# Allow imports from webapp/ directory (matches gunicorn --chdir webapp)
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "webapp"))

from wiktionary import (
    parse_wikt_definition,
    _fallback_extract_definition,
    _build_candidates,
    _follow_form_of,
    fetch_native_wiktionary,
    fetch_english_definition,
    fetch_llm_definition,
    fetch_definition_cached,
    strip_html,
    LEMMA_STRIP_RULES,
    LEMMA_SUFFIXES,
)

# ---------------------------------------------------------------------------
# Offline parser tests — hardcoded Wiktionary extracts, no network needed
# ---------------------------------------------------------------------------


class TestParseWiktDefinition:
    """Offline tests using hardcoded Wiktionary extracts."""

    @pytest.mark.parametrize(
        "lang,extract,word,expected_substring",
        [
            # English
            (
                "en",
                "== house ==\n=== Noun ===\nhouse (plural houses)\n"
                "A structure built or serving as an abode.\n",
                "house",
                "abode",
            ),
            # German [1] numbered
            (
                "de",
                "== Haus (Deutsch) ==\n=== Substantiv, n ===\n"
                "Haus, Plural: Häuser\n"
                "[1] Gebäude, das zum Wohnen dient\n",
                "Haus",
                "gebäude",
            ),
            # Polish (1.1) numbered
            (
                "pl",
                "== dom ==\nznaczenia:\n(1.1) budynek mieszkalny\n",
                "dom",
                "budynek",
            ),
            # Finnish with declension-class headword
            (
                "fi",
                "== koira ==\n=== Substantiivi ===\nkoira  (10)\n"
                "nelijalkainen kotieläin, joka haukkuu\n",
                "koira",
                "kotieläin",
            ),
            # Croatian
            (
                "hr",
                "== kuća ==\n=== Imenica ===\nkuća ž\n" "zgrada za stanovanje i boravak ljudi\n",
                "kuća",
                "zgrada",
            ),
            # Serbian (Cyrillic)
            (
                "sr",
                "== кућа ==\n=== Именица ===\n" "зграда у којој људи живе\n",
                "кућа",
                "зграда",
            ),
            # Greek
            (
                "el",
                "== σπίτι ==\n=== Ουσιαστικό ===\n" "οικοδόμημα που χρησιμοποιείται ως κατοικία\n",
                "σπίτι",
                "οικοδόμημα",
            ),
            # Spanish with form header
            (
                "es",
                "== galas ==\n=== Forma sustantiva ===\n" "1 Plural de gala\n",
                "galas",
                "gala",
            ),
            # Bulgarian
            (
                "bg",
                "== куче ==\n=== Съществително нарицателно ===\n"
                "домашно животно от семейство кучеви\n",
                "куче",
                "животно",
            ),
            # Russian
            (
                "ru",
                "== дом ==\n=== Значение ===\n" "жилое здание\n",
                "дом",
                "здание",
            ),
            # Dutch
            (
                "nl",
                "== huis ==\n=== Zelfstandig naamwoord ===\n"
                "het huis o\neen gebouw waarin men woont\n",
                "huis",
                "gebouw",
            ),
            # Ukrainian
            (
                "uk",
                "== будинок ==\n=== Іменник ===\n" "споруда для проживання людей\n",
                "будинок",
                "споруда",
            ),
            # Hungarian
            (
                "hu",
                "== ablak ==\n=== Főnév ===\nablak\n"
                "nyílás a falon, amelyen keresztül fény jut be\n",
                "ablak",
                "nyílás",
            ),
            # French
            (
                "fr",
                "== maison ==\n=== Nom commun ===\n"
                "maison \\ma.zɔ̃\\ féminin\n"
                "Bâtiment d'habitation.\n",
                "maison",
                "habitation",
            ),
        ],
        ids=lambda x: x if isinstance(x, str) and len(x) <= 5 else "",
    )
    def test_parser_extracts_definition(self, lang, extract, word, expected_substring):
        result = parse_wikt_definition(extract, word=word)
        assert result is not None, f"Parser returned None for {lang}:{word}"
        assert expected_substring in result.lower(), (
            f"Expected '{expected_substring}' in definition for {lang}:{word}, " f"got: '{result}'"
        )

    def test_definition_not_word_itself(self):
        """Parser should not return the headword as the definition."""
        extract = "== koira ==\n=== Substantiivi ===\nkoira  (10)\ndomestic animal\n"
        result = parse_wikt_definition(extract, word="koira")
        assert result is not None
        assert result.lower() != "koira"

    def test_empty_extract_returns_none(self):
        assert parse_wikt_definition("") is None

    def test_only_etymology_returns_none(self):
        text = "== word ==\n=== Etymology ===\nFrom Latin wordus.\n=== Pronunciation ===\nIPA: /wɜːd/\n"
        assert parse_wikt_definition(text) is None


class TestFallbackExtract:
    """Test the fallback heuristic for Wiktionaries without POS subsections."""

    def test_hebrew_style_no_pos(self):
        """Hebrew puts definitions directly after the word heading."""
        extract = "== בית ==\nמבנה המשמש למגורים\n"
        result = _fallback_extract_definition(extract, word="בית")
        assert result is not None
        assert "מבנה" in result

    def test_skips_etymology_section(self):
        extract = (
            "== word ==\n=== Etymology ===\nFrom Latin wordus.\n"
            "=== Noun ===\na meaningful definition here\n"
        )
        # The fallback should skip Etymology and find the definition
        result = _fallback_extract_definition(extract, word="word")
        assert result is not None
        assert "meaningful" in result

    def test_skips_word_itself(self):
        extract = "== test ==\ntest\na longer definition line here\n"
        result = _fallback_extract_definition(extract, word="test")
        assert result is not None
        assert result != "test"

    def test_empty_returns_none(self):
        assert _fallback_extract_definition("") is None


# ---------------------------------------------------------------------------
# Lemma candidate tests — offline
# ---------------------------------------------------------------------------


class TestBuildCandidates:
    """Test lemma candidate generation."""

    def test_original_word_first(self):
        candidates = _build_candidates("house", "en")
        assert candidates[0] == "house"

    def test_title_case_added(self):
        candidates = _build_candidates("haus", "de")
        assert "Haus" in candidates

    def test_no_title_case_if_already_upper(self):
        candidates = _build_candidates("Haus", "de")
        # Should not add duplicate
        assert candidates.count("Haus") == 1

    def test_turkish_infinitive_suffixes(self):
        candidates = _build_candidates("besle", "tr")
        assert "beslemek" in candidates
        assert "beslemak" in candidates

    def test_spanish_plural_stripping(self):
        candidates = _build_candidates("galas", "es")
        assert "gala" in candidates

    def test_spanish_es_stripping(self):
        candidates = _build_candidates("casas", "es")
        assert "casa" in candidates

    def test_portuguese_oes_stripping(self):
        candidates = _build_candidates("limões", "pt")
        assert "limão" in candidates

    def test_french_aux_stripping(self):
        candidates = _build_candidates("journaux", "fr")
        assert "journal" in candidates

    def test_french_eaux_stripping(self):
        candidates = _build_candidates("beaux", "fr")
        assert "beau" in candidates

    def test_italian_ni_stripping(self):
        """Italian -ni → -ne: cani → cane (not cano)."""
        candidates = _build_candidates("cani", "it")
        assert "cane" in candidates

    def test_german_en_stripping(self):
        candidates = _build_candidates("Katzen", "de")
        assert "Katz" in candidates

    def test_croatian_stripping(self):
        candidates = _build_candidates("gradovi", "hr")
        assert "grad" in candidates

    def test_bulgarian_stripping(self):
        candidates = _build_candidates("кучета", "bg")
        assert "куче" in candidates

    def test_finnish_case_stripping(self):
        candidates = _build_candidates("koirassa", "fi")
        assert "koira" in candidates

    def test_unknown_language_returns_original_and_titlecase(self):
        candidates = _build_candidates("hello", "xx")
        assert candidates == ["hello", "Hello"]

    def test_does_not_strip_too_short(self):
        """Don't strip if result would be 1 char or empty."""
        candidates = _build_candidates("as", "es")
        # "as" - "s" = "a" which is len 1, and len("as") > len("s") + 1 is False (2 > 2)
        # so it should not be stripped
        assert "a" not in candidates


# ---------------------------------------------------------------------------
# Form-of following tests — offline
# ---------------------------------------------------------------------------


class TestFollowFormOf:
    """Test _follow_form_of with mocked fetch_english_definition."""

    def test_follows_plural_of(self):
        with patch("wiktionary.fetch_english_definition", return_value="a decorative occasion"):
            result = _follow_form_of("plural of gala", "es")
            assert result == "a decorative occasion"

    def test_follows_feminine_plural_of(self):
        with patch("wiktionary.fetch_english_definition", return_value="a rooster"):
            result = _follow_form_of("feminine plural of galo", "es")
            assert result == "a rooster"

    def test_returns_none_for_non_form(self):
        result = _follow_form_of("a building where people live", "en")
        assert result is None

    def test_returns_none_when_base_not_found(self):
        with patch("wiktionary.fetch_english_definition", return_value=None):
            result = _follow_form_of("plural of xyzzy", "en")
            assert result is None


# ---------------------------------------------------------------------------
# LLM fallback tests — mocked, no API key needed
# ---------------------------------------------------------------------------


class TestLLMFallback:
    """Test fetch_llm_definition with mocked OpenAI API."""

    def _mock_openai_response(self, text):
        """Create a mock HTTP response for OpenAI API."""
        response_data = json.dumps({"choices": [{"message": {"content": text}}]}).encode()
        mock_resp = MagicMock()
        mock_resp.read.return_value = response_data
        mock_resp.__enter__ = lambda s: s
        mock_resp.__exit__ = MagicMock(return_value=False)
        return mock_resp

    def test_returns_definition(self, monkeypatch):
        monkeypatch.setenv("OPENAI_API_KEY", "test-key")
        mock_resp = self._mock_openai_response("noun: a building where people live")
        with patch("wiktionary.urlreq.urlopen", return_value=mock_resp):
            result = fetch_llm_definition("kuća", "hr")
        assert result is not None
        assert result["source"] == "ai"
        assert "building" in result["definition"]

    def test_returns_none_without_api_key(self, monkeypatch):
        monkeypatch.delenv("OPENAI_API_KEY", raising=False)
        result = fetch_llm_definition("kuća", "hr")
        assert result is None

    def test_returns_none_for_unknown_response(self, monkeypatch):
        monkeypatch.setenv("OPENAI_API_KEY", "test-key")
        mock_resp = self._mock_openai_response("UNKNOWN")
        with patch("wiktionary.urlreq.urlopen", return_value=mock_resp):
            result = fetch_llm_definition("xyzzy", "hr")
        assert result is None

    def test_returns_none_for_unknown_language(self, monkeypatch):
        monkeypatch.setenv("OPENAI_API_KEY", "test-key")
        result = fetch_llm_definition("word", "zz")
        assert result is None

    def test_returns_none_on_api_error(self, monkeypatch):
        monkeypatch.setenv("OPENAI_API_KEY", "test-key")
        with patch("wiktionary.urlreq.urlopen", side_effect=Exception("timeout")):
            result = fetch_llm_definition("kuća", "hr")
        assert result is None

    def test_truncates_long_response(self, monkeypatch):
        monkeypatch.setenv("OPENAI_API_KEY", "test-key")
        long_text = "noun: " + "a" * 500
        mock_resp = self._mock_openai_response(long_text)
        with patch("wiktionary.urlreq.urlopen", return_value=mock_resp):
            result = fetch_llm_definition("word", "en")
        assert result is not None
        assert len(result["definition"]) <= 300


# ---------------------------------------------------------------------------
# Existing robustness tests (offline but use network marker for fetch calls)
# ---------------------------------------------------------------------------


@pytest.mark.network
class TestParserRobustness:
    """Test parser edge cases and robustness."""

    def test_nonexistent_word_returns_none(self):
        result = fetch_native_wiktionary("xyzzyplugh", "en")
        assert result is None

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
        extract = "== dom ==\nznaczenia:\n(1.1) budynek mieszkalny\n(1.2) miejsce zamieszkania\n"
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


# ---------------------------------------------------------------------------
# Network integration tests — test against real Wiktionary APIs
# ---------------------------------------------------------------------------

# Known test words per language — common enough to be stable on Wiktionary
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
    # Newly supported languages
    ("hr", "kuća", 5),
    ("sr", "кућа", 5),
    ("el", "σπίτι", 5),
    ("he", "בית", 5),
    ("ro", "casă", 5),
    ("nb", "hund", 5),
    ("uk", "місто", 5),
    ("cs", "dům", 5),
    ("ca", "casa", 5),
]

ENGLISH_FALLBACK_WORDS = [
    ("ar", "بيت", 5),
    ("ko", "집", 3),
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
class TestFormOfFollowingNetwork:
    """Test that 'form of' definitions get followed to the base word."""

    def test_spanish_galas_not_form_of(self):
        """'galas' should resolve to an actual definition, not 'plural of gala'."""
        result = fetch_definition_cached("galas", "es", cache_dir=None)
        assert result is not None, "No definition found for es:galas"
        defn = result["definition"].lower()
        # Should not start with "plural of" or "feminine plural of"
        assert not defn.startswith("plural "), f"Got unresolved form-of: '{defn}'"
        assert not defn.startswith("feminine "), f"Got unresolved form-of: '{defn}'"


@pytest.mark.network
class TestLemmaCandidatesNetwork:
    """Test that lemma stripping helps find definitions for inflected forms."""

    @pytest.mark.parametrize(
        "lang_code,inflected,expected_found",
        [
            ("es", "casas", True),  # plural → casa
            ("fr", "maisons", True),  # plural → maison
            ("de", "Häuser", True),  # plural → Haus (title-case)
            ("tr", "besle", True),  # imperative → beslemek
        ],
        ids=["es-casas", "fr-maisons", "de-Häuser", "tr-besle"],
    )
    def test_inflected_form_finds_definition(self, lang_code, inflected, expected_found):
        """Inflected forms should find definitions via lemma candidates."""
        result = fetch_definition_cached(inflected, lang_code, cache_dir=None)
        if expected_found:
            assert (
                result is not None
            ), f"Expected definition for {lang_code}:{inflected} via lemma lookup"
