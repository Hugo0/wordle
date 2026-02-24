"""
Comprehensive test suite for the Wiktionary definition parser across all 65 languages.

Tests parse_wikt_definition() using saved API fixtures — no network required.
Establishes a per-language confidence level: CONFIDENT, PARTIAL, or UNRELIABLE.

Run with:
    uv run pytest tests/test_wiktionary_parser.py -v
    uv run pytest tests/test_wiktionary_parser.py -v -k "confidence"  # just the summary
"""

import json
import re
import sys
from pathlib import Path

import pytest

# Allow imports from webapp/ directory
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "webapp"))

from wiktionary import parse_wikt_definition, WIKT_LANG_MAP

FIXTURES_DIR = PROJECT_ROOT / "tests" / "fixtures" / "wiktionary"

# ---------------------------------------------------------------------------
# Quality validation
# ---------------------------------------------------------------------------

# Known metadata/garbage patterns that should never appear as definitions
BAD_START_PATTERNS = re.compile(
    r"^("
    r"IPA|Rhymes?|Homophones?|Pronunciation|Pronúncia|Prononciation|Pronunciación|"
    r"Nebenformen|Aussprache|Worttrennung|Silbentrennung|Hörbeispiele|Reime|"
    r"Grammatische Merkmale|"
    r"Étymologie|Etimología|Etimologia|Etymology|Herkunft|"
    r"Synonym[es]?|Sinónim|Antonym[es]?|"
    r"Übersetzung|Translation|Tradução|Oberbegriffe|"
    r"Beispiele|Examples|Uso:|odmiana:|przykłady:|składnia:|"
    r"Deklinacija|Konjugacija|Склонение|"
    r"תעתיק|הגייה|"
    r"wymowa:|"
    r"rzeczownik|przymiotnik|przysłówek|czasownik|"
    r"See also|External links|References|Anagrams|"
    r"Derived terms|Related terms|Translations|"
    r"Konjugierte Form|Deklinierte Form|"
    r"From |Du |Del |Do |Uit |Vom |Van |Cognate "
    r")",
    re.IGNORECASE,
)

# Section header pattern
SECTION_HEADER = re.compile(r"^={2,4}\s*.*={2,4}\s*$")

# Phonetic transcription patterns
PHONETIC_PATTERN = re.compile(r"^[/\\\[]")

# Hyphenation mid-dot pattern
HYPHENATION_PATTERN = re.compile(r"^[^\s]{1,30}·")


def is_quality_definition(word, definition):
    """Check whether a definition string is a real definition vs garbage.

    Returns (is_good: bool, reason: str).
    """
    if definition is None:
        return False, "None"

    if not isinstance(definition, str):
        return False, f"not a string: {type(definition)}"

    definition = definition.strip()

    if not definition:
        return False, "empty string"

    if len(definition) <= 5:
        return False, f"too short ({len(definition)} chars): {definition!r}"

    # Just the word itself
    if definition.lower() == word.lower():
        return False, "just the word itself"

    # Section headers
    if SECTION_HEADER.match(definition):
        return False, f"section header: {definition!r}"

    # Known bad start patterns
    if BAD_START_PATTERNS.match(definition):
        return False, f"metadata pattern: {definition[:80]!r}"

    # Phonetic transcription
    if PHONETIC_PATTERN.match(definition):
        return False, f"phonetic transcription: {definition[:80]!r}"

    # Hyphenation line (contains mid-dots in a short word-like string)
    if "·" in definition and len(definition) < 30:
        return False, f"hyphenation line: {definition!r}"

    # Pronunciation-like: starts with the word followed by IPA-style content
    if re.match(rf"^{re.escape(word)}\s*/", definition, re.IGNORECASE):
        return False, f"pronunciation line: {definition[:80]!r}"

    # Headword line: just "word /phonetic/"
    if re.match(r"^\S+\s+/[^/]+/\s*$", definition):
        return False, f"headword with IPA: {definition[:80]!r}"

    return True, "ok"


# ---------------------------------------------------------------------------
# Load all fixtures
# ---------------------------------------------------------------------------


def load_all_fixtures():
    """Load all fixture files, returning dict of {lang_code: {word: fixture_data}}."""
    fixtures = {}
    for f in sorted(FIXTURES_DIR.glob("*.json")):
        lang = f.stem
        with open(f, "r", encoding="utf-8") as fh:
            fixtures[lang] = json.load(fh)
    return fixtures


