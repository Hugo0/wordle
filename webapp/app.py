from flask import (
    Flask,
    render_template,
    make_response,
    redirect,
    request,
    send_from_directory,
    jsonify,
    abort,
)
import json
import os
import datetime
import glob
import random
from zoneinfo import ZoneInfo
import hashlib
import re
import urllib.parse
import urllib.request as urlreq
import logging
from pathlib import Path
from wiktionary import (
    fetch_definition_cached as _fetch_definition_cached_impl,
    lookup_kaikki_native,
    lookup_kaikki_english,
)

# Load .env file if it exists (for local development)
_env_path = Path(__file__).resolve().parent.parent / ".env"
if _env_path.exists():
    with open(_env_path) as _f:
        for _line in _f:
            _line = _line.strip()
            if _line and not _line.startswith("#") and "=" in _line:
                _key, _, _val = _line.partition("=")
                _val = _val.strip()
                if len(_val) >= 2 and _val[0] == _val[-1] and _val[0] in ('"', "'"):
                    _val = _val[1:-1]
                os.environ.setdefault(_key.strip(), _val)

# Persistent data directory — /data in production (Render disk), local fallback for dev
DATA_DIR = os.environ.get("DATA_DIR", os.path.join(os.path.dirname(__file__), "static"))
WORD_IMAGES_DIR = os.path.join(DATA_DIR, "word-images")
WORD_DEFS_DIR = os.path.join(DATA_DIR, "word-defs")
WORD_STATS_DIR = os.path.join(DATA_DIR, "word-stats")
WORD_HISTORY_DIR = os.path.join(DATA_DIR, "word-history")

# set random seed 42 for reproducibility (important to maintain stable word lists)
# NOTE: This is only used for the LEGACY algorithm (days before MIGRATION_DAY_IDX)
random.seed(42)

# Migration cutoff: days before this use legacy shuffle, days after use consistent hashing
# This preserves all past daily words while enabling flexible blocklisting going forward
# Day 1681 = January 25, 2026
MIGRATION_DAY_IDX = 1681

app = Flask(__name__)


###############################################################################
# VITE MANIFEST - For loading built frontend assets
###############################################################################
def load_vite_manifest():
    """Load the Vite build manifest to get hashed asset filenames.

    Run `pnpm build` to generate the manifest and built assets.
    """
    manifest_path = os.path.join(app.static_folder, "dist", ".vite", "manifest.json")
    if not os.path.exists(manifest_path):
        raise FileNotFoundError(
            f"Vite manifest not found at {manifest_path}. "
            "Run 'pnpm build' first to build frontend assets."
        )
    with open(manifest_path, "r") as f:
        return json.load(f)


def get_vite_assets():
    """Get the JS and CSS asset URLs from Vite manifest"""
    manifest = load_vite_manifest()
    entry = manifest["src/main.ts"]

    # Collect CSS from entry and all its imports (recursive)
    css_files = set()

    def collect_css(chunk_key):
        chunk = manifest.get(chunk_key, {})
        for css in chunk.get("css", []):
            css_files.add(css)
        for imp in chunk.get("imports", []):
            collect_css(imp)

    collect_css("src/main.ts")

    return {
        "js": f"/static/dist/{entry['file']}",
        "css": [f"/static/dist/{css}" for css in css_files],
    }


@app.context_processor
def inject_vite_assets():
    """Make Vite assets available in all templates"""
    return {"vite_assets": get_vite_assets()}


@app.context_processor
def inject_hreflang():
    """Make hreflang data available in all templates for international SEO."""
    return {
        "hreflang_langs": sorted(language_codes),
        "hreflang_url_pattern": "https://wordle.global/{lang}",
    }


###############################################################################
# DATA
###############################################################################
print("Loading data...")

data_dir = "data/"


# load other_wordles.json file
with open(f"{data_dir}other_wordles.json", "r") as f:
    other_wordles = json.load(f)


def load_characters(lang):
    if not glob.glob(f"{data_dir}languages/{lang}/{lang}_characters.txt"):
        characters = set()
        with open(f"{data_dir}languages/{lang}/{lang}_5words.txt", "r") as f:
            for line in f:
                characters.update(line.strip())
        with open(f"{data_dir}languages/{lang}/{lang}_characters.txt", "w") as f:
            # sort characters
            characters = sorted(characters)
            # write char per newline
            for char in characters:
                f.write(char + "\n")

    with open(f"{data_dir}languages/{lang}/{lang}_characters.txt", "r") as f:
        characters = [line.strip() for line in f]
    return characters


language_codes = [f.split("/")[-1] for f in glob.glob(f"{data_dir}/languages/*")]
language_characters = {lang: load_characters(lang) for lang in language_codes}


def load_words(lang):
    """loads the words and does some basic QA"""
    _5words = []
    with open(f"{data_dir}/languages/{lang}/{lang}_5words.txt", "r") as f:
        for line in f:
            _5words.append(line.strip())
    # QA
    _5words = [word.lower() for word in _5words if len(word) == 5 and word.isalpha()]
    # remove words without correct characters
    _5words = [
        word for word in _5words if all([char in language_characters[lang] for char in word])
    ]

    # we don't want words in order, so if .txt is not pre-shuffled, shuffle
    last_letter = ""
    n_in_order = 0
    for word in _5words:
        letter = word[0]
        # check if sorted
        if letter <= last_letter:
            n_in_order += 1
        last_letter = letter
    # if 80% of words are in order, then we consider the list sorted and we shuffle it deterministically
    if n_in_order / len(_5words) > 0.8:
        random.shuffle(_5words)
        print(f"{lang} words are sorted, shuffling")
    return _5words


def load_supplemental_words(lang):
    """loads the supplemental words file if it exists"""
    try:
        with open(f"{data_dir}languages/{lang}/{lang}_5words_supplement.txt", "r") as f:
            supplemental_words = [line.strip() for line in f]
        supplemental_words = [
            word
            for word in supplemental_words
            if all([char in language_characters[lang] for char in word])
        ]
    except FileNotFoundError:
        supplemental_words = []
    return supplemental_words


