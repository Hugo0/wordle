"""Stage 1: SOURCE — Load raw word pools from all available sources."""

from __future__ import annotations

import logging
from pathlib import Path

from . import DATA_DIR, SCRIPT_DIR
from .schema import WordEntry, WordsData

log = logging.getLogger(__name__)

FREQ_DIR = SCRIPT_DIR / ".freq_data" / "FrequencyWords" / "content" / "2018"
KAIKKI_DIR = SCRIPT_DIR / ".freq_data" / "kaikki"
LEIPZIG_DIR = SCRIPT_DIR / ".freq_data" / "leipzig"
HUNSPELL_DIR = SCRIPT_DIR / ".freq_data" / "hunspell"
KBBI_DIR = SCRIPT_DIR / ".freq_data" / "kbbi"
KATLA_DIR = SCRIPT_DIR / ".freq_data" / "katla"

# Language code mappings for frequency sources
FREQ_LANG_MAP = {
    "ar": "ar",
    "br": "br",
    "ca": "ca",
    "cs": "cs",
    "da": "da",
    "de": "de",
    "el": "el",
    "eo": "eo",
    "es": "es",
    "et": "et",
    "eu": "eu",
    "fa": "fa",
    "fr": "fr",
    "gl": "gl",
    "he": "he",
    "hr": "hr",
    "hu": "hu",
    "hy": "hy",
    "is": "is",
    "it": "it",
    "ka": "ka",
    "ko": "ko",
    "la": "la",
    "lt": "lt",
    "lv": "lv",
    "mk": "mk",
    "nl": "nl",
    "pt": "pt",
    "ro": "ro",
    "ru": "ru",
    "sk": "sk",
    "sl": "sl",
    "sr": "sr",
    "sv": "sv",
    "tr": "tr",
    "uk": "uk",
    "vi": "vi",
    "nb": "no",
    "nn": "no",
    "hyw": "hy",
    "id": "id",
    "ms": "ms",
    "tl": "tl",
    "sq": "sq",
    "ur": "ur",
}

# Which extra dictionary sources are available per language
# Generated from scripts/.freq_data/ contents
EXTRA_SOURCES = {
    "ar": {"kaikki", "leipzig"},
    "az": {"kaikki", "leipzig"},
    "bg": {"kaikki", "leipzig"},
    "bn": {"kaikki", "leipzig"},
    "br": {"kaikki", "leipzig"},
    "ca": {"kaikki", "leipzig"},
    "ckb": {"kaikki"},
    "cs": {"kaikki", "leipzig"},
    "da": {"kaikki", "leipzig"},
    "de": {"kaikki", "leipzig"},
    "el": {"kaikki", "leipzig"},
    "en": {"kaikki"},
    "eo": {"kaikki", "leipzig"},
    "es": {"kaikki", "leipzig"},
    "et": {"kaikki", "leipzig"},
    "eu": {"kaikki", "leipzig"},
    "fa": {"kaikki", "leipzig"},
    "fi": {"kaikki", "leipzig"},
    "fo": {"kaikki"},
    "fr": {"kaikki", "leipzig"},
    "fur": {"kaikki"},
    "fy": {"kaikki", "leipzig"},
    "ga": {"kaikki"},
    "gd": {"kaikki"},
    "gl": {"kaikki", "leipzig"},
    "ha": {"kaikki", "leipzig"},
    "he": {"kaikki", "leipzig"},
    "hi": {"kaikki", "hunspell", "leipzig"},
    "hr": {"kaikki", "leipzig"},
    "hu": {"kaikki", "leipzig"},
    "hy": {"kaikki", "leipzig"},
    "ia": {"kaikki"},
    "id": {"kaikki", "hunspell", "kbbi", "katla", "leipzig"},
    "is": {"kaikki", "leipzig"},
    "it": {"kaikki", "leipzig"},
    "ka": {"kaikki", "leipzig"},
    "ko": {"kaikki", "leipzig"},
    "la": {"kaikki", "leipzig"},
    "lb": {"kaikki", "leipzig"},
    "lt": {"kaikki", "leipzig"},
    "ltg": {"kaikki"},
    "lv": {"kaikki"},
    "mi": {"kaikki"},
    "mk": {"kaikki", "leipzig"},
    "mn": {"kaikki", "leipzig"},
    "mr": {"kaikki"},
    "ms": {"kaikki", "leipzig"},
    "nb": {"kaikki", "leipzig"},
    "nds": {"kaikki"},
    "ne": {"leipzig"},
    "nl": {"kaikki", "leipzig"},
    "nn": {"kaikki", "leipzig"},
    "oc": {"kaikki", "leipzig"},
    "pa": {"leipzig"},
    "pl": {"kaikki", "leipzig"},
    "pt": {"kaikki", "leipzig"},
    "ro": {"kaikki", "leipzig"},
    "ru": {"kaikki", "leipzig"},
    "sk": {"kaikki", "leipzig"},
    "sl": {"kaikki", "leipzig"},
    "sq": {"kaikki", "hunspell", "leipzig"},
    "sr": {"kaikki", "leipzig"},
    "sv": {"kaikki", "leipzig"},
    "tk": {"kaikki"},
    "tl": {"kaikki", "leipzig"},
    "tr": {"kaikki", "leipzig"},
    "uk": {"kaikki", "leipzig"},
    "ur": {"kaikki", "leipzig"},
    "uz": {"kaikki", "leipzig"},
    "vi": {"kaikki", "leipzig"},
    "yo": {"kaikki", "leipzig"},
}


