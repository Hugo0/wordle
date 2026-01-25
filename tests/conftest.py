"""
Pytest configuration and shared fixtures for Wordle Global tests.
"""

import pytest
import os
import json
from pathlib import Path

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


def load_keyboard(lang_code: str) -> list | None:
    """Load the keyboard layout for a language."""
    keyboard_file = LANGUAGES_DIR / lang_code / f"{lang_code}_keyboard.json"
    if not keyboard_file.exists():
        return None
    with open(keyboard_file, "r", encoding="utf-8") as f:
        return json.load(f)


# Make language codes available for parametrize
ALL_LANGUAGES = get_all_language_codes()