def load_blocklist(lang):
    """Load blocklist words that should be excluded from daily word rotation.

    Blocklisted words are still valid guesses, but won't be selected as
    the daily word. This allows filtering without changing shuffle order.

    Blocklist format: one word per line, # for comments, blank lines ignored.
    """
    blocklist_path = f"{data_dir}languages/{lang}/{lang}_blocklist.txt"
    try:
        with open(blocklist_path, "r") as f:
            blocklist = set()
            for line in f:
                line = line.strip()
                # Skip empty lines and comments
                if line and not line.startswith("#"):
                    blocklist.add(line.lower())
            return blocklist
    except FileNotFoundError:
        return set()


def load_daily_words(lang):
    """Load curated daily word list if it exists.

    Some languages have a separate curated list of high-quality words
    for daily puzzles (e.g., common nouns, recognizable words).

    If this file exists, it's used for daily word selection instead
    of filtering the main word list with blocklist.

    The main word list (_5words.txt) is still used for guess validation.
    """
    daily_path = f"{data_dir}languages/{lang}/{lang}_daily_words.txt"
    try:
        with open(daily_path, "r") as f:
            daily_words = []
            for line in f:
                line = line.strip()
                if line and not line.startswith("#"):
                    daily_words.append(line.lower())
            return daily_words if daily_words else None
    except FileNotFoundError:
        return None


def load_curated_schedule(lang):
    """Load ordered curated schedule if it exists.

    The curated schedule is an ordered list of words for specific days:
    - Line 1 = Day MIGRATION_DAY_IDX + 1 (January 26, 2026)
    - Line 2 = Day MIGRATION_DAY_IDX + 2 (January 27, 2026)
    - etc.

    This takes priority over daily_words and blocklist-filtered main list.
    When the schedule is exhausted, falls back to the next tier.
    """
    schedule_path = f"{data_dir}languages/{lang}/{lang}_curated_schedule.txt"
    try:
        with open(schedule_path, "r") as f:
            schedule = []
            for line in f:
                line = line.strip()
                if line and not line.startswith("#"):
                    schedule.append(line.lower())
            return schedule if schedule else None
    except FileNotFoundError:
        return None


def load_language_config(lang):
    """Load language config, merging with default to ensure all keys exist."""
    # Load default config first
    with open(f"{data_dir}default_language_config.json", "r") as f:
        default_config = json.load(f)

    try:
        with open(f"{data_dir}languages/{lang}/language_config.json", "r") as f:
            language_config = json.load(f)

        # Merge: language-specific values override defaults
        # Deep merge for nested dicts (ui, text, help, meta)
        merged = default_config.copy()
        for key, value in language_config.items():
            if isinstance(value, dict) and key in merged and isinstance(merged[key], dict):
                # Merge nested dict
                merged[key] = {**merged[key], **value}
            else:
                merged[key] = value
        return merged
    except FileNotFoundError:
        return default_config


def load_keyboard(lang):
    """
    Return normalized keyboard layouts for a language.

    Reads the language-specific keyboard JSON, handles legacy formats,
    and always returns a dict with default layout metadata.
    """
    keyboard_path = f"{data_dir}languages/{lang}/{lang}_keyboard.json"
    try:
        with open(keyboard_path, "r") as f:
            keyboard_data = json.load(f)
    except FileNotFoundError:
        return {"default": None, "layouts": {}}
    except Exception:
        return {"default": None, "layouts": {}}

    if isinstance(keyboard_data, list):
        if not keyboard_data:
            return {"default": None, "layouts": {}}
        return {
            "default": "default",
            "layouts": {"default": {"label": "Default", "rows": keyboard_data}},
        }

    if not isinstance(keyboard_data, dict):
        return {"default": None, "layouts": {}}

    layouts_block = keyboard_data.get("layouts")
    if isinstance(layouts_block, dict):
        source_layouts = layouts_block
    else:
        source_layouts = {key: value for key, value in keyboard_data.items() if key != "default"}

    normalized_layouts = {}
    for layout_name, layout_value in source_layouts.items():
        if isinstance(layout_value, dict):
            rows = layout_value.get("rows", [])
            label = layout_value.get("label") or layout_name.replace("_", " ").title()
        else:
            rows = layout_value
            label = layout_name.replace("_", " ").title()
        normalized_layouts[layout_name] = {"label": label, "rows": rows}

    default_layout = keyboard_data.get("default")
    if default_layout not in normalized_layouts:
        default_layout = next(iter(normalized_layouts), None)

    return {"default": default_layout, "layouts": normalized_layouts}


def get_todays_idx(timezone: str = "UTC"):
    """Calculate the daily word index based on timezone.

    Args:
        timezone: IANA timezone identifier (e.g., "Europe/Helsinki", "Asia/Seoul").
            Uses zoneinfo for DST-aware offset resolution.

    Returns:
        The word index for "today" in the specified timezone
    """
    try:
        tz = ZoneInfo(timezone)
    except Exception:
        tz = ZoneInfo("UTC")
    local_now = datetime.datetime.now(tz)

    # Calculate days since epoch in the local timezone
    n_days = (local_now.date() - datetime.date(1970, 1, 1)).days
    idx = n_days - 18992 + 195
    return idx


###############################################################################
# WORD SELECTION ALGORITHMS
###############################################################################


def _word_hash(word: str, lang_code: str) -> int:
    """Get a stable hash for a word. This doesn't change if the word list changes."""
    h = hashlib.sha256(f"{lang_code}:{word}".encode()).digest()
    return int.from_bytes(h[:8], "big")


def _day_hash(day_idx: int, lang_code: str) -> int:
    """Get a deterministic hash for a specific day."""
    h = hashlib.sha256(f"{lang_code}:day:{day_idx}".encode()).digest()
    return int.from_bytes(h[:8], "big")