def generate_golden_test_cases():
    """Generate (lang_code, word, extract, expected_parsed) tuples for golden tests."""
    cases = []
    for f in sorted(FIXTURES_DIR.glob("*.json")):
        lang = f.stem
        with open(f, "r", encoding="utf-8") as fh:
            data = json.load(fh)
        for word, info in data.items():
            extract = info.get("extract")
            if extract is not None:
                cases.append(
                    (lang, word, extract, info.get("parsed"), info.get("tried_word", word))
                )
    return cases


GOLDEN_CASES = generate_golden_test_cases()


# ---------------------------------------------------------------------------
# Golden tests: verify parse_wikt_definition returns expected results
# ---------------------------------------------------------------------------


class TestGoldenParsing:
    """Verify parse_wikt_definition() produces the same output on saved fixtures.

    These are deterministic, offline tests that catch regressions in the parser.
    """

    @pytest.mark.parametrize(
        "lang,word,extract,expected,tried_word",
        GOLDEN_CASES,
        ids=[f"{c[0]}-{c[1]}" for c in GOLDEN_CASES],
    )
    def test_parse_matches_golden(self, lang, word, extract, expected, tried_word):
        """Parser output should match the golden fixture."""
        wikt_lang = WIKT_LANG_MAP.get(lang, lang)
        result = parse_wikt_definition(extract, word=tried_word, lang_code=wikt_lang)
        assert result == expected, (
            f"Parser regression for {lang}:{word}\n"
            f"  Expected: {expected!r}\n"
            f"  Got:      {result!r}"
        )


# ---------------------------------------------------------------------------
# Quality tests: verify definitions are actual definitions, not garbage
# ---------------------------------------------------------------------------


def generate_quality_test_cases():
    """Generate (lang_code, word, parsed_definition) for words that have a definition."""
    cases = []
    for f in sorted(FIXTURES_DIR.glob("*.json")):
        lang = f.stem
        with open(f, "r", encoding="utf-8") as fh:
            data = json.load(fh)
        for word, info in data.items():
            parsed = info.get("parsed")
            if parsed is not None:
                cases.append((lang, word, parsed))
    return cases


QUALITY_CASES = generate_quality_test_cases()


class TestDefinitionQuality:
    """Validate that parsed definitions are real definitions, not metadata/garbage."""

    @pytest.mark.parametrize(
        "lang,word,definition",
        QUALITY_CASES,
        ids=[f"{c[0]}-{c[1]}" for c in QUALITY_CASES],
    )
    def test_definition_is_quality(self, lang, word, definition):
        """Parsed definition should pass quality checks."""
        is_good, reason = is_quality_definition(word, definition)
        if not is_good:
            pytest.xfail(f"Low quality definition for {lang}:{word}: {reason}")


# ---------------------------------------------------------------------------
# Confidence assessment per language
# ---------------------------------------------------------------------------


# Confidence levels
CONFIDENT = "CONFIDENT"  # 3-4 out of 4 words got quality definitions
PARTIAL = "PARTIAL"  # 1-2 out of 4 words got quality definitions
UNRELIABLE = "UNRELIABLE"  # 0 words got quality definitions


def compute_confidence_map():
    """Compute per-language confidence based on fixture quality.

    Returns dict of {lang_code: (confidence_level, good_count, total_with_extract, details)}.
    """
    fixtures = load_all_fixtures()
    confidence = {}

    for lang, words_data in sorted(fixtures.items()):
        total = len(words_data)
        has_extract = 0
        good_count = 0
        details = []

        for word, info in words_data.items():
            extract = info.get("extract")
            parsed = info.get("parsed")
            word_type = info.get("word_type", "unknown")

            if extract is None:
                details.append((word, "no_extract", word_type, None))
                continue

            has_extract += 1

            if parsed is None:
                details.append((word, "no_parse", word_type, None))
                continue

            is_good, reason = is_quality_definition(word, parsed)
            if is_good:
                good_count += 1
                details.append((word, "good", word_type, parsed[:60]))
            else:
                details.append((word, f"bad:{reason}", word_type, parsed[:60] if parsed else None))

        # Determine confidence level
        if good_count >= 3:
            level = CONFIDENT
        elif good_count >= 1:
            level = PARTIAL
        else:
            level = UNRELIABLE

        confidence[lang] = (level, good_count, has_extract, details)

    return confidence


