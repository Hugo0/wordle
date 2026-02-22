"""
Pytest configuration and shared fixtures for Wordle Global tests.
"""

import pytest
import os
import json
from pathlib import Path


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


def load_word_list(lang_code: str) -> list[str]:
    """Load the main word list for a language."""
    word_file = LANGUAGES_DIR / lang_code / f"{lang_code}_5words.txt"
    if not word_file.exists():
        return []
    with open(word_file, "r", encoding="utf-8") as f:
        return [line.strip() for line in f if line.strip()]


def load_supplement_words(lang_code: str) -> list[str]:
    """Load the supplemental word list for a language."""
    word_file = LANGUAGES_DIR / lang_code / f"{lang_code}_5words_supplement.txt"
    if not word_file.exists():
        return []
    with open(word_file, "r", encoding="utf-8") as f:
        return [line.strip() for line in f if line.strip()]


def load_daily_words(lang_code: str) -> list[str]:
    """Load the curated daily word list for a language.

    Matches production behavior in app.py: skips comment lines and lowercases.
    """
    word_file = LANGUAGES_DIR / lang_code / f"{lang_code}_daily_words.txt"
    if not word_file.exists():
        return []
    with open(word_file, "r", encoding="utf-8") as f:
        return [
            line.strip().lower() for line in f if line.strip() and not line.strip().startswith("#")
        ]


def load_blocklist(lang_code: str) -> set[str]:
    """Load blocklist words for a language."""
    blocklist_file = LANGUAGES_DIR / lang_code / f"{lang_code}_blocklist.txt"
    if not blocklist_file.exists():
        return set()
    with open(blocklist_file, "r", encoding="utf-8") as f:
        return {
            line.strip().lower() for line in f if line.strip() and not line.strip().startswith("#")
        }


def load_characters(lang_code: str) -> list[str]:
    """Load the character set for a language."""
    char_file = LANGUAGES_DIR / lang_code / f"{lang_code}_characters.txt"
    if not char_file.exists():
        return []
    with open(char_file, "r", encoding="utf-8") as f:
        return [line.strip() for line in f if line.strip()]


def load_language_config(lang_code: str) -> dict | None:
    """Load the language configuration JSON."""
    config_file = LANGUAGES_DIR / lang_code / "language_config.json"
    if not config_file.exists():
        return None
    with open(config_file, "r", encoding="utf-8") as f:
        return json.load(f)


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
    with open(keyboard_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    # New multi-layout format
    if isinstance(data, dict) and "layouts" in data:
        default_layout = data.get("default", next(iter(data["layouts"])))
        return data["layouts"][default_layout]["rows"]

    # Old format: simple list of rows
    return data


# Make language codes available for parametrize
ALL_LANGUAGES = get_all_language_codes()