def get_daily_word_consistent_hash(
    words: list, blocklist: set, day_idx: int, lang_code: str
) -> str:
    """Select daily word using consistent hashing.

    This algorithm is STABLE when words are added/removed:
    - Each word has a fixed hash (based on word + language)
    - Each day has a fixed hash
    - We pick the word whose hash is closest to (>=) the day's hash
    - Blocklisted words are simply excluded from consideration

    Benefits:
    - Adding new words doesn't change existing days' selections
    - Removing/blocklisting a word only affects days that would have shown that word
    - Enables aggressive filtering without breaking unrelated days
    """
    day_h = _day_hash(day_idx, lang_code)

    # Build sorted list of (hash, word) for non-blocked words
    candidates = []
    for word in words:
        if word not in blocklist:
            candidates.append((_word_hash(word, lang_code), word))

    if not candidates:
        # Fallback: all words blocked, return first word
        return words[0] if words else ""

    candidates.sort(key=lambda x: x[0])

    # Find first word with hash >= day_hash (consistent hashing ring)
    for word_h, word in candidates:
        if word_h >= day_h:
            return word

    # Wraparound: day_hash is larger than all word hashes, pick first
    return candidates[0][1]


def get_daily_word_legacy(words: list, blocklist: set, day_idx: int) -> str:
    """Legacy word selection using shuffle + modulo.

    This preserves backwards compatibility for days before MIGRATION_DAY_IDX.
    The word list must already be shuffled with seed 42 at load time.
    """
    list_len = len(words)

    if not blocklist:
        return words[day_idx % list_len]

    # Skip blocked words by walking forward
    for offset in range(list_len):
        idx = (day_idx + offset) % list_len
        word = words[idx]
        if word not in blocklist:
            return word

    # Fallback
    return words[day_idx % list_len]


def idx_to_date(day_idx):
    """Reverse of get_todays_idx(): convert a day index back to a calendar date."""
    n_days = day_idx + 18992 - 195
    return datetime.datetime(1970, 1, 1) + datetime.timedelta(days=n_days)


language_codes_5words = {l_code: load_words(l_code) for l_code in language_codes}
language_codes_5words_supplements = {
    l_code: load_supplemental_words(l_code) for l_code in language_codes
}
language_blocklists = {l_code: load_blocklist(l_code) for l_code in language_codes}
language_daily_words = {l_code: load_daily_words(l_code) for l_code in language_codes}
language_curated_schedules = {l_code: load_curated_schedule(l_code) for l_code in language_codes}
language_configs = {l_code: load_language_config(l_code) for l_code in language_codes}

# Load default language config for UI translations on homepage
with open(f"{data_dir}default_language_config.json", "r") as f:
    default_language_config = json.load(f)

keyboards = {k: load_keyboard(k) for k in language_codes}


def _compute_word_for_day(lang_code, day_idx):
    """Compute the daily word from word lists (no caching)."""
    word_list = language_codes_5words[lang_code]
    blocklist = language_blocklists[lang_code]
    daily_words = language_daily_words.get(lang_code)
    curated_schedule = language_curated_schedules.get(lang_code)

    if day_idx <= MIGRATION_DAY_IDX:
        return get_daily_word_legacy(word_list, set(), day_idx)
    else:
        schedule_idx = day_idx - MIGRATION_DAY_IDX - 1
        if curated_schedule and schedule_idx < len(curated_schedule):
            return curated_schedule[schedule_idx]
        if daily_words:
            return get_daily_word_consistent_hash(daily_words, set(), day_idx, lang_code)
        return get_daily_word_consistent_hash(word_list, blocklist, day_idx, lang_code)


def get_word_for_day(lang_code, day_idx):
    """Get the daily word for a specific language and day index.

    Once a word is computed for a past day, it's cached to disk so future
    word list changes can never alter historical daily words.
    """
    # Check cache first
    cache_path = os.path.join(WORD_HISTORY_DIR, lang_code, f"{day_idx}.txt")
    if os.path.exists(cache_path):
        try:
            with open(cache_path, "r") as f:
                cached = f.read().strip()
                if cached:
                    return cached
        except OSError:
            pass  # Fall through to recompute

    word = _compute_word_for_day(lang_code, day_idx)

    # Cache past/current days (not future)
    todays_idx = get_todays_idx()
    if day_idx <= todays_idx:
        lang_dir = os.path.join(WORD_HISTORY_DIR, lang_code)
        os.makedirs(lang_dir, exist_ok=True)
        # Write atomically via temp file to prevent corrupt reads
        tmp_path = cache_path + ".tmp"
        try:
            with open(tmp_path, "w") as f:
                f.write(word)
            os.replace(tmp_path, cache_path)
        except OSError:
            pass

    return word


def load_languages():
    """returns a dict of language codes mapped to their english name and native name"""

    languages = {}
    # for each language folder, get the language config.name and config.name_natove
    for lang in language_codes:
        language_config = language_configs[lang]
        languages[lang] = {
            "language_name": language_config["name"],
            "language_name_native": language_config["name_native"],
            "language_code": lang,
        }
    return languages


languages = load_languages()

