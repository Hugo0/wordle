from flask import (
    Flask,
    render_template,
    make_response,
    redirect,
    request,
    send_from_directory,
)
import json
import os
import datetime
import glob
import random
import hashlib
import re
import urllib.parse
import urllib.request as urlreq
from pathlib import Path

# Load .env file if it exists (for local development)
_env_path = Path(__file__).resolve().parent.parent / ".env"
if _env_path.exists():
    with open(_env_path) as _f:
        for _line in _f:
            _line = _line.strip()
            if _line and not _line.startswith("#") and "=" in _line:
                _key, _, _val = _line.partition("=")
                os.environ.setdefault(_key.strip(), _val.strip())

# Persistent data directory — /data in production (Render disk), local fallback for dev
DATA_DIR = os.environ.get("DATA_DIR", os.path.join(os.path.dirname(__file__), "static"))
WORD_IMAGES_DIR = os.path.join(DATA_DIR, "word-images")
WORD_DEFS_DIR = os.path.join(DATA_DIR, "word-defs")
WORD_STATS_DIR = os.path.join(DATA_DIR, "word-stats")

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


def get_todays_idx(timezone_offset_hours: int = 0):
    """Calculate the daily word index based on timezone.

    Args:
        timezone_offset_hours: Hours offset from UTC (e.g., +2 for Finland, -5 for EST)

    Returns:
        The word index for "today" in the specified timezone
    """
    # Get current UTC time and apply timezone offset
    utc_now = datetime.datetime.utcnow()
    local_now = utc_now + datetime.timedelta(hours=timezone_offset_hours)

    # Calculate days since epoch in the local timezone
    n_days = (local_now - datetime.datetime(1970, 1, 1)).days
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


def get_word_for_day(lang_code, day_idx):
    """Get the daily word for a specific language and day index.

    Standalone version of Language._get_daily_word() that doesn't require
    full Language initialization (avoids keyboard/character overhead).
    """
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

# Languages that get AI-generated word art images (top 10 by traffic)
# Generating images costs ~$0.04/image via DALL-E 3, so we limit to popular languages
IMAGE_LANGUAGES = language_popularity[:10]

# status
with open("../scripts/out/status_list.txt", "r") as f:
    status_list = [line.strip() for line in f]
    status_list_str = ""
    for status in status_list:
        status_list_str += f"<option value='{status}'>{status}{'&nbsp;'*(20-len(status))}</option>"
    status_list_str += (
        "<a href='https://github.com/Hugo0/wordle' target='_blank'>more at Github</a>"
    )

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

        # Get timezone offset from config (defaults to 0/UTC if not specified)
        self.timezone_offset = self.config.get("timezone_offset", 0)

        todays_idx = get_todays_idx(self.timezone_offset)
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
        """Get the daily word using the appropriate algorithm and word list.

        Word list priority (for days > MIGRATION_DAY_IDX):
        1. Ordered curated_schedule (if exists and not exhausted) - hand-picked words
        2. Curated daily_words list (if exists) - high quality pool
        3. Main word_list filtered by blocklist - fallback

        For backwards compatibility:
        - Days <= MIGRATION_DAY_IDX: Use legacy shuffle algorithm on main word_list
        - Days > MIGRATION_DAY_IDX: Use new algorithm with priority above
        """
        if day_idx <= MIGRATION_DAY_IDX:
            # Legacy algorithm for past days (preserves history)
            # IMPORTANT: No blocklist for past days - we must return exactly
            # what was shown historically, even if it's a "bad" word
            return get_daily_word_legacy(self.word_list, set(), day_idx)  # Empty blocklist!
        else:
            # New algorithm for future days
            schedule_idx = day_idx - MIGRATION_DAY_IDX - 1  # 0-indexed from day 1682

            # Priority 1: Ordered curated schedule (positional selection)
            if self.curated_schedule and schedule_idx < len(self.curated_schedule):
                return self.curated_schedule[schedule_idx]

            # Priority 2: Curated daily_words with consistent hashing
            if self.daily_words:
                return get_daily_word_consistent_hash(
                    self.daily_words, set(), day_idx, self.language_code
                )

            # Priority 3: Filtered main list with consistent hashing
            return get_daily_word_consistent_hash(
                self.word_list, self.blocklist, day_idx, self.language_code
            )

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
    """Fetch definition from Wiktionary with disk caching.

    Returns dict with keys: definition, part_of_speech, source, url.
    Returns None if no definition found.
    """
    cache_dir = os.path.join(WORD_DEFS_DIR, lang_code)
    cache_path = os.path.join(cache_dir, f"{word.lower()}.json")

    # Check cache first
    if os.path.exists(cache_path):
        try:
            with open(cache_path, "r") as f:
                return json.load(f)
        except Exception:
            pass

    # Try English Wiktionary REST API
    result = None
    try:
        url = f"https://en.wiktionary.org/api/rest_v1/page/definition/{urllib.parse.quote(word.lower())}"
        req = urlreq.Request(url, headers={"User-Agent": "WordleGlobal/1.0"})
        with urlreq.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read())
            # Try target language first, then English
            for try_lang in [lang_code, "en"]:
                entries = data.get(try_lang, [])
                if entries and entries[0].get("definitions"):
                    raw_def = entries[0]["definitions"][0].get("definition", "")
                    clean_def = re.sub(r"<[^>]+>", "", raw_def).strip()
                    if clean_def:
                        result = {
                            "definition": clean_def[:300],
                            "part_of_speech": entries[0].get("partOfSpeech"),
                            "source": "english",
                            "url": f"https://en.wiktionary.org/wiki/{urllib.parse.quote(word.lower())}",
                        }
                        break
    except Exception:
        pass

    # Cache result (even None as empty object to avoid re-fetching)
    try:
        os.makedirs(cache_dir, exist_ok=True)
        with open(cache_path, "w") as f:
            json.dump(result or {}, f)
    except IOError:
        pass

    return result


