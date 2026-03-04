"""
Definition fetching for Wordle Global.

Simple 2-tier system: disk cache → LLM (GPT-5.2).
Definitions are pre-generated daily via scripts/pregenerate_definitions.py.
"""

import json
import logging
import os
import re
import time
import urllib.parse
import urllib.request as urlreq

# Negative cache entries expire after 1 day (seconds)
NEGATIVE_CACHE_TTL = 24 * 3600

# ---------------------------------------------------------------------------
# Kaikki pre-built definitions (offline verification / fallback)
# ---------------------------------------------------------------------------

_DEFINITIONS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "definitions")
_kaikki_cache = {}


def _load_kaikki_file(cache_key, file_path):
    """Load a kaikki definitions JSON file with caching."""
    if cache_key in _kaikki_cache:
        return _kaikki_cache[cache_key]

    if os.path.isfile(file_path):
        try:
            with open(file_path, encoding="utf-8") as f:
                _kaikki_cache[cache_key] = json.load(f)
        except Exception:
            _kaikki_cache[cache_key] = {}
    else:
        _kaikki_cache[cache_key] = {}

    return _kaikki_cache[cache_key]


def lookup_kaikki_native(word, lang_code):
    """Look up a word in native-language kaikki definitions."""
    defs = _load_kaikki_file(
        f"{lang_code}_native", os.path.join(_DEFINITIONS_DIR, f"{lang_code}.json")
    )
    definition = defs.get(word.lower())
    if definition:
        return {
            "definition": definition,
            "part_of_speech": None,
            "source": "kaikki",
            "url": None,
        }
    return None


def lookup_kaikki_english(word, lang_code):
    """Look up a word in English-gloss kaikki definitions."""
    defs = _load_kaikki_file(
        f"{lang_code}_en", os.path.join(_DEFINITIONS_DIR, f"{lang_code}_en.json")
    )
    definition = defs.get(word.lower())
    if definition:
        return {
            "definition": definition,
            "part_of_speech": None,
            "source": "kaikki-en",
            "url": None,
        }
    return None


# ---------------------------------------------------------------------------
# Wiktionary URL construction
# ---------------------------------------------------------------------------

# Language codes where the Wiktionary subdomain differs from the game's lang code
WIKT_LANG_MAP = {"nb": "no", "nn": "no", "hyw": "hy", "ckb": "ku"}


def _wiktionary_url(word, lang_code):
    """Construct a Wiktionary URL for a word."""
    wikt_lang = WIKT_LANG_MAP.get(lang_code, lang_code)
    return f"https://{wikt_lang}.wiktionary.org/wiki/{urllib.parse.quote(word)}"


def strip_html(text):
    """Strip HTML tags from a string."""
    return re.sub(r"<[^>]+>", "", text).strip()


# ---------------------------------------------------------------------------
# LLM definition generation (GPT-5.2)
# ---------------------------------------------------------------------------

# Language names for LLM prompts
LLM_LANG_NAMES = {
    "en": "English",
    "fi": "Finnish",
    "de": "German",
    "fr": "French",
    "es": "Spanish",
    "it": "Italian",
    "pt": "Portuguese",
    "nl": "Dutch",
    "sv": "Swedish",
    "nb": "Norwegian Bokmål",
    "nn": "Norwegian Nynorsk",
    "da": "Danish",
    "pl": "Polish",
    "ru": "Russian",
    "uk": "Ukrainian",
    "bg": "Bulgarian",
    "hr": "Croatian",
    "sr": "Serbian",
    "sl": "Slovenian",
    "cs": "Czech",
    "sk": "Slovak",
    "ro": "Romanian",
    "hu": "Hungarian",
    "tr": "Turkish",
    "az": "Azerbaijani",
    "et": "Estonian",
    "lt": "Lithuanian",
    "lv": "Latvian",
    "el": "Greek",
    "ka": "Georgian",
    "hy": "Armenian",
    "he": "Hebrew",
    "ar": "Arabic",
    "fa": "Persian",
    "vi": "Vietnamese",
    "id": "Indonesian",
    "ms": "Malay",
    "ca": "Catalan",
    "gl": "Galician",
    "eu": "Basque",
    "br": "Breton",
    "oc": "Occitan",
    "la": "Latin",
    "ko": "Korean",
    "sq": "Albanian",
    "mk": "Macedonian",
    "is": "Icelandic",
    "ga": "Irish",
    "cy": "Welsh",
    "mt": "Maltese",
    "hyw": "Western Armenian",
    "ckb": "Central Kurdish",
    "pau": "Palauan",
    "ie": "Interlingue",
    "rw": "Kinyarwanda",
    "tlh": "Klingon",
    "qya": "Quenya",
}

LLM_MODEL = "gpt-5.2"