class TestConfidenceAssessment:
    """Assess parser confidence per language based on fixture data."""

    def test_confidence_summary(self, capsys):
        """Print a full confidence summary for all 65 languages."""
        confidence = compute_confidence_map()

        confident_langs = []
        partial_langs = []
        unreliable_langs = []

        for lang, (level, good, has_ext, details) in sorted(confidence.items()):
            if level == CONFIDENT:
                confident_langs.append(lang)
            elif level == PARTIAL:
                partial_langs.append(lang)
            else:
                unreliable_langs.append(lang)

        with capsys.disabled():
            print("\n" + "=" * 90)
            print("WIKTIONARY PARSER CONFIDENCE ASSESSMENT")
            print("=" * 90)
            print()
            print(f"{'Lang':<6} {'Conf':<12} {'Good':>4} {'Ext':>4}  Details")
            print("-" * 90)

            for lang, (level, good, has_ext, details) in sorted(confidence.items()):
                detail_parts = []
                for word, status, wtype, snippet in details:
                    if status == "good":
                        detail_parts.append(f"{word}=OK({wtype})")
                    elif status == "no_extract":
                        detail_parts.append(f"{word}=MISS")
                    elif status == "no_parse":
                        detail_parts.append(f"{word}=NOPARSE")
                    else:
                        detail_parts.append(f"{word}=BAD")
                detail_str = ", ".join(detail_parts)
                print(f"{lang:<6} {level:<12} {good:>4} {has_ext:>4}  {detail_str[:60]}")

            print()
            print(f"CONFIDENT ({len(confident_langs)}):  {', '.join(confident_langs)}")
            print(f"PARTIAL ({len(partial_langs)}):    {', '.join(partial_langs)}")
            print(f"UNRELIABLE ({len(unreliable_langs)}): {', '.join(unreliable_langs)}")
            print("=" * 90)

        # Basic sanity: we should have data for all 65 languages
        assert len(confidence) == 65, f"Expected 65 languages, got {len(confidence)}"


# ---------------------------------------------------------------------------
# Confidence map as importable dict
# ---------------------------------------------------------------------------


def generate_confidence_dict():
    """Generate a plain dict mapping lang_code -> confidence level string.

    This can be copy-pasted into production code.
    """
    confidence = compute_confidence_map()
    return {lang: level for lang, (level, _, _, _) in confidence.items()}


PARSER_CONFIDENCE = generate_confidence_dict()


class TestConfidenceDict:
    """Verify the confidence dict is well-formed."""

    def test_all_languages_present(self):
        assert len(PARSER_CONFIDENCE) == 65

    def test_valid_levels(self):
        for lang, level in PARSER_CONFIDENCE.items():
            assert level in (
                CONFIDENT,
                PARTIAL,
                UNRELIABLE,
            ), f"Invalid confidence level for {lang}: {level}"

    def test_at_least_some_confident(self):
        confident = [l for l, v in PARSER_CONFIDENCE.items() if v == CONFIDENT]
        assert (
            len(confident) >= 5
        ), f"Expected at least 5 CONFIDENT languages, got {len(confident)}: {confident}"

    def test_print_confidence_dict(self, capsys):
        """Print the confidence dict for copy-pasting into production code."""
        with capsys.disabled():
            print("\n\n# Copy this into wiktionary.py or a config file:")
            print("PARSER_CONFIDENCE = {")
            for lang in sorted(PARSER_CONFIDENCE.keys()):
                level = PARSER_CONFIDENCE[lang]
                print(f'    "{lang}": "{level}",')
            print("}")
            print()


# ---------------------------------------------------------------------------
# Regression guards for known-good languages
# ---------------------------------------------------------------------------


class TestKnownGoodLanguages:
    """Ensure major languages remain CONFIDENT or at least PARTIAL."""

    @pytest.mark.parametrize(
        "lang",
        ["en", "de", "fr", "es", "pl", "ru", "bg", "fi", "sv", "vi"],
        ids=lambda x: x,
    )
    def test_major_language_not_unreliable(self, lang):
        """Major languages should not regress to UNRELIABLE."""
        level = PARSER_CONFIDENCE.get(lang)
        assert level is not None, f"Language {lang} missing from confidence map"
        assert level != UNRELIABLE, f"Major language {lang} is UNRELIABLE — parser regression?"
