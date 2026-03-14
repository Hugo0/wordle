"""
Tests for the LLM-first definition system (webapp/definitions.py).

All tests are offline — LLM API calls are mocked.
"""

import json
import sys
import time
from pathlib import Path
from unittest.mock import MagicMock, patch

# Allow imports from webapp/ directory
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "webapp"))

from definitions import (
    LLM_LANG_NAMES,
    LLM_MODEL,
    NEGATIVE_CACHE_TTL,
    WIKT_LANG_MAP,
    _call_llm_definition,
    _wiktionary_url,
    fetch_definition,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _mock_openai_json_response(result_dict):
    """Create a mock HTTP response for OpenAI API returning JSON."""
    inner_json = json.dumps(result_dict)
    response_data = json.dumps({"choices": [{"message": {"content": inner_json}}]}).encode()
    mock_resp = MagicMock()
    mock_resp.read.return_value = response_data
    mock_resp.__enter__ = lambda s: s
    mock_resp.__exit__ = MagicMock(return_value=False)
    return mock_resp


# ---------------------------------------------------------------------------
# LLM prompt and response parsing
# ---------------------------------------------------------------------------


class TestCallLlmDefinition:
    """Test _call_llm_definition with mocked OpenAI API."""

    def test_returns_definition_with_all_fields(self, monkeypatch):
        monkeypatch.setenv("OPENAI_API_KEY", "test-key")
        mock_resp = _mock_openai_json_response(
            {
                "definition_native": "To welcome in a friendly manner",
                "definition_en": "To welcome in a friendly manner",
                "part_of_speech": "verb",
                "confidence": 0.95,
            }
        )
        with patch("definitions.urlreq.urlopen", return_value=mock_resp):
            result = _call_llm_definition("greet", "en")

        assert result is not None
        assert result["definition_en"] == "To welcome in a friendly manner"
        assert result["definition_native"] == "To welcome in a friendly manner"
        assert result["definition"] == "To welcome in a friendly manner"  # backward compat
        assert result["part_of_speech"] == "verb"
        assert result["confidence"] == 0.95
        assert result["source"] == "llm"
        assert "wiktionary.org" in result["url"]
        assert "wiktionary.org" in result["wiktionary_url"]

    def test_returns_native_and_english_for_non_english(self, monkeypatch):
        monkeypatch.setenv("OPENAI_API_KEY", "test-key")
        mock_resp = _mock_openai_json_response(
            {
                "definition_native": "Gebäude zum Wohnen",
                "definition_en": "A building for living in",
                "part_of_speech": "noun",
                "confidence": 0.9,
            }
        )
        with patch("definitions.urlreq.urlopen", return_value=mock_resp):
            result = _call_llm_definition("haus", "de")

        assert result is not None
        assert result["definition_native"] == "Gebäude zum Wohnen"
        assert result["definition_en"] == "A building for living in"
        # backward compat "definition" = English
        assert result["definition"] == "A building for living in"

    def test_returns_none_without_api_key(self, monkeypatch):
        monkeypatch.delenv("OPENAI_API_KEY", raising=False)
        result = _call_llm_definition("house", "en")
        assert result is None

    def test_returns_none_for_unknown_language(self, monkeypatch):
        monkeypatch.setenv("OPENAI_API_KEY", "test-key")
        result = _call_llm_definition("word", "zz")
        assert result is None

    def test_returns_none_for_low_confidence(self, monkeypatch):
        monkeypatch.setenv("OPENAI_API_KEY", "test-key")
        mock_resp = _mock_openai_json_response(
            {
                "definition_native": None,
                "definition_en": None,
                "part_of_speech": None,
                "confidence": 0.0,
            }
        )
        with patch("definitions.urlreq.urlopen", return_value=mock_resp):
            result = _call_llm_definition("xyzzy", "en")
        assert result is None

    def test_returns_none_for_confidence_below_threshold(self, monkeypatch):
        monkeypatch.setenv("OPENAI_API_KEY", "test-key")
        mock_resp = _mock_openai_json_response(
            {
                "definition_native": "maybe something",
                "definition_en": "maybe something",
                "part_of_speech": "noun",
                "confidence": 0.2,
            }
        )
        with patch("definitions.urlreq.urlopen", return_value=mock_resp):
            result = _call_llm_definition("xyzzy", "en")
        assert result is None

    def test_returns_none_on_api_error(self, monkeypatch):
        monkeypatch.setenv("OPENAI_API_KEY", "test-key")
        with patch("definitions.urlreq.urlopen", side_effect=Exception("timeout")):
            result = _call_llm_definition("house", "en")
        assert result is None

    def test_returns_none_on_malformed_json(self, monkeypatch):
        monkeypatch.setenv("OPENAI_API_KEY", "test-key")
        # Return non-JSON content
        response_data = json.dumps(
            {"choices": [{"message": {"content": "not valid json {{"}}]}
        ).encode()
        mock_resp = MagicMock()
        mock_resp.read.return_value = response_data
        mock_resp.__enter__ = lambda s: s
        mock_resp.__exit__ = MagicMock(return_value=False)
        with patch("definitions.urlreq.urlopen", return_value=mock_resp):
            result = _call_llm_definition("house", "en")
        assert result is None

    def test_truncates_long_definitions(self, monkeypatch):
        monkeypatch.setenv("OPENAI_API_KEY", "test-key")
        long_def = "a" * 500
        mock_resp = _mock_openai_json_response(
            {
                "definition_native": long_def,
                "definition_en": long_def,
                "part_of_speech": "noun",
                "confidence": 0.9,
            }
        )
        with patch("definitions.urlreq.urlopen", return_value=mock_resp):
            result = _call_llm_definition("house", "en")
        assert result is not None
        assert len(result["definition"]) <= 300
        assert len(result["definition_en"]) <= 300
        assert len(result["definition_native"]) <= 300

    def test_uses_correct_model(self, monkeypatch):
        """Verify we're using gpt-5.2."""
        assert LLM_MODEL == "gpt-5.2"

    def test_wiktionary_url_construction(self):
        assert _wiktionary_url("house", "en") == "https://en.wiktionary.org/wiki/house"
        assert _wiktionary_url("hund", "nb") == "https://no.wiktionary.org/wiki/hund"
        assert _wiktionary_url("haus", "de") == "https://de.wiktionary.org/wiki/haus"


# ---------------------------------------------------------------------------
# Disk cache tests
# ---------------------------------------------------------------------------


class TestFetchDefinitionCache:
    """Test fetch_definition disk cache behavior."""

    def test_returns_cached_result(self, tmp_path):
        """Cache hit returns stored result without calling LLM."""
        cache_dir = str(tmp_path)
        lang_dir = tmp_path / "en"
        lang_dir.mkdir()
        (lang_dir / "house.json").write_text(
            json.dumps(
                {
                    "definition": "A building",
                    "definition_en": "A building",
                    "source": "llm",
                    "url": "https://en.wiktionary.org/wiki/house",
                }
            )
        )

        with patch("definitions._call_llm_definition") as mock_llm:
            result = fetch_definition("house", "en", cache_dir=cache_dir)
            mock_llm.assert_not_called()

        assert result is not None
        assert result["definition"] == "A building"

    def test_old_format_cache_backward_compat(self, tmp_path):
        """Old-format cache entries (no definition_en) still work."""
        cache_dir = str(tmp_path)
        lang_dir = tmp_path / "de"
        lang_dir.mkdir()
        (lang_dir / "haus.json").write_text(
            json.dumps(
                {
                    "definition": "Gebäude zum Wohnen",
                    "source": "native",
                    "url": "https://de.wiktionary.org/wiki/Haus",
                }
            )
        )

        result = fetch_definition("haus", "de", cache_dir=cache_dir)
        assert result is not None
        assert result["definition"] == "Gebäude zum Wohnen"
        assert result["source"] == "native"

    def test_negative_cache_returns_none(self, tmp_path):
        """Negative cache entries prevent re-fetching."""
        cache_dir = str(tmp_path)
        lang_dir = tmp_path / "en"
        lang_dir.mkdir()
        (lang_dir / "xyzzy.json").write_text(
            json.dumps({"not_found": True, "ts": int(time.time())})
        )

        with patch("definitions._call_llm_definition") as mock_llm:
            result = fetch_definition("xyzzy", "en", cache_dir=cache_dir)
            mock_llm.assert_not_called()

        assert result is None

    def test_expired_negative_cache_refetches(self, tmp_path):
        """Expired negative cache triggers re-fetch."""
        cache_dir = str(tmp_path)
        lang_dir = tmp_path / "en"
        lang_dir.mkdir()
        (lang_dir / "xyzzy.json").write_text(
            json.dumps({"not_found": True, "ts": int(time.time()) - NEGATIVE_CACHE_TTL - 1})
        )

        with patch("definitions._call_llm_definition", return_value=None):
            result = fetch_definition("xyzzy", "en", cache_dir=cache_dir)

        assert result is None

    def test_skip_negative_cache_refetches(self, tmp_path):
        """skip_negative_cache=True forces re-fetch."""
        cache_dir = str(tmp_path)
        lang_dir = tmp_path / "en"
        lang_dir.mkdir()
        (lang_dir / "word.json").write_text(json.dumps({"not_found": True, "ts": int(time.time())}))

        mock_result = {
            "definition": "A unit of language",
            "definition_en": "A unit of language",
            "source": "llm",
            "url": "https://en.wiktionary.org/wiki/word",
        }
        with patch("definitions._call_llm_definition", return_value=mock_result):
            result = fetch_definition("word", "en", cache_dir=cache_dir, skip_negative_cache=True)

        assert result is not None
        assert result["definition"] == "A unit of language"

    def test_caches_positive_result(self, tmp_path):
        """Positive LLM results get written to disk cache."""
        cache_dir = str(tmp_path)
        mock_result = {
            "definition": "A building",
            "definition_en": "A building",
            "source": "llm",
            "url": "https://en.wiktionary.org/wiki/house",
        }
        with patch("definitions._call_llm_definition", return_value=mock_result):
            fetch_definition("house", "en", cache_dir=cache_dir)

        cache_file = tmp_path / "en" / "house.json"
        assert cache_file.exists()
        cached = json.loads(cache_file.read_text())
        assert cached["definition"] == "A building"

    def test_caches_negative_result(self, tmp_path):
        """Failed LLM calls write negative cache."""
        cache_dir = str(tmp_path)
        with patch("definitions._call_llm_definition", return_value=None):
            fetch_definition("xyzzy", "en", cache_dir=cache_dir)

        cache_file = tmp_path / "en" / "xyzzy.json"
        assert cache_file.exists()
        cached = json.loads(cache_file.read_text())
        assert cached["not_found"] is True

    def test_no_cache_dir_still_works(self):
        """fetch_definition works without cache_dir (no caching)."""
        mock_result = {
            "definition": "A building",
            "definition_en": "A building",
            "source": "llm",
            "url": "https://en.wiktionary.org/wiki/house",
        }
        with patch("definitions._call_llm_definition", return_value=mock_result):
            result = fetch_definition("house", "en", cache_dir=None)

        assert result is not None
        assert result["definition"] == "A building"

    def test_kaikki_fallback_when_llm_returns_none(self):
        """Kaikki is used as fallback when LLM returns None."""
        kaikki_result = {
            "definition": "A native definition",
            "part_of_speech": None,
            "source": "kaikki",
            "url": None,
        }
        with (
            patch("definitions._call_llm_definition", return_value=None),
            patch("definitions.lookup_kaikki_native", return_value=kaikki_result),
        ):
            result = fetch_definition("word", "nl", cache_dir=None)

        assert result is not None
        assert result["source"] == "kaikki"
        assert result["definition"] == "A native definition"

    def test_kaikki_english_fallback_when_native_missing(self):
        """Kaikki English is used when both LLM and kaikki native return None."""
        kaikki_en_result = {
            "definition": "An English gloss",
            "part_of_speech": None,
            "source": "kaikki-en",
            "url": None,
        }
        with (
            patch("definitions._call_llm_definition", return_value=None),
            patch("definitions.lookup_kaikki_native", return_value=None),
            patch("definitions.lookup_kaikki_english", return_value=kaikki_en_result),
        ):
            result = fetch_definition("word", "ro", cache_dir=None)

        assert result is not None
        assert result["source"] == "kaikki-en"

    def test_kaikki_fallback_is_cached(self, tmp_path):
        """Kaikki fallback results get written to disk cache."""
        cache_dir = str(tmp_path)
        kaikki_result = {
            "definition": "A native definition",
            "part_of_speech": None,
            "source": "kaikki",
            "url": None,
        }
        with (
            patch("definitions._call_llm_definition", return_value=None),
            patch("definitions.lookup_kaikki_native", return_value=kaikki_result),
        ):
            fetch_definition("word", "nl", cache_dir=cache_dir)

        cache_file = tmp_path / "nl" / "word.json"
        assert cache_file.exists()
        cached = json.loads(cache_file.read_text())
        assert cached["source"] == "kaikki"

    def test_negative_cache_only_when_all_tiers_fail(self, tmp_path):
        """Negative cache is written only when LLM AND kaikki both fail."""
        cache_dir = str(tmp_path)
        with (
            patch("definitions._call_llm_definition", return_value=None),
            patch("definitions.lookup_kaikki_native", return_value=None),
            patch("definitions.lookup_kaikki_english", return_value=None),
        ):
            fetch_definition("xyzzy", "zz", cache_dir=cache_dir)

        cache_file = tmp_path / "zz" / "xyzzy.json"
        assert cache_file.exists()
        cached = json.loads(cache_file.read_text())
        assert cached["not_found"] is True


# ---------------------------------------------------------------------------
# LLM_LANG_NAMES coverage
# ---------------------------------------------------------------------------


class TestLlmLangNames:
    """Verify LLM language support."""

    def test_all_major_languages_supported(self):
        major = ["en", "de", "fr", "es", "it", "nl", "pl", "fi", "sv", "ru", "tr", "ar", "ko"]
        for lang in major:
            assert lang in LLM_LANG_NAMES, f"Major language {lang} not in LLM_LANG_NAMES"

    def test_wikt_lang_map_entries(self):
        assert WIKT_LANG_MAP["nb"] == "no"
        assert WIKT_LANG_MAP["nn"] == "no"
        assert WIKT_LANG_MAP["hyw"] == "hy"
        assert WIKT_LANG_MAP["ckb"] == "ku"
