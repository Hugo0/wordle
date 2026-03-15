"""
Pytest configuration and shared fixtures for Wordle Global tests.
"""

import json
from pathlib import Path

import grapheme
import pytest

# Exclude deprecated tests from collection
collect_ignore_glob = ["deprecated/*"]


def pytest_addoption(parser):
    parser.addoption(
        "--run-network",
        action="store_true",
        default=False,
        help="run tests that make real HTTP requests (e.g., Wiktionary integration)",
    )


def pytest_configure(config):
    config.addinivalue_line("markers", "network: tests that make real HTTP requests")


def pytest_collection_modifyitems(config, items):
    if not config.getoption("--run-network"):
        skip_network = pytest.mark.skip(reason="needs --run-network option to run")
        for item in items:
            if "network" in item.keywords:
                item.add_marker(skip_network)


# Project paths
PROJECT_ROOT = Path(__file__).parent.parent
DATA_DIR = PROJECT_ROOT / "webapp" / "data"
LANGUAGES_DIR = DATA_DIR / "languages"


@pytest.fixture
def data_dir():
    """Return the data directory path."""
    return DATA_DIR


@pytest.fixture
def languages_dir():
    """Return the languages directory path."""
    return LANGUAGES_DIR


def get_all_language_codes():
    """Get all available language codes."""
    if not LANGUAGES_DIR.exists():
        return []
    return [d.name for d in LANGUAGES_DIR.iterdir() if d.is_dir()]


_compiled_cache: dict[str, dict | None] = {}


def _load_compiled(lang_code: str) -> dict | None:
    """Load compiled JSON for a language."""
    if lang_code in _compiled_cache:
        return _compiled_cache[lang_code]
    compiled_file = LANGUAGES_DIR / lang_code / "words_compiled.json"
    if not compiled_file.exists():
        _compiled_cache[lang_code] = None
        return None
    with open(compiled_file, encoding="utf-8") as f:
        result = json.load(f)
    _compiled_cache[lang_code] = result
    return result


def load_word_list(lang_code: str) -> list[str]:
    """Load the main word list for a language (from compiled JSON or text file)."""
    compiled = _load_compiled(lang_code)
    if compiled:
        return compiled["daily"] + compiled["valid"] + compiled["blocked"]
    word_file = LANGUAGES_DIR / lang_code / f"{lang_code}_5words.txt"
    if not word_file.exists():
        return []
    with open(word_file, encoding="utf-8") as f:
        return [line.strip() for line in f if line.strip()]


def load_supplement_words(lang_code: str) -> list[str]:
    """Load the supplemental word list for a language."""
    compiled = _load_compiled(lang_code)
    if compiled:
        return compiled.get("supplement", [])
    word_file = LANGUAGES_DIR / lang_code / f"{lang_code}_5words_supplement.txt"
    if not word_file.exists():
        return []
    with open(word_file, encoding="utf-8") as f:
        return [line.strip() for line in f if line.strip()]


def load_daily_words(lang_code: str) -> list[str]:
    """Load the curated daily word list for a language."""
    compiled = _load_compiled(lang_code)
    if compiled:
        return compiled["daily"]
    word_file = LANGUAGES_DIR / lang_code / f"{lang_code}_daily_words.txt"
    if not word_file.exists():
        return []
    with open(word_file, encoding="utf-8") as f:
        return [
            line.strip().lower() for line in f if line.strip() and not line.strip().startswith("#")
        ]


def load_blocklist(lang_code: str) -> set[str]:
    """Load blocklist words for a language."""
    compiled = _load_compiled(lang_code)
    if compiled:
        return set(compiled["blocked"])
    blocklist_file = LANGUAGES_DIR / lang_code / f"{lang_code}_blocklist.txt"
    if not blocklist_file.exists():
        return set()
    with open(blocklist_file, encoding="utf-8") as f:
        return {
            line.strip().lower() for line in f if line.strip() and not line.strip().startswith("#")
        }


def load_characters(lang_code: str) -> list[str]:
    """Load the character set for a language (derived from word list)."""
    char_file = LANGUAGES_DIR / lang_code / f"{lang_code}_characters.txt"
    if char_file.exists():
        with open(char_file, encoding="utf-8") as f:
            return [line.strip() for line in f if line.strip()]
    # Derive from word list
    words = load_word_list(lang_code)
    chars = set()
    for word in words:
        for ch in word:
            chars.add(ch)
    return sorted(chars)


def load_language_config(lang_code: str) -> dict | None:
    """Load the language configuration JSON."""
    config_file = LANGUAGES_DIR / lang_code / "language_config.json"
    if not config_file.exists():
        return None
    with open(config_file, encoding="utf-8") as f:
        return json.load(f)


def is_grapheme_mode(lang_code: str) -> bool:
    """Check if a language uses grapheme-cluster counting (e.g., Hindi)."""
    config = load_language_config(lang_code)
    return bool(config and config.get("grapheme_mode") == "true")


def word_length(word: str, lang_code: str) -> int:
    """Get word length — grapheme clusters for grapheme_mode langs, codepoints otherwise."""
    if is_grapheme_mode(lang_code):
        return grapheme.length(word)
    return len(word)


def get_diacritic_base_chars(lang_code: str) -> dict[str, str]:
    """Get mapping from diacritic char to base char for a language.

    Returns dict like {'ä': 'a', 'ö': 'o'} if language has diacritic_map.
    """
    config = load_language_config(lang_code)
    if not config or "diacritic_map" not in config:
        return {}

    result = {}
    for base, variants in config["diacritic_map"].items():
        for variant in variants:
            result[variant] = base
    return result


def load_keyboard(lang_code: str) -> list | None:
    """Load the keyboard layout for a language.

    Returns the rows of the default layout. Handles both formats:
    - Old format: list of rows [["a", "b"], ["c", "d"]]
    - New format: {"default": "layout_name", "layouts": {"layout_name": {"rows": [...]}}}
    """
    keyboard_file = LANGUAGES_DIR / lang_code / f"{lang_code}_keyboard.json"
    if not keyboard_file.exists():
        return None
    with open(keyboard_file, encoding="utf-8") as f:
        data = json.load(f)

    # New multi-layout format
    if isinstance(data, dict) and "layouts" in data:
        default_layout = data.get("default", next(iter(data["layouts"])))
        return data["layouts"][default_layout]["rows"]

    # Old format: simple list of rows
    return data


def load_all_keyboard_chars(lang_code: str) -> set[str]:
    """Load all keyboard characters across ALL layouts for a language.

    For coverage tests, a character is typeable if it appears on any layout.
    """
    keyboard_file = LANGUAGES_DIR / lang_code / f"{lang_code}_keyboard.json"
    if not keyboard_file.exists():
        return set()
    with open(keyboard_file, encoding="utf-8") as f:
        data = json.load(f)

    control_keys = {"⇨", "⟹", "⌫", "↵", "ENTER", "DEL"}
    chars = set()

    if isinstance(data, dict) and "layouts" in data:
        for layout in data["layouts"].values():
            for row in layout.get("rows", []):
                chars.update(k for k in row if k not in control_keys)
    elif isinstance(data, list):
        for row in data:
            chars.update(k for k in row if k not in control_keys)

    return chars


# Make language codes available for parametrize
ALL_LANGUAGES = get_all_language_codes()
