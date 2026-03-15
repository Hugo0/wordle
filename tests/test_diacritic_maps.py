"""
Tests for diacritic_map correctness.

Core rule: if a character has its own key on the keyboard, it is a distinct
letter and must NOT appear in the diacritic_map. Normalizing it would cause
the color algorithm to wrongly treat it as equivalent to its base character.

Example: Finnish has ö as a separate keyboard key and the 28th letter of the
alphabet. Mapping ö→o would make the game show yellow/green for ö when the
answer has o (or vice versa), which is wrong.

Some languages intentionally have keyboard chars in their diacritic_map
(e.g., German treats ö as a variant of o for Wordle purposes). These are
in the ALLOWLIST below and were verified by the original language setup.
"""

import json
from pathlib import Path

import pytest

PROJECT_ROOT = Path(__file__).parent.parent
DATA_DIR = PROJECT_ROOT / "data"
LANG_DIR = DATA_DIR / "languages"

# Languages where keyboard chars in diacritic_map are INTENTIONAL.
# These were set up by native speakers or verified pre-existing configs.
# Any new language wanting this must be added here with justification.
ALLOWLIST = {
    # Pre-existing maps (verified before Nuxt migration):
    "ar",  # Arabic: hamza/alef forms are interchangeable in Arabic script
    "ca",  # Catalan: accents are stress marks, not distinct letters
    "de",  # German: ä/ö/ü are treated as variants of a/o/u in Wordle
    "el",  # Greek: accented vowels are same letter with stress mark
    "es",  # Spanish: accented vowels are stress marks
    "fr",  # French: accents are diacritical marks on base letters
    "gl",  # Galician: same as Spanish/Portuguese
    "it",  # Italian: accents are stress marks
    "ko",  # Korean: jamo composition
    "nb",  # Norwegian Bokmål: é/è/ó are accent variants (but æ/ø/å are NOT mapped)
    "nl",  # Dutch: accents are stress marks
    "nn",  # Norwegian Nynorsk: same as nb
    "pt",  # Portuguese: accents are diacritical marks
    "vi",  # Vietnamese: tone marks are diacritical
    "yo",  # Yoruba: tone/dot marks are diacritical
    # Post-migration additions with keyboard conflicts but intentionally kept:
    "br",  # Breton: ñ on kb but treated as accent variant
    "ckb",  # Kurdish: hamza variants are interchangeable
    "eu",  # Basque: ñ on kb but is a variant
    "fa",  # Persian: alef/hamza forms are interchangeable
    "fur",  # Friulian: ç on kb but accent variants
    "mi",  # Māori: macrons are length marks, not distinct letters
    "nds",  # Low German: umlauts treated as variants (unlike Finnish/Swedish)
    "oc",  # Occitan: ç on kb but accent variants
    "qya",  # Quenya: fictional, accents are variants
    "ru",  # Russian: ё→е is universally accepted normalization
    "tl",  # Tagalog: ñ is a Spanish loanword accent
    "ur",  # Urdu: hamza variants are interchangeable
}


def get_keyboard_chars(lang: str) -> set[str]:
    """Get all characters that appear on the keyboard for a language."""
    kb_chars: set[str] = set()

    # Try dedicated keyboard file
    kb_path = LANG_DIR / lang / f"{lang}_keyboard.json"
    kb = None
    if kb_path.exists():
        kb = json.loads(kb_path.read_text())

    # Fall back to keyboard in language_config
    if not kb:
        cfg_path = LANG_DIR / lang / "language_config.json"
        if cfg_path.exists():
            cfg = json.loads(cfg_path.read_text())
            kb = cfg.get("keyboard")

    if not kb:
        return kb_chars

    # Handle both array format and layouts format
    if isinstance(kb, list):
        for row in kb:
            if isinstance(row, list):
                kb_chars.update(row)
    elif isinstance(kb, dict):
        layouts = kb.get("layouts", {})
        for layout in layouts.values():
            rows = layout.get("rows", layout) if isinstance(layout, dict) else layout
            if isinstance(rows, list):
                for row in rows:
                    if isinstance(row, list):
                        kb_chars.update(row)

    # Remove control keys
    kb_chars.discard("⇨")
    kb_chars.discard("⌫")
    return kb_chars


def get_languages_with_diacritic_maps() -> list[str]:
    """Get all language codes that have a diacritic_map."""
    langs = []
    for lang_dir in sorted(LANG_DIR.iterdir()):
        if not lang_dir.is_dir():
            continue
        cfg_path = lang_dir / "language_config.json"
        if not cfg_path.exists():
            continue
        cfg = json.loads(cfg_path.read_text())
        if cfg.get("diacritic_map"):
            langs.append(lang_dir.name)
    return langs


LANGUAGES_WITH_MAPS = get_languages_with_diacritic_maps()


class TestDiacriticMapCorrectness:
    """Ensure diacritic_maps don't normalize distinct alphabet letters."""

    @pytest.mark.parametrize("lang", LANGUAGES_WITH_MAPS)
    def test_no_keyboard_chars_in_diacritic_map(self, lang):
        """Characters with their own keyboard key should not be in diacritic_map.

        If a character has its own key, it's a distinct letter in that language.
        Normalizing it would cause wrong tile colors (e.g., ö showing yellow
        when the answer has o in Finnish).

        Allowlisted languages have been verified as intentional.
        """
        if lang in ALLOWLIST:
            pytest.skip(f"{lang}: allowlisted (keyboard chars in map are intentional)")

        cfg = json.loads((LANG_DIR / lang / "language_config.json").read_text())
        dmap = cfg.get("diacritic_map", {})
        kb_chars = get_keyboard_chars(lang)

        if not kb_chars:
            pytest.skip(f"{lang}: no keyboard data")

        # Find diacritic chars that are also keyboard keys
        diacritic_chars = {v for variants in dmap.values() for v in variants}
        conflicts = diacritic_chars & kb_chars

        assert not conflicts, (
            f"{lang}: diacritic_map contains keyboard characters {sorted(conflicts)}. "
            f"These are distinct letters and should NOT be normalized. "
            f"If this is intentional, add '{lang}' to ALLOWLIST in this test with justification."
        )