def _call_llm_definition(word, lang_code):
    """Generate a definition using GPT-5.2 with structured JSON output.

    Returns dict with definition_native, definition_en, part_of_speech, confidence.
    Returns None if the API call fails or confidence is too low.
    """
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        return None
    lang_name = LLM_LANG_NAMES.get(lang_code)
    if not lang_name:
        return None

    is_english = lang_code == "en"
    native_instruction = (
        "same as definition_en"
        if is_english
        else f"a short definition in {lang_name} (1 sentence, max 150 chars)"
    )

    user_prompt = (
        f'Define the {lang_name} word "{word}".\n\n'
        f"This is a common word from a daily word game. "
        f"Give the MOST COMMON everyday meaning, not archaic or rare senses.\n\n"
        f"Return JSON:\n"
        f"{{\n"
        f'  "definition_native": "{native_instruction}",\n'
        f'  "definition_en": "a short definition in English (1 sentence, max 150 chars)",\n'
        f'  "part_of_speech": "noun/verb/adjective/adverb/other (lowercase English)",\n'
        f'  "confidence": 0.0-1.0\n'
        f"}}\n\n"
        f"If you don't recognize this word in {lang_name}, "
        f"return all fields as null with confidence 0.0."
    )

    try:
        req = urlreq.Request(
            "https://api.openai.com/v1/chat/completions",
            data=json.dumps(
                {
                    "model": LLM_MODEL,
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are a multilingual dictionary. Return valid JSON only.",
                        },
                        {"role": "user", "content": user_prompt},
                    ],
                    "max_completion_tokens": 200,
                    "temperature": 0,
                    "response_format": {"type": "json_object"},
                }
            ).encode(),
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
        )
        with urlreq.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read())
            text = data["choices"][0]["message"]["content"].strip()
            result = json.loads(text)

            confidence = result.get("confidence", 0)
            definition_en = result.get("definition_en")
            definition_native = result.get("definition_native")

            if not definition_en or confidence < 0.3:
                print(
                    f"[LLM LOW] {lang_code}/{word}: confidence={confidence}, "
                    f"def_en={definition_en!r}",
                    flush=True,
                )
                return None

            wikt_url = _wiktionary_url(word, lang_code)
            return {
                # New fields
                "definition_native": (definition_native or definition_en)[:300],
                "definition_en": definition_en[:300],
                "confidence": confidence,
                # Backward-compatible fields
                "definition": definition_en[:300],
                "part_of_speech": result.get("part_of_speech"),
                "source": "llm",
                "url": wikt_url,
                "wiktionary_url": wikt_url,
            }

    except json.JSONDecodeError as e:
        logging.warning(f"LLM JSON parse failed for {lang_code}/{word}: {e}")
        print(f"[LLM JSON ERROR] {lang_code}/{word}: {e}", flush=True)
        return None
    except Exception as e:
        logging.warning(f"LLM definition failed for {lang_code}/{word}: {e}")
        print(f"[LLM ERROR] {lang_code}/{word}: {type(e).__name__}: {e}", flush=True)
        return None


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------


def fetch_definition(word, lang_code, cache_dir=None, skip_negative_cache=False):
    """Fetch a word definition. 3-tier: disk cache → LLM → kaikki.

    Args:
        word: The word to define.
        lang_code: Language code (e.g. 'en', 'de').
        cache_dir: Directory for disk cache. If None, no caching.
        skip_negative_cache: If True, ignore cached "not_found" entries.

    Returns dict with keys: definition, definition_native, definition_en,
    part_of_speech, confidence, source, url, wiktionary_url.
    Returns None if no definition found.
    """
    # --- Tier 1: Disk cache ---
    if cache_dir:
        lang_cache_dir = os.path.join(cache_dir, lang_code)
        cache_path = os.path.join(lang_cache_dir, f"{word.lower()}.json")

        if os.path.exists(cache_path):
            try:
                with open(cache_path, "r") as f:
                    loaded = json.load(f)
                    if loaded.get("not_found"):
                        if skip_negative_cache:
                            pass  # Fall through to LLM
                        else:
                            cached_ts = loaded.get("ts", 0)
                            if time.time() - cached_ts < NEGATIVE_CACHE_TTL:
                                return None
                        # Expired — fall through to LLM
                    elif loaded:
                        return loaded
            except Exception:
                pass
    else:
        cache_path = None
        lang_cache_dir = None

    # --- Tier 2: LLM ---
    result = _call_llm_definition(word, lang_code)

    # --- Tier 3: Kaikki fallback (offline Wiktionary data) ---
    if not result:
        result = lookup_kaikki_native(word, lang_code) or lookup_kaikki_english(word, lang_code)

    # Cache result (including negative results)
    if lang_cache_dir:
        try:
            os.makedirs(lang_cache_dir, exist_ok=True)
            with open(cache_path, "w") as f:
                json.dump(result or {"not_found": True, "ts": int(time.time())}, f)
        except IOError:
            pass

    return result