###############################################################################
# ANONYMOUS STATS COLLECTION
###############################################################################

# In-memory IP dedup (resets on restart, never persisted)
_stats_seen_ips = {}


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


def _save_word_stats(lang_code, day_idx, stats):
    """Save stats for a specific word/day."""
    stats_dir = os.path.join(WORD_STATS_DIR, lang_code)
    stats_path = os.path.join(stats_dir, f"{day_idx}.json")
    try:
        os.makedirs(stats_dir, exist_ok=True)
        with open(stats_path, "w") as f:
            json.dump(stats, f)
    except IOError:
        pass


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


@app.route("/stats")
def stats():
    return status_list_str


# sitemap
@app.route("/sitemap.xml")
def site_map():
    # Generate word page entries for the last 90 days across all languages
    todays_idx = get_todays_idx()
    word_pages = []
    for day_offset in range(0, 91):  # Include today
        d_idx = todays_idx - day_offset
        if d_idx < 1:
            break
        d_date = idx_to_date(d_idx).strftime("%Y-%m-%d")
        for lang in language_codes:
            word_pages.append({"lang": lang, "day_idx": d_idx, "date": d_date})

    response = make_response(
        render_template(
            "sitemap.xml",
            languages=languages,
            base_url="https://wordle.global",
            word_pages=word_pages,
        )
    )
    response.headers["Content-Type"] = "application/xml"
    return response


# arbitrary app route
@app.route("/<lang_code>")
def language(lang_code):
    if lang_code not in language_codes:
        return "Language not found"
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
        f"A stylized 3D render of a single object that represents "
        f"{word}{definition_hint}. "
        f"Smooth rounded shapes, cheerful pastel colors, "
        f"clean white background, centered composition. "
        f"No text, no letters, no UI elements."
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
        if not image_url:
            return "no_url"

        os.makedirs(cache_dir, exist_ok=True)

        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
            tmp_path = tmp.name
            urlreq.urlretrieve(image_url, tmp_path)

        try:
            from PIL import Image

            with Image.open(tmp_path) as img:
                img.save(cache_path, "WebP", quality=80)
        except ImportError:
            import shutil as _shutil

            _shutil.move(tmp_path, cache_path)
            tmp_path = None
        finally:
            if tmp_path and os.path.exists(tmp_path):
                os.unlink(tmp_path)

        return "ok"
    except Exception as e:
        return f"error: {e}"


