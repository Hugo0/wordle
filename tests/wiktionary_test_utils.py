"""Shared quality-checking utilities for Wiktionary test suites.

Used by both test_wiktionary_parser.py and test_wiktionary_definitions.py.
"""

import re

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

    if len(definition) > 500:
        return False, f"too long ({len(definition)} chars)"

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

    # Hyphenation line (contains mid-dots in a short string)
    if "·" in definition and len(definition) < 30:
        return False, f"hyphenation line: {definition!r}"

    # Pronunciation-like: starts with the word followed by IPA-style content
    if re.match(rf"^{re.escape(word)}\s*/", definition, re.IGNORECASE):
        return False, f"pronunciation line: {definition[:80]!r}"

    # Headword line: just "word /phonetic/"
    if re.match(r"^\S+\s+/[^/]+/\s*$", definition):
        return False, f"headword with IPA: {definition[:80]!r}"

    return True, "ok"
