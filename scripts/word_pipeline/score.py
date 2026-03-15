"""Stage 3: SCORE — Frequency scoring and dictionary verification."""

from __future__ import annotations

import logging
import re

from .schema import WordsData
from .source import build_native_dictionary, load_english_words

log = logging.getLogger(__name__)

_ROMAN_RE = re.compile(r"^[ivxlcdm]+$")

# wordfreq language code mapping
WORDFREQ_LANG_MAP = {
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
    "lt": "lt",
    "lv": "lv",
    "mk": "mk",
    "nb": "nb",
    "nl": "nl",
    "nn": "nn",
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
    "hyw": "hy",
    "id": "id",
    "ms": "ms",
    "tl": "fil",
    "ur": "ur",
}


def score_pool(words_yaml: WordsData, lang: str) -> WordsData:
    """Assign frequency scores and detection flags to all words."""
    # Score with wordfreq
    wf_lang = WORDFREQ_LANG_MAP.get(lang)
    scored = 0
    if wf_lang:
        try:
            from wordfreq import zipf_frequency

            for entry in words_yaml.words:
                if entry.frequency == 0.0:
                    try:
                        freq = zipf_frequency(entry.word, wf_lang)
                        if freq > 0:
                            entry.frequency = round(freq, 2)
                            scored += 1
                    except Exception:
                        pass
            if scored:
                log.info(f"{lang}: scored {scored} words with wordfreq")
        except Exception as e:
            log.warning(f"{lang}: wordfreq unavailable: {e}")

    # Flag detection
    _flag_contamination(words_yaml, lang)
    _flag_roman_numerals(words_yaml)

    return words_yaml


_english_cache: set[str] | None = None


def _flag_contamination(words_yaml: WordsData, lang: str) -> None:
    """Flag English contamination and set foreign flag."""
    global _english_cache
    if lang == "en":
        return
    native_dict = build_native_dictionary(lang)
    if not native_dict:
        return
    if _english_cache is None:
        _english_cache = load_english_words()
    english_words = _english_cache
    flagged = 0
    for entry in words_yaml.words:
        if entry.word in english_words and entry.word not in native_dict:
            entry.flags.foreign = True
            flagged += 1
    if flagged:
        log.info(f"{lang}: flagged {flagged} words as English contamination")


def _flag_roman_numerals(words_yaml: WordsData) -> None:
    """Flag Roman numerals."""
    for entry in words_yaml.words:
        if _is_roman_numeral(entry.word):
            entry.flags.proper_noun = True  # Reuse flag — not a real word


def _is_roman_numeral(word: str) -> bool:
    """Check if a word is a valid Roman numeral."""
    if not _ROMAN_RE.match(word):
        return False
    roman_values = {"i": 1, "v": 5, "x": 10, "l": 50, "c": 100, "d": 500, "m": 1000}
    valid_subtractive = {("i", "v"), ("i", "x"), ("x", "l"), ("x", "c"), ("c", "d"), ("c", "m")}
    total = 0
    i = 0
    while i < len(word):
        if i + 1 < len(word) and roman_values[word[i]] < roman_values[word[i + 1]]:
            if (word[i], word[i + 1]) not in valid_subtractive:
                return False
            total += roman_values[word[i + 1]] - roman_values[word[i]]
            i += 2
        else:
            total += roman_values[word[i]]
            i += 1
    return total > 0
