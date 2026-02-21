from flask import (
    Flask,
    render_template,
    make_response,
    redirect,
    url_for,
    request,
)
import json
import os
import datetime
import glob
import random
import hashlib

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
    response = make_response(
        render_template("sitemap.xml", languages=languages, base_url="https://wordle.global")
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


if __name__ == "__main__":
    app.run()