def _load_word_file(path: Path) -> set[str]:
    """Load a word-per-line file as a set of lowercase words."""
    if not path.exists():
        return set()
    return {
        line.strip().lower()
        for line in path.read_text(encoding="utf-8").splitlines()
        if line.strip() and line.strip().isalpha()
    }


def load_frequency_words(lang: str) -> dict[str, int]:
    """Load FrequencyWords data. Returns {word: frequency_count}."""
    freq_code = FREQ_LANG_MAP.get(lang)
    if not freq_code:
        return {}
    for suffix in ["_50k.txt", "_full.txt"]:
        path = FREQ_DIR / freq_code / f"{freq_code}{suffix}"
        if path.exists():
            words = {}
            for line in path.read_text(encoding="utf-8").splitlines():
                parts = line.strip().split()
                if len(parts) >= 2:
                    try:
                        words[parts[0].lower()] = int(parts[1])
                    except ValueError:
                        continue
            return words
    return {}


def load_kaikki_words(lang: str) -> set[str]:
    return _load_word_file(KAIKKI_DIR / f"{lang}_words.txt")


def load_hunspell_words(lang: str) -> set[str]:
    path = HUNSPELL_DIR / f"{lang}.dic"
    if not path.exists():
        return set()
    words = set()
    for line in path.read_text(encoding="utf-8", errors="ignore").splitlines():
        w = line.split("/")[0].strip().lower()
        if len(w) == 5 and w.isalpha():
            words.add(w)
    return words


def load_leipzig_words(lang: str) -> set[str]:
    lang_dir = LEIPZIG_DIR / lang
    if not lang_dir.exists():
        return set()
    words = set()
    for f in lang_dir.glob("*-words.txt"):
        for line in f.read_text(encoding="utf-8", errors="ignore").splitlines():
            parts = line.strip().split("\t")
            if len(parts) >= 2:
                w = parts[1].strip().lower()
                if len(w) == 5 and w.isalpha():
                    words.add(w)
    return words


def build_native_dictionary(lang: str) -> set[str]:
    """Build a set of words confirmed in native-language dictionaries."""
    native: set[str] = set()
    sources = EXTRA_SOURCES.get(lang, set())

    if "hunspell" in sources:
        native |= load_hunspell_words(lang)
    if "kbbi" in sources:
        native |= _load_word_file(KBBI_DIR / "words.txt")
    if "katla" in sources:
        native |= _load_word_file(KATLA_DIR / "answers.txt")
        native |= _load_word_file(KATLA_DIR / "valid.txt")
    if "kaikki" in sources:
        native |= load_kaikki_words(lang)
    if "leipzig" in sources:
        native |= load_leipzig_words(lang)

    return native


def load_english_words() -> set[str]:
    """Load English words for contamination detection."""
    en_path = DATA_DIR / "en" / "en_5words.txt"
    words: set[str] = set()
    if en_path.exists():
        words = {
            line.strip().lower()
            for line in en_path.read_text(encoding="utf-8").splitlines()
            if line.strip()
        }
    words |= load_kaikki_words("en")
    return words


def load_community_words(lang: str) -> list[str]:
    """Load community-submitted words from contribute/words.txt."""
    path = DATA_DIR / lang / "contribute" / "words.txt"
    if not path.exists():
        return []
    return [
        line.strip().lower()
        for line in path.read_text(encoding="utf-8").splitlines()
        if line.strip() and not line.strip().startswith("#")
    ]


def source_new_words(
    words_yaml: WordsData,
    lang: str,
    config: dict | None = None,
) -> WordsData:
    """Discover new words from external sources and add them to words.json.

    Only adds words not already present. New words get tier='valid' (uncurated).
    """
    existing = {e.word for e in words_yaml.words}
    char_set = _load_characters(lang)

    new_entries: list[WordEntry] = []

    # Community submissions
    community = load_community_words(lang)
    for w in community:
        if w not in existing and _is_valid(w, char_set, lang, config):
            new_entries.append(
                WordEntry(
                    word=w,
                    length=_word_length(w, lang, config),
                    tier="valid",
                    sources=["community"],
                )
            )
            existing.add(w)

    # FrequencyWords
    freq_data = load_frequency_words(lang)
    for w in freq_data:
        if w not in existing and _is_valid(w, char_set, lang, config):
            new_entries.append(
                WordEntry(
                    word=w,
                    length=_word_length(w, lang, config),
                    tier="valid",
                    sources=["frequencywords"],
                )
            )
            existing.add(w)

    if new_entries:
        log.info(f"{lang}: sourced {len(new_entries)} new words")
        words_yaml.words.extend(new_entries)

    return words_yaml


def _load_characters(lang: str) -> set[str]:
    path = DATA_DIR / lang / f"{lang}_characters.txt"
    if not path.exists():
        return set()
    return {line.strip() for line in path.read_text(encoding="utf-8").splitlines() if line.strip()}


def _is_valid(word: str, char_set: set[str], lang: str, config: dict | None = None) -> bool:
    """Check if a word is valid for this language."""
    if config and config.get("grapheme_mode") == "true":
        import grapheme

        return grapheme.length(word) == 5
    return (
        len(word) == 5
        and word.isalpha()
        and word == word.lower()
        and all(c in char_set for c in word)
    )


def _word_length(word: str, lang: str, config: dict | None = None) -> int:
    if config and config.get("grapheme_mode") == "true":
        import grapheme

        return grapheme.length(word)
    return len(word)