@app.route("/<lang_code>/api/word-image/<word>")
def word_image(lang_code, word):
    """Serve an AI-generated illustration for the daily word.

    Only works when OPENAI_API_KEY is set. Images are cached to disk.
    Only generates images for the current daily word (prevents abuse).
    """
    openai_key = os.environ.get("OPENAI_API_KEY")
    if not openai_key:
        return "Image generation not configured", 404

    if lang_code not in language_codes:
        return "Language not found", 404

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
    todays_idx = get_todays_idx()
    day_idx = request.args.get("day_idx", type=int)
    if day_idx is not None:
        if day_idx < 1 or day_idx > todays_idx:
            return "Invalid day index", 403
        expected_word = get_word_for_day(lang_code, day_idx)
    else:
        expected_word = get_word_for_day(lang_code, todays_idx)
    if word.lower() != expected_word.lower():
        return "Not a valid daily word", 403

    # Check cache first
    cache_dir = os.path.join(WORD_IMAGES_DIR, lang_code)
    cache_path = os.path.join(cache_dir, f"{word.lower()}.webp")

    if os.path.exists(cache_path):
        return send_from_directory(cache_dir, f"{word.lower()}.webp")

    # HEAD requests just check cache — don't trigger generation
    if request.method == "HEAD":
        return "", 404

    # Skip if another request is already generating this image
    pending_path = cache_path + ".pending"
    if os.path.exists(pending_path):
        return "Image being generated", 202

    # Mark as pending to prevent duplicate DALL-E calls
    os.makedirs(cache_dir, exist_ok=True)
    try:
        open(pending_path, "x").close()
    except FileExistsError:
        return "Image being generated", 202

    try:
        # Use cached definition for prompt context
        definition_hint = ""
        cached_def = fetch_definition_cached(word, lang_code)
        if cached_def and cached_def.get("definition"):
            definition_hint = f", which means {cached_def['definition']}"

        # Generate image via DALL-E
        result = generate_word_image(word, definition_hint, openai_key, cache_dir, cache_path)
        if result == "ok":
            return send_from_directory(cache_dir, f"{word.lower()}.webp")
        return "Image generation failed", 500
    finally:
        if os.path.exists(pending_path):
            os.unlink(pending_path)


@app.route("/<lang_code>/word/<int:day_idx>")
def word_page(lang_code, day_idx):
    """Serve a shareable page for a specific daily word."""
    if lang_code not in language_codes:
        return "Language not found", 404

    # Allow today's word (game reveals it after completion) and past words
    todays_idx = get_todays_idx()
    if day_idx > todays_idx or day_idx < 1:
        return "Word not available yet", 404

    word = get_word_for_day(lang_code, day_idx)
    word_date = idx_to_date(day_idx)
    config = language_configs[lang_code]
    lang_name = config.get("name", lang_code)
    lang_name_native = config.get("name_native", lang_name)

    # Fetch definition (cached)
    definition = fetch_definition_cached(word, lang_code)

    # Load stats if available
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

        # Only accept stats for today's word
        todays_idx = get_todays_idx()
        if day_idx != todays_idx:
            return "", 403

        # IP-based dedup (in-memory, resets on restart)
        ip = request.remote_addr or "unknown"
        dedup_key = f"{lang_code}:{day_idx}:{ip}"
        if dedup_key in _stats_seen_ips:
            return "", 200  # Silently accept duplicate
        _stats_seen_ips[dedup_key] = True

        # Load existing stats or create new
        stats = _load_word_stats(lang_code, day_idx) or {
            "total": 0,
            "wins": 0,
            "losses": 0,
            "distribution": {"1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0},
        }

        stats["total"] += 1
        if won:
            stats["wins"] += 1
            if isinstance(attempts, int) and 1 <= attempts <= 6:
                stats["distribution"][str(attempts)] += 1
        else:
            stats["losses"] += 1

        _save_word_stats(lang_code, day_idx, stats)
        return "", 200
    except Exception:
        return "", 500


if __name__ == "__main__":
    app.run()