# Language popularity order based on Google Analytics session data (last 30 days)
# Updated: 2026-01-25
# This determines default sort order for unplayed languages on homepage
language_popularity = [
    "fi",  # Finnish - 48K sessions (39% return rate!)
    "en",  # English - 28K sessions
    "ar",  # Arabic - 13K sessions
    "tr",  # Turkish - 7K sessions
    "hr",  # Croatian - 5K sessions
    "bg",  # Bulgarian - 5K sessions
    "de",  # German - 4K sessions
    "he",  # Hebrew - 3K sessions
    "sv",  # Swedish - 3K sessions
    "ru",  # Russian - 3K sessions
    "hu",  # Hungarian - 2K sessions
    "es",  # Spanish - 2K sessions
    "et",  # Estonian - 2K sessions
    "da",  # Danish - 2K sessions
    "sr",  # Serbian - 2K sessions
    "ro",  # Romanian - 1K sessions
    "ca",  # Catalan - 1K sessions
    "sk",  # Slovak - 900 sessions
    "it",  # Italian - 750 sessions
    "az",  # Azerbaijani - 750 sessions
    "fr",  # French - 730 sessions
    "lv",  # Latvian - 700 sessions
    "la",  # Latin - 700 sessions
    "gl",  # Galician - 600 sessions
    "mk",  # Macedonian - 600 sessions
    "uk",  # Ukrainian - 560 sessions
    "pt",  # Portuguese - 540 sessions
    "vi",  # Vietnamese - 530 sessions
    "pl",  # Polish - 420 sessions
    "hy",  # Armenian - 410 sessions
    "nb",  # Norwegian Bokmål - 400 sessions
    "sl",  # Slovenian - 380 sessions
    "nl",  # Dutch - 320 sessions
    "cs",  # Czech - 310 sessions
    "hyw",  # Western Armenian - 310 sessions
    "fa",  # Persian - 260 sessions
    "eu",  # Basque - 250 sessions
    "gd",  # Scottish Gaelic - 220 sessions
    "ga",  # Irish - 200 sessions
    "ko",  # Korean - 160 sessions
    "ka",  # Georgian - 160 sessions
    "nn",  # Norwegian Nynorsk - 140 sessions
    "is",  # Icelandic - 120 sessions
    "ckb",  # Central Kurdish - 90 sessions
    "el",  # Greek - 90 sessions
    "lt",  # Lithuanian - 80 sessions
    "pau",  # Palauan - 70 sessions
    "mn",  # Mongolian - 60 sessions
    "ia",  # Interlingua - 55 sessions
    "mi",  # Maori - 55 sessions
    "lb",  # Luxembourgish - 50 sessions
    "br",  # Breton - 40 sessions
    "ne",  # Nepali - 33 sessions
    "eo",  # Esperanto - 27 sessions
    "fy",  # Western Frisian - 22 sessions
    "nds",  # Low German - 22 sessions
    "tlh",  # Klingon - 22 sessions
    "ie",  # Interlingue - 18 sessions
    "tk",  # Turkmen - 17 sessions
    "fo",  # Faroese - 16 sessions
    "oc",  # Occitan - 16 sessions
    "fur",  # Friulian - 14 sessions
    "ltg",  # Latgalian - 11 sessions
    "qya",  # Quenya (Elvish) - 10 sessions
    "rw",  # Kinyarwanda - 5 sessions
]

# Languages that get AI-generated word art images (top 30 by traffic)
# Generating images costs ~$0.04/image via DALL-E 3, so we limit to popular languages
IMAGE_LANGUAGES = language_popularity[:30]


# print stats about how many languages we have
print("\n***********************************************")
print(f"                    STATS")
print(f"- {len(languages)} languages")
print(
    f"- {len([k for (k, v) in language_codes_5words_supplements.items() if v !=[]])} languages with supplemental words"
)
print(
    f"- The language with least words is {min(language_codes_5words, key=lambda k: len(language_codes_5words[k]))}, with {len(language_codes_5words[min(language_codes_5words, key=lambda k: len(language_codes_5words[k]))])} words"
)
print(
    f"- The language with most words is {max(language_codes_5words, key=lambda k: len(language_codes_5words[k]))}, with {len(language_codes_5words[max(language_codes_5words, key=lambda k: len(language_codes_5words[k]))])} words"
)
print(
    f"- Average number of words per language is {sum(len(language_codes_5words[l_code]) for l_code in language_codes)/len(language_codes):.2f}"
)
print(
    f"- Average length of supplemental words per language is {sum(len(language_codes_5words_supplements[l_code]) for l_code in language_codes)/len(language_codes):.2f}"
)
print(f"- There are {len(other_wordles)} other wordles")
print(f"***********************************************\n")


###############################################################################
# CLASSES
###############################################################################


class Language:
    """Holds the attributes of a language"""

    def __init__(self, language_code, word_list, keyboard_layout=None):
        """
        Populate language metadata and select the desired keyboard layout.

        Parameters:
            language_code: Two-letter language identifier (e.g. 'en').
            word_list: Base five-letter word list for the language.
            keyboard_layout: Optional layout name chosen via query/cookie.
        """
        self.language_code = language_code
        self.word_list = word_list
        self.word_list_supplement = language_codes_5words_supplements[language_code]
        self.config = language_configs[language_code]
        self.blocklist = language_blocklists[language_code]
        # Curated daily word list (if available, used instead of filtered main list)
        self.daily_words = language_daily_words.get(language_code)
        # Ordered curated schedule (highest priority for daily word selection)
        self.curated_schedule = language_curated_schedules.get(language_code)

        # Get IANA timezone from config (defaults to UTC if not specified)
        self.timezone = self.config.get("timezone", "UTC")

        # Compute current numeric offset for frontend countdown timer
        try:
            tz = ZoneInfo(self.timezone)
            offset = datetime.datetime.now(tz).utcoffset()
            self.timezone_offset = offset.total_seconds() / 3600 if offset else 0
        except Exception:
            self.timezone_offset = 0

        todays_idx = get_todays_idx(self.timezone)
        self.daily_word = self._get_daily_word(todays_idx)
        self.todays_idx = todays_idx

        self.characters = language_characters[language_code]
        # remove chars that aren't used to reduce bloat a bit
        characters_used = []
        for word in self.word_list:
            characters_used += list(word)
        characters_used = list(set(characters_used))
        self.characters = [char for char in self.characters if char in characters_used]

        keyboard_config = keyboards.get(language_code, {"default": None, "layouts": {}})
        self.keyboard_layouts = self._build_keyboard_layouts(keyboard_config)
        self.keyboard_layout_name = self._select_keyboard_layout(
            keyboard_layout, keyboard_config.get("default")
        )
        layout_meta = self.keyboard_layouts[self.keyboard_layout_name]
        self.keyboard_layout_label = layout_meta["label"]
        self.keyboard = layout_meta["rows"]

        # Build diacritic hints for keyboard keys (e.g., 'a' -> ['ä', 'à', 'â'])
        self.key_diacritic_hints = self._build_key_diacritic_hints()

    def _get_daily_word(self, day_idx):
        """Get the daily word, delegating to the shared get_word_for_day().

        This ensures the game and word subpages always agree, and that
        past words are frozen to disk so word list changes can't alter history.
        """
        return get_word_for_day(self.language_code, day_idx)

    def _build_keyboard_layouts(self, keyboard_config):
        """
        Build canonical layout metadata from the raw keyboard config.

        Ensures every layout has a label/rows and falls back to an
        auto-generated alphabetical layout when no layouts are provided.
        """
        layouts = {}
        for layout_name, layout_meta in keyboard_config.get("layouts", {}).items():
            label = layout_meta.get("label") or layout_name.replace("_", " ").title()
            rows = layout_meta.get("rows", [])
            layouts[layout_name] = {"label": label, "rows": rows}

        if not layouts:
            layouts["alphabetical"] = {
                "label": "Alphabetical",
                "rows": self._generate_alphabetical_keyboard(),
            }
        return layouts

    def _select_keyboard_layout(self, requested_layout, default_layout):
        """
        Choose the active keyboard layout in priority order.

        Prefers the user-requested layout, then the config default,
        and finally falls back to the first available layout.
        """
        if requested_layout and requested_layout in self.keyboard_layouts:
            return requested_layout
        if default_layout and default_layout in self.keyboard_layouts:
            return default_layout
        return next(iter(self.keyboard_layouts))

    def _generate_alphabetical_keyboard(self):
        keyboard = []
        for i, c in enumerate(self.characters):
            if i % 10 == 0:
                keyboard.append([])
            keyboard[-1].append(c)
        if not keyboard:
            return keyboard
        keyboard[-1].insert(0, "⇨")
        keyboard[-1].append("⌫")

        # Deal with bottom row being too crammed:
        if len(keyboard) >= 2 and len(keyboard[-1]) == 11:
            popped_c = keyboard[-1].pop(1)
            keyboard[-2].insert(-1, popped_c)
        if len(keyboard) >= 3 and len(keyboard[-1]) == 12:
            popped_c = keyboard[-2].pop(0)
            keyboard[-3].insert(-1, popped_c)
            popped_c = keyboard[-1].pop(2)
            keyboard[-2].insert(-1, popped_c)
            popped_c = keyboard[-1].pop(2)
            keyboard[-2].insert(-1, popped_c)
        return keyboard

    def _build_key_diacritic_hints(self):
        """
        Build a mapping of keyboard keys to their diacritic equivalents.

        If the language has a diacritic_map (e.g., {'a': ['ä', 'à']}),
        this returns a dict like {'a': {'text': 'äà', 'above': False}}
        for display as hints on keys.

        When there are 4+ variants, the hint is shown above the main letter
        to accommodate the longer text.
        """
        diacritic_map = self.config.get("diacritic_map", {})
        if not diacritic_map:
            return {}

        # Get all keys on the current keyboard
        keyboard_keys = set()
        for row in self.keyboard:
            for key in row:
                keyboard_keys.add(key.lower())

        hints = {}
        for base_char, variants in diacritic_map.items():
            if base_char.lower() in keyboard_keys:
                # Show all variants (up to 5), position above if 4+
                num_variants = len(variants)
                hint_str = "".join(variants[:5])
                if num_variants > 5:
                    hint_str += "…"
                hints[base_char.lower()] = {
                    "text": hint_str,
                    "above": num_variants >= 4,
                }
        return hints


###############################################################################
# SERVER-SIDE DEFINITION CACHING
###############################################################################


def fetch_definition_cached(word, lang_code):
    """Fetch definition from Wiktionary with disk caching. Delegates to webapp.wiktionary."""
    return _fetch_definition_cached_impl(word, lang_code, cache_dir=WORD_DEFS_DIR)


###############################################################################
# ANONYMOUS STATS COLLECTION
###############################################################################

# In-memory IP dedup (resets on restart, never persisted)
# Bounded to 50k entries to prevent memory exhaustion under attack.
_STATS_MAX_IPS = 50_000
_stats_seen_ips = {}
_stats_seen_day = None  # Track current day to clear stale entries


def _load_word_stats(lang_code, day_idx):
    """Load stats for a specific word/day."""
    stats_path = os.path.join(WORD_STATS_DIR, lang_code, f"{day_idx}.json")
    if os.path.exists(stats_path):
        try:
            with open(stats_path, "r") as f:
                return json.load(f)
        except Exception:
            pass
    return None


def _update_word_stats(lang_code, day_idx, won, attempts):
    """Atomically read-modify-write stats for a specific word/day."""
    import fcntl

    stats_dir = os.path.join(WORD_STATS_DIR, lang_code)
    stats_path = os.path.join(stats_dir, f"{day_idx}.json")
    os.makedirs(stats_dir, exist_ok=True)

    lock_path = stats_path + ".lock"
    with open(lock_path, "w") as lock_f:
        try:
            fcntl.flock(lock_f, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            return  # Another process holds the lock; skip this update

        # Read
        stats = None
        if os.path.exists(stats_path):
            try:
                with open(stats_path, "r") as f:
                    stats = json.load(f)
            except Exception:
                pass
        if not stats:
            stats = {
                "total": 0,
                "wins": 0,
                "losses": 0,
                "distribution": {"1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0},
            }

        # Update
        stats["total"] += 1
        if won:
            stats["wins"] += 1
            if isinstance(attempts, int) and 1 <= attempts <= 6:
                stats["distribution"][str(attempts)] += 1
        else:
            stats["losses"] += 1

        # Write
        with open(stats_path, "w") as f:
            json.dump(stats, f)


###############################################################################
# ROUTES
###############################################################################


# before request, redirect to https (unless localhost)
@app.before_request
def before_request():
    if (
        request.url.startswith("http://")
        and not "localhost" in request.url
        and not "127.0.0" in request.url
    ):
        url = request.url.replace("http://", "https://", 1)
        code = 301
        return redirect(url, code=code)


@app.errorhandler(404)
def page_not_found(e):
    return (
        render_template(
            "404.html",
            languages=languages,
            language_codes=language_codes,
        ),
        404,
    )


@app.route("/")
def index():
    return render_template(
        "index.html",
        languages=languages,
        language_codes=language_codes,
        language_popularity=language_popularity,
        todays_idx=get_todays_idx(),
        other_wordles=other_wordles,
        ui=default_language_config.get("ui", {}),
    )


_stats_cache = {"data": None, "ts": 0}
_STATS_CACHE_TTL = 300  # 5 minutes


def _build_stats_data():
    """Aggregate site-wide stats (cached in memory for 5 min)."""
    import time

    now = time.time()
    if _stats_cache["data"] and now - _stats_cache["ts"] < _STATS_CACHE_TTL:
        return _stats_cache["data"]

    todays_idx = get_todays_idx()
    lang_stats = []
    total_words_all = 0

    earliest_stats_idx = None

    total_daily_words_all = 0

    for lc in language_codes:
        n_words = len(language_codes_5words.get(lc, []))
        n_supplement = len(language_codes_5words_supplements.get(lc, []))
        total_words_all += n_words + n_supplement

        # Daily words and blocklist counts
        daily = language_daily_words.get(lc)
        n_daily = len(daily) if daily else 0
        n_blocklist = len(language_blocklists.get(lc, set()))
        has_schedule = bool(language_curated_schedules.get(lc))
        total_daily_words_all += n_daily if n_daily else n_words

        # Aggregate community stats from cached files (if any)
        lang_total_plays = 0
        lang_total_wins = 0
        lang_dir = os.path.join(WORD_STATS_DIR, lc)
        if os.path.isdir(lang_dir):
            for fname in os.listdir(lang_dir):
                if not fname.endswith(".json"):
                    continue
                try:
                    day = int(fname[:-5])  # strip ".json"
                except ValueError:
                    continue  # skip non-numeric filenames
                try:
                    with open(os.path.join(lang_dir, fname), "r") as f:
                        s = json.load(f)
                        lang_total_plays += s.get("total", 0)
                        lang_total_wins += s.get("wins", 0)
                    if earliest_stats_idx is None or day < earliest_stats_idx:
                        earliest_stats_idx = day
                except (json.JSONDecodeError, OSError) as e:
                    logging.warning("Failed to load stats %s/%s: %s", lc, fname, e)

        lang_stats.append(
            {
                "code": lc,
                "name": languages[lc]["language_name"],
                "name_native": languages[lc].get("language_name_native", ""),
                "n_words": n_words,
                "n_supplement": n_supplement,
                "n_daily": n_daily,
                "n_blocklist": n_blocklist,
                "has_schedule": has_schedule,
                "total_plays": lang_total_plays,
                "total_wins": lang_total_wins,
                "win_rate": (
                    round(lang_total_wins / lang_total_plays * 100)
                    if lang_total_plays > 0
                    else None
                ),
            }
        )
    lang_stats.sort(key=lambda x: x["n_words"], reverse=True)

    global_plays = sum(ls["total_plays"] for ls in lang_stats)
    global_wins = sum(ls["total_wins"] for ls in lang_stats)

    # Convert earliest stats day_idx to a date string
    stats_since_date = None
    if earliest_stats_idx is not None:
        stats_since_date = idx_to_date(earliest_stats_idx).strftime("%B %d, %Y")

    # Count languages with curated daily words
    n_curated = sum(1 for ls in lang_stats if ls["n_daily"] > 0)

    data = {
        "lang_stats": lang_stats,
        "total_languages": len(language_codes),
        "total_words": total_words_all,
        "total_daily_words": total_daily_words_all,
        "n_curated": n_curated,
        "total_puzzles": todays_idx * len(language_codes),
        "todays_idx": todays_idx,
        "global_plays": global_plays,
        "global_wins": global_wins,
        "global_win_rate": (round(global_wins / global_plays * 100) if global_plays > 0 else None),
        "stats_since_date": stats_since_date,
    }
    _stats_cache["data"] = data
    _stats_cache["ts"] = now
    return data


@app.route("/stats")
def stats():
    """Site-wide statistics page — language stats and community play data."""
    data = _build_stats_data()
    return render_template("stats.html", **data)


# robots.txt and llms.txt
@app.route("/robots.txt")
def robots_txt():
    content = """User-agent: *
Allow: /
Disallow: /*/api/

Sitemap: https://wordle.global/sitemap.xml
"""
    response = make_response(content)
    response.headers["Content-Type"] = "text/plain"
    return response


@app.route("/llms.txt")
def llms_txt():
    content = f"""# Wordle Global

> Free, open-source Wordle in {len(language_codes)}+ languages. A new 5-letter word to guess every day.

Play at https://wordle.global

## Languages

{chr(10).join(f"- [{languages[lc]['language_name']}](https://wordle.global/{lc})" for lc in sorted(language_codes))}

## About

- Each day has a new 5-letter word to guess in 6 tries
- Green = correct letter in correct position
- Yellow = correct letter in wrong position
- Gray = letter not in the word
- Free, no account required, works offline (PWA)
- Open source: https://github.com/Hugo0/wordle
"""
    response = make_response(content)
    response.headers["Content-Type"] = "text/plain; charset=utf-8"
    return response


# sitemap — one child sitemap per language for fast, small responses
SITEMAP_BASE_URL = "https://wordle.global"


@app.route("/sitemap.xml")
def sitemap_index():
    """Sitemap index: main + one word sitemap per language."""
    todays_idx = get_todays_idx()
    today_str = idx_to_date(todays_idx).strftime("%Y-%m-%d")
    sorted_langs = sorted(language_codes)

    response = make_response(
        render_template(
            "sitemap_index.xml",
            base_url=SITEMAP_BASE_URL,
            languages=sorted_langs,
            lastmod=today_str,
        )
    )
    response.headers["Content-Type"] = "application/xml"
    return response


@app.route("/sitemap-main.xml")
def sitemap_main():
    """Sitemap for homepage, language pages, and words hub pages."""
    import math

    todays_idx = get_todays_idx()
    hub_total_pages = math.ceil(todays_idx / 30) if todays_idx > 0 else 1
    response = make_response(
        render_template(
            "sitemap_main.xml",
            languages=languages,
            hub_total_pages=hub_total_pages,
            base_url=SITEMAP_BASE_URL,
        )
    )
    response.headers["Content-Type"] = "application/xml"
    return response


@app.route("/sitemap-words-<lang_code>.xml")
def sitemap_words(lang_code):
    """Sitemap for word subpages of a single language."""
    if lang_code not in language_codes:
        return "Not found", 404

    todays_idx = get_todays_idx()
    word_pages = []
    for d_idx in range(todays_idx, 0, -1):
        d_date = idx_to_date(d_idx).strftime("%Y-%m-%d")
        age_ratio = (todays_idx - d_idx) / max(todays_idx, 1)
        priority = round(max(0.3, 1.0 - age_ratio * 0.7), 1)
        word_pages.append(
            {
                "lang": lang_code,
                "day_idx": d_idx,
                "date": d_date,
                "priority": priority,
            }
        )

    response = make_response(
        render_template(
            "sitemap_words.xml",
            base_url=SITEMAP_BASE_URL,
            word_pages=word_pages,
        )
    )
    response.headers["Content-Type"] = "application/xml"
    return response


@app.route("/<lang_code>/words")
def language_words_hub(lang_code):
    """Gallery of all historical daily words for a language."""
    if lang_code not in language_codes:
        abort(404)

    config = language_configs[lang_code]
    lang_name = config.get("name", lang_code)
    lang_name_native = config.get("name_native", lang_name)
    tz = config.get("timezone", "UTC")
    todays_idx = get_todays_idx(tz)

    # Pagination: 30 words per page, page 1 = most recent
    page = request.args.get("page", 1, type=int)
    per_page = 30
    total_pages = max(1, (todays_idx + per_page - 1) // per_page)
    page = max(1, min(page, total_pages))

    start_idx = todays_idx - (page - 1) * per_page
    end_idx = max(1, start_idx - per_page + 1)

    words = []
    for day_idx in range(start_idx, end_idx - 1, -1):
        word = get_word_for_day(lang_code, day_idx)
        word_date = idx_to_date(day_idx)

        # Load definition: disk cache first, then kaikki pre-built
        definition = None
        def_path = os.path.join(WORD_DEFS_DIR, lang_code, f"{word.lower()}.json")
        if os.path.exists(def_path):
            try:
                with open(def_path, "r") as f:
                    loaded = json.load(f)
                    if loaded and loaded.get("definition"):
                        definition = loaded
            except Exception:
                pass
        if not definition:
            definition = lookup_kaikki_native(word, lang_code)
        if not definition:
            definition = lookup_kaikki_english(word, lang_code)

        word_stats = _load_word_stats(lang_code, day_idx)

        words.append(
            {
                "day_idx": day_idx,
                "word": word,
                "date": word_date,
                "definition": definition,
                "stats": word_stats,
            }
        )

    return render_template(
        "words_hub.html",
        lang_code=lang_code,
        lang_name=lang_name,
        lang_name_native=lang_name_native,
        words=words,
        page=page,
        total_pages=total_pages,
        todays_idx=todays_idx,
        config=config,
        hreflang_url_pattern="https://wordle.global/{lang}/words",
    )


# arbitrary app route
@app.route("/<lang_code>")
def language(lang_code):
    if lang_code not in language_codes:
        abort(404)
    word_list = language_codes_5words[lang_code]
    cookie_key = f"keyboard_layout_{lang_code}"
    requested_layout = request.args.get("layout") or request.cookies.get(cookie_key)
    language = Language(lang_code, word_list, requested_layout)
    response = make_response(render_template("game.html", language=language))
    selected_layout = language.keyboard_layout_name
    if request.cookies.get(cookie_key) != selected_layout:
        response.set_cookie(
            cookie_key,
            selected_layout,
            max_age=60 * 60 * 24 * 365,
            samesite="Lax",
        )
    return response


###############################################################################
# AI WORD ART IMAGE GENERATION
###############################################################################


def build_image_prompt(word, definition_hint=""):
    """Build the DALL-E prompt for a word image."""
    return (
        f"A painterly illustration representing the concept of "
        f"{word}{definition_hint}. "
        f"No text, no letters, no words, no UI elements."
    )


def generate_word_image(word, definition_hint, api_key, cache_dir, cache_path):
    """Generate a word art image via DALL-E and save as WebP. Returns 'ok' or error string."""
    import tempfile

    import openai

    try:
        client = openai.OpenAI(api_key=api_key)
        prompt = build_image_prompt(word, definition_hint)

        response = client.images.generate(
            model="dall-e-3",
            prompt=prompt,
            size="1024x1024",
            quality="standard",
            n=1,
        )

        image_url = response.data[0].url
        if not image_url or not image_url.startswith("https://"):
            return "no_url"

        os.makedirs(cache_dir, exist_ok=True)

        from PIL import Image

        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
            tmp_path = tmp.name
            req = urlreq.Request(image_url)
            with urlreq.urlopen(req, timeout=30) as resp:
                tmp.write(resp.read())

        try:
            with Image.open(tmp_path) as img:
                img.save(cache_path, "WebP", quality=80)
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)

        return "ok"
    except (openai.OpenAIError, urlreq.URLError, IOError, OSError) as e:
        logging.error(f"Image generation failed for {word}: {e}")
        return "error"


@app.route("/<lang_code>/api/definition/<word>")
def word_definition_api(lang_code, word):
    """Return a word definition as JSON.

    Single source of truth for definitions — used by both the game frontend
    and the word subpage (server-side rendered). Results are cached to disk.
    """
    if lang_code not in languages:
        return jsonify({"error": "unknown language"}), 404

    # Only serve definitions for valid words (daily or supplement)
    word_lower = word.lower()
    all_words = set(language_codes_5words[lang_code]) | set(
        language_codes_5words_supplements.get(lang_code, [])
    )
    if word_lower not in all_words:
        return jsonify({"error": "unknown word"}), 404

    result = fetch_definition_cached(word_lower, lang_code)
    if result:
        return jsonify(result)
    return jsonify({"error": "no definition found"}), 404


@app.route("/<lang_code>/api/word-image/<word>")
def word_image(lang_code, word):
    """Serve an AI-generated illustration for the daily word.

    Only works when OPENAI_API_KEY is set. Images are cached to disk.
    Only generates images for the current daily word (prevents abuse).
    """
    openai_key = os.environ.get("OPENAI_API_KEY")
    if not openai_key:
        abort(404)

    if lang_code not in language_codes:
        abort(404)

    # Only generate images for top languages (cost control)
    if lang_code not in IMAGE_LANGUAGES:
        # Still serve cached images if they exist
        cache_dir = os.path.join(WORD_IMAGES_DIR, lang_code)
        cache_path = os.path.join(cache_dir, f"{word.lower()}.webp")
        if os.path.exists(cache_path):
            return send_from_directory(cache_dir, f"{word.lower()}.webp")
        return "Image not available for this language", 404

    # Verify word is/was a daily word (prevents generating images for arbitrary words)
    # Accept ?day_idx= param for historical words, otherwise check today
    tz = language_configs[lang_code].get("timezone", "UTC")
    todays_idx = get_todays_idx(tz)
    day_idx = request.args.get("day_idx", type=int)
    if day_idx is not None:
        if day_idx < 1 or day_idx > todays_idx:
            return "Invalid day index", 403
        expected_word = get_word_for_day(lang_code, day_idx)
    else:
        day_idx = todays_idx
        expected_word = get_word_for_day(lang_code, todays_idx)
    if word.lower() != expected_word.lower():
        return "Not a valid daily word", 403

    # Check cache first
    cache_dir = os.path.join(WORD_IMAGES_DIR, lang_code)
    cache_path = os.path.join(cache_dir, f"{word.lower()}.webp")

    if os.path.exists(cache_path):
        return send_from_directory(cache_dir, f"{word.lower()}.webp")

    # Only generate images for words from Feb 21, 2026 onwards (day 1708)
    # Older words get served from cache only — no on-demand generation
    IMAGE_MIN_DAY_IDX = 1708
    if day_idx < IMAGE_MIN_DAY_IDX:
        return "Image not available for historical words", 404

    # HEAD requests just check cache — don't trigger generation
    if request.method == "HEAD":
        return "", 404

    # Skip if another request is already generating this image
    pending_path = cache_path + ".pending"
    if os.path.exists(pending_path):
        return "Image being generated", 202

    # Mark as pending to prevent duplicate DALL-E calls
    try:
        os.makedirs(cache_dir, exist_ok=True)
        open(pending_path, "x").close()
    except FileExistsError:
        return "Image being generated", 202
    except OSError:
        return "Image unavailable", 404

    try:
        # Use cached definition for DALL-E prompt (reuses disk cache)
        definition_hint = ""
        defn = fetch_definition_cached(word, lang_code)
        if defn and defn.get("definition"):
            definition_hint = f", which means {defn['definition']}"

        # Generate image via DALL-E
        result = generate_word_image(word, definition_hint, openai_key, cache_dir, cache_path)
        if result == "ok":
            return send_from_directory(cache_dir, f"{word.lower()}.webp")
        return "Image generation failed", 404
    finally:
        if os.path.exists(pending_path):
            os.unlink(pending_path)


@app.route("/<lang_code>/word/<int:day_idx>")
def word_page(lang_code, day_idx):
    """Serve a shareable page for a specific daily word."""
    if lang_code not in language_codes:
        abort(404)

    config = language_configs[lang_code]
    tz = config.get("timezone", "UTC")

    # Allow today's word (game reveals it after completion) and past words
    todays_idx = get_todays_idx(tz)
    if day_idx > todays_idx or day_idx < 1:
        abort(404)

    word = get_word_for_day(lang_code, day_idx)
    word_date = idx_to_date(day_idx)
    lang_name = config.get("name", lang_code)
    lang_name_native = config.get("name_native", lang_name)

    # Read definition: disk cache first, then kaikki pre-built
    definition = None
    cache_path = os.path.join(WORD_DEFS_DIR, lang_code, f"{word.lower()}.json")
    if os.path.exists(cache_path):
        try:
            with open(cache_path, "r") as f:
                loaded = json.load(f)
                definition = loaded if loaded else None
        except Exception:
            pass
    if not definition:
        definition = lookup_kaikki_native(word, lang_code)
    if not definition:
        definition = lookup_kaikki_english(word, lang_code)

    # Map language code to Wiktionary subdomain
    wikt_lang_map = {"nb": "no", "nn": "no", "hyw": "hy", "ckb": "ku"}
    wikt_lang = wikt_lang_map.get(lang_code, lang_code)

    # Load stats if available (fast — just a local file read)
    word_stats = _load_word_stats(lang_code, day_idx)

    return render_template(
        "word.html",
        lang_code=lang_code,
        lang_name=lang_name,
        lang_name_native=lang_name_native,
        day_idx=day_idx,
        word=word,
        word_date=word_date,
        definition=definition,
        word_stats=word_stats,
        todays_idx=todays_idx,
        config=config,
        wikt_lang=wikt_lang,
        hreflang_url_pattern=f"https://wordle.global/{{lang}}/word/{day_idx}",
    )


@app.route("/<lang_code>/api/word-stats", methods=["POST"])
def submit_word_stats(lang_code):
    """Accept anonymous game results for per-word statistics."""
    if lang_code not in language_codes:
        return "", 404

    try:
        data = request.get_json(silent=True)
        if not data:
            return "", 400

        day_idx = data.get("day_idx")
        attempts = data.get("attempts")
        won = data.get("won")

        if not isinstance(day_idx, int) or not isinstance(won, bool):
            return "", 400

        # Only accept stats for today's word (respect language timezone)
        tz = language_configs[lang_code].get("timezone", "UTC")
        todays_idx = get_todays_idx(tz)
        if day_idx != todays_idx:
            return "", 403

        # Client-based dedup (in-memory, resets on restart)
        global _stats_seen_day
        if _stats_seen_day != todays_idx:
            _stats_seen_ips.clear()
            _stats_seen_day = todays_idx

        client_id = data.get("client_id") or request.remote_addr or "unknown"
        if isinstance(client_id, str) and len(client_id) > 64:
            client_id = client_id[:64]
        dedup_key = f"{lang_code}:{day_idx}:{client_id}"
        if dedup_key in _stats_seen_ips:
            # Duplicate submission — return current stats without updating
            existing_stats = _load_word_stats(lang_code, day_idx)
            if existing_stats:
                return jsonify(existing_stats), 200
            return "", 200
        if len(_stats_seen_ips) < _STATS_MAX_IPS:
            _stats_seen_ips[dedup_key] = True

        try:
            _update_word_stats(lang_code, day_idx, won, attempts)
        except OSError:
            logging.warning("Disk full — stats write skipped for %s", lang_code)
        # Return updated stats so client can compute percentile
        updated_stats = _load_word_stats(lang_code, day_idx)
        if updated_stats:
            return jsonify(updated_stats), 200
        return "", 200
    except Exception:
        logging.exception("Stats submission failed for %s", lang_code)
        return "", 500


if __name__ == "__main__":
    app.run()
