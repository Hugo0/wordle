#!/usr/bin/env python3
"""Download kaikki.org JSONL data and extract definitions for Wordle Global word lists.

Two data sources are used, in priority order:
  1. Native editions (de, fr, es, ...) — native-language definitions from each
     language's own Wiktionary. These are large files (~50-300MB each) but give
     definitions in the word's own language.
  2. English edition — English glosses from en.wiktionary.org. Per-language files
     are smaller but definitions are in English.

Usage:
    uv run scripts/build_definitions.py download [--langs LANG1,LANG2,...] [--edition native|english|both]
    uv run scripts/build_definitions.py process [--langs LANG1,LANG2,...]
    uv run scripts/build_definitions.py stats [--langs LANG1,LANG2,...]

Subcommands:
    download  - Download kaikki.org JSONL files for our languages
    process   - Extract definitions from downloaded data into webapp/data/definitions/
    stats     - Show coverage statistics per language
"""

import argparse
import gzip
import json
import os
import sys
import urllib.parse
import urllib.request

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
LANGUAGES_DIR = os.path.join(PROJECT_ROOT, "webapp", "data", "languages")
DEFINITIONS_DIR = os.path.join(PROJECT_ROOT, "webapp", "data", "definitions")
KAIKKI_DATA_DIR = os.path.join(SCRIPT_DIR, ".kaikki_data")

# ---------------------------------------------------------------------------
# Language code -> kaikki.org language name mapping
#
# kaikki.org uses English Wiktionary language names. The deprecated per-language
# files live at:
#   https://kaikki.org/dictionary/{LangName}/kaikki.org-dictionary-{LangNameNoSpacesOrHyphens}.jsonl.gz
#
# Directory path keeps spaces (URL-encoded), but filename strips spaces AND hyphens.
# ---------------------------------------------------------------------------

LANG_CODE_TO_KAIKKI_NAME = {
    "ar": "Arabic",
    "az": "Azerbaijani",
    "bg": "Bulgarian",
    "br": "Breton",
    "ca": "Catalan",
    "ckb": "Central Kurdish",
    "cs": "Czech",
    "da": "Danish",
    "de": "German",
    "el": "Greek",
    "en": "English",
    "eo": "Esperanto",
    "es": "Spanish",
    "et": "Estonian",
    "eu": "Basque",
    "fa": "Persian",
    "fi": "Finnish",
    "fo": "Faroese",
    "fr": "French",
    "fur": "Friulian",
    "fy": "West Frisian",
    "ga": "Irish",
    "gd": "Scottish Gaelic",
    "gl": "Galician",
    "he": "Hebrew",
    "hr": "Serbo-Croatian",  # Croatian uses Serbo-Croatian in kaikki
    "hu": "Hungarian",
    "hy": "Armenian",
    "hyw": "Western Armenian",  # May not exist on kaikki
    "ia": "Interlingua",
    "ie": "Interlingue",  # May not exist on kaikki
    "is": "Icelandic",
    "it": "Italian",
    "ka": "Georgian",
    "ko": "Korean",
    "la": "Latin",
    "lb": "Luxembourgish",
    "lt": "Lithuanian",
    "ltg": "Latgalian",
    "lv": "Latvian",
    "mi": "Māori",
    "mk": "Macedonian",
    "mn": "Mongolian",
    "nb": "Norwegian Bokmål",
    "nds": "German Low German",
    "ne": "Nepali",
    "nl": "Dutch",
    "nn": "Norwegian Nynorsk",
    "oc": "Occitan",
    "pau": "Palauan",  # May not exist on kaikki
    "pl": "Polish",
    "pt": "Portuguese",
    "qya": "Quenya",  # Fictional — not on kaikki
    "ro": "Romanian",
    "ru": "Russian",
    "rw": "Kinyarwanda",  # May not exist on kaikki
    "sk": "Slovak",
    "sl": "Slovene",
    "sr": "Serbo-Croatian",  # Serbian uses Serbo-Croatian in kaikki
    "sv": "Swedish",
    "tk": "Turkmen",
    "tlh": "Klingon",  # Fictional — not on kaikki
    "tr": "Turkish",
    "uk": "Ukrainian",
    "vi": "Vietnamese",
}

# ---------------------------------------------------------------------------
# Native edition mapping: our lang_code -> Wiktionary edition code
#
# Native editions give definitions in the word's own language.
# Available editions: https://kaikki.org/dictionary/rawdata.html
# URL pattern: https://kaikki.org/dictionary/downloads/{code}/{code}-extract.jsonl.gz
#
# Only languages that have a kaikki.org native edition are listed here.
# For all others, we fall back to the English edition (English glosses).
# ---------------------------------------------------------------------------

NATIVE_EDITION_MAP = {
    "cs": "cs",
    "de": "de",
    "el": "el",
    "es": "es",
    "fr": "fr",
    "it": "it",
    "ko": "ko",
    "nl": "nl",
    "pl": "pl",
    "pt": "pt",
    "ru": "ru",
    "tr": "tr",
    "vi": "vi",
    # These languages don't have their own edition but a related one covers them:
    # id -> id edition (Indonesian)
    # ku/ckb -> ku edition (Kurdish)
    # ms -> ms edition (Malay)
    # th -> th edition (Thai)
    # ja -> ja edition (Japanese) — not relevant for our 5-letter game
    # zh -> zh edition (Chinese) — not relevant for our 5-letter game
}

# Preferred POS order for selecting the best definition
POS_PRIORITY = {
    "noun": 0,
    "verb": 1,
    "adj": 2,
    "adv": 3,
    "name": 4,
    "num": 5,
    "pron": 6,
    "det": 7,
    "prep": 8,
    "conj": 9,
    "intj": 10,
    "particle": 11,
    "affix": 12,
    "prefix": 13,
    "suffix": 14,
    "phrase": 15,
    "character": 90,
    "contraction": 91,
}


def get_all_lang_codes():
    """Return sorted list of all language codes from our languages directory."""
    if not os.path.isdir(LANGUAGES_DIR):
        print(f"Error: languages directory not found: {LANGUAGES_DIR}", file=sys.stderr)
        sys.exit(1)
    return sorted(
        d for d in os.listdir(LANGUAGES_DIR) if os.path.isdir(os.path.join(LANGUAGES_DIR, d))
    )


def load_word_list(lang_code):
    """Load main word list + supplement for a language. Returns a set of lowercase words."""
    words = set()
    main_file = os.path.join(LANGUAGES_DIR, lang_code, f"{lang_code}_5words.txt")
    if os.path.isfile(main_file):
        with open(main_file, encoding="utf-8") as f:
            for line in f:
                w = line.strip()
                if w:
                    words.add(w.lower())

    supp_file = os.path.join(LANGUAGES_DIR, lang_code, f"{lang_code}_5words_supplement.txt")
    if os.path.isfile(supp_file):
        with open(supp_file, encoding="utf-8") as f:
            for line in f:
                w = line.strip()
                if w:
                    words.add(w.lower())
    return words


def kaikki_url(lang_name):
    """Build the kaikki.org download URL for a language.

    Directory path: spaces URL-encoded, hyphens kept
    Filename: spaces AND hyphens removed, special chars URL-encoded
    """
    dir_part = urllib.parse.quote(lang_name, safe="")
    # Filename strips spaces and hyphens
    filename_base = lang_name.replace(" ", "").replace("-", "")
    filename = f"kaikki.org-dictionary-{filename_base}.jsonl.gz"
    encoded_filename = urllib.parse.quote(filename, safe=".-")
    return f"https://kaikki.org/dictionary/{dir_part}/{encoded_filename}"


def download_file(url, dest_path):
    """Download a URL to a local file with progress indication."""
    print(f"  Downloading: {url}")
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "WordleGlobal/1.0"})
        with urllib.request.urlopen(req, timeout=120) as response:
            total = response.headers.get("Content-Length")
            total = int(total) if total else None
            downloaded = 0
            os.makedirs(os.path.dirname(dest_path), exist_ok=True)
            with open(dest_path, "wb") as out:
                while True:
                    chunk = response.read(1024 * 256)  # 256KB chunks
                    if not chunk:
                        break
                    out.write(chunk)
                    downloaded += len(chunk)
                    if total:
                        pct = downloaded * 100 // total
                        mb = downloaded / (1024 * 1024)
                        total_mb = total / (1024 * 1024)
                        print(
                            f"\r  {mb:.1f}/{total_mb:.1f} MB ({pct}%)",
                            end="",
                            flush=True,
                        )
            print(f"\r  Done: {downloaded / (1024 * 1024):.1f} MB" + " " * 20)
            return True
    except urllib.error.HTTPError as e:
        if e.code == 404:
            print("  Not found (404) — skipping")
            return False
        raise
    except (urllib.error.URLError, OSError) as e:
        print(f"  Error downloading: {e}")
        return False


def local_gz_path(lang_code, kaikki_name):
    """Path where we store the downloaded English edition .jsonl.gz for a language."""
    safe_name = kaikki_name.replace(" ", "_").replace("-", "_")
    return os.path.join(KAIKKI_DATA_DIR, f"{lang_code}_{safe_name}.jsonl.gz")


def native_edition_url(wikt_code):
    """Build the download URL for a native Wiktionary edition."""
    return f"https://kaikki.org/dictionary/downloads/{wikt_code}/{wikt_code}-extract.jsonl.gz"


def native_edition_path(wikt_code):
    """Path where we store the downloaded native edition .jsonl.gz."""
    return os.path.join(KAIKKI_DATA_DIR, f"native_{wikt_code}-extract.jsonl.gz")


# ---------------------------------------------------------------------------
# Subcommand: download
# ---------------------------------------------------------------------------


def cmd_download(lang_codes, force=False, edition="both"):
    """Download kaikki.org JSONL files for the given language codes."""
    os.makedirs(KAIKKI_DATA_DIR, exist_ok=True)

    # --- Native editions ---
    if edition in ("native", "both"):
        # Collect which native editions we need
        needed_editions = set()
        for lc in lang_codes:
            wikt_code = NATIVE_EDITION_MAP.get(lc)
            if wikt_code:
                needed_editions.add(wikt_code)

        if needed_editions:
            print(f"\n=== Native editions ({len(needed_editions)}) ===\n")
            for wikt_code in sorted(needed_editions):
                dest = native_edition_path(wikt_code)
                if os.path.isfile(dest) and not force:
                    size_mb = os.path.getsize(dest) / (1024 * 1024)
                    print(f"[{wikt_code}] native: already exists ({size_mb:.1f} MB)")
                    continue
                print(f"[{wikt_code}] native edition:")
                url = native_edition_url(wikt_code)
                download_file(url, dest)

    # --- English edition (per-language files) ---
    if edition in ("english", "both"):
        # Deduplicate kaikki names (hr and sr both map to Serbo-Croatian)
        seen_names = {}
        download_plan = []
        for lc in lang_codes:
            name = LANG_CODE_TO_KAIKKI_NAME.get(lc)
            if not name:
                continue
            if name in seen_names:
                continue
            seen_names[name] = lc
            download_plan.append((lc, name))

        print(f"\n=== English edition ({len(download_plan)} languages) ===\n")

        for lc, name in download_plan:
            dest = local_gz_path(lc, name)
            if os.path.isfile(dest) and not force:
                size_mb = os.path.getsize(dest) / (1024 * 1024)
                print(f"[{lc}] {name}: already exists ({size_mb:.1f} MB)")
                continue

            print(f"[{lc}] {name}:")
            url = kaikki_url(name)
            download_file(url, dest)


# ---------------------------------------------------------------------------
# Subcommand: process
# ---------------------------------------------------------------------------


def _clean_gloss(gloss):
    """Clean wiki markup artifacts from a gloss string."""
    import re

    # Remove {{ ... }} template markup
    gloss = re.sub(r"\{\{[^}]*\}\}", "", gloss)
    # Remove [[ ... ]] wiki links — keep the display text
    gloss = re.sub(r"\[\[([^\]|]*\|)?([^\]]*)\]\]", r"\2", gloss)
    # Remove stray brackets
    gloss = re.sub(r"[\[\]{}]", "", gloss)
    # Collapse whitespace
    gloss = re.sub(r"\s+", " ", gloss).strip()
    # Truncate overly long definitions (encyclopedic entries)
    if len(gloss) > 300:
        # Cut at last sentence boundary within 300 chars
        cut = gloss[:300].rfind(".")
        if cut > 100:
            gloss = gloss[: cut + 1]
        else:
            gloss = gloss[:300].rstrip() + "…"
    return gloss


import re as _re

# Bare grammatical form labels with no base-word reference (uninformative as game hints)
_BARE_FORM_RE = _re.compile(
    r"^(indefinite |definite |strong |mixed |weak )?"
    r"(nominative|accusative|dative|genitive|singular|plural|masculine|feminine|neuter|"
    r"first[-/]|second[-/]|third[-/]|imperative)"
    r"",
    _re.IGNORECASE,
)

# Form-of references that provide no real meaning
_FORM_OF_RE = _re.compile(
    r"^(alternative (form|spelling)|misspelling|obsolete (form|spelling)|"
    r"archaic (form|spelling)|clipping|abbreviation|initialism) of\b",
    _re.IGNORECASE,
)


# Cross-reference entries that provide no definition
_CROSS_REF_RE = _re.compile(r"^See \w+\.?$", _re.IGNORECASE)

# Sense tags indicating offensive/inappropriate content
_OFFENSIVE_TAGS = {"derogatory", "offensive", "slur", "vulgar", "pejorative"}


def _is_unhelpful_gloss(gloss):
    """Return True if a gloss is a bare grammatical form or unhelpful form-of reference."""
    if _BARE_FORM_RE.match(gloss):
        # Allow if it also contains "of " (i.e. references the base word)
        if " of " not in gloss.lower():
            return True
    if _FORM_OF_RE.match(gloss):
        return True
    if _CROSS_REF_RE.match(gloss):
        return True
    return False


def _is_offensive_sense(sense):
    """Return True if a sense is tagged as offensive/derogatory/vulgar."""
    tags = set(sense.get("tags", []))
    return bool(tags & _OFFENSIVE_TAGS)


def extract_best_gloss(senses, word=None):
    """Extract the first non-empty gloss from senses, preferring informative ones.

    Skips senses tagged as offensive/derogatory/vulgar. If ALL senses are
    offensive, returns None (word gets no definition rather than a slur).
    """
    for sense in senses:
        # Skip offensive senses — prefer clean definitions
        if _is_offensive_sense(sense):
            continue
        glosses = sense.get("glosses", [])
        if glosses:
            gloss = glosses[-1]  # Last gloss is usually most specific
            if not gloss or len(gloss) < 3:
                continue
            gloss = _clean_gloss(gloss)
            if not gloss or len(gloss) < 3:
                continue
            # Skip self-referential definitions (word == definition)
            if word and gloss.lower().strip().rstrip(".") == word.lower():
                continue
            # Skip bare grammatical forms and unhelpful form-of references
            if _is_unhelpful_gloss(gloss):
                continue
            return gloss
    return None


def process_jsonl_gz(gz_path, target_words, lang_code_filter=None):
    """Process a gzipped JSONL file and extract definitions for target words.

    Returns dict: {word: {"definition": str, "pos": str, "priority": int}}
    """
    results = {}

    with gzip.open(gz_path, "rt", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                entry = json.loads(line)
            except json.JSONDecodeError:
                continue

            word = entry.get("word", "").lower()
            if word not in target_words:
                continue

            # If we have a lang_code filter, check it
            if lang_code_filter and entry.get("lang_code") != lang_code_filter:
                continue

            pos = entry.get("pos", "unknown")
            priority = POS_PRIORITY.get(pos, 50)
            senses = entry.get("senses", [])
            gloss = extract_best_gloss(senses, word=word)

            if not gloss:
                continue

            # Keep the entry with best POS priority
            if word in results:
                if priority >= results[word]["priority"]:
                    continue

            results[word] = {
                "definition": gloss,
                "pos": pos,
                "priority": priority,
            }

    return results


def cmd_process(lang_codes):
    """Process downloaded JSONL data and write definition files.

    Priority: native edition definitions > English edition definitions.
    Native editions give definitions in the word's own language.
    English editions give English glosses as a fallback.
    """
    os.makedirs(DEFINITIONS_DIR, exist_ok=True)

    print(f"\nProcessing definitions for {len(lang_codes)} languages...\n")

    for lc in sorted(lang_codes):
        words = load_word_list(lc)
        if not words:
            print(f"  [{lc}] No words found — skipping")
            continue

        native_defs = {}
        english_defs = {}

        # --- Try native edition first ---
        wikt_code = NATIVE_EDITION_MAP.get(lc)
        if wikt_code:
            gz_path = native_edition_path(wikt_code)
            if os.path.isfile(gz_path):
                native_defs = process_jsonl_gz(gz_path, words, lang_code_filter=lc)

        # --- Try English edition as fallback ---
        kaikki_name = LANG_CODE_TO_KAIKKI_NAME.get(lc)
        if kaikki_name:
            gz_path = _find_english_edition_file(lc, kaikki_name)
            if gz_path:
                english_defs = process_jsonl_gz(gz_path, words)

        # For English, the English edition IS the native language
        if lc == "en":
            native_defs = english_defs
            english_defs = {}

        # --- Merge into two tiers: native and english ---
        # Separate files so the runtime can prioritize native > parser > english
        native_out = {}
        english_out = {}
        for w in sorted(words):
            if w in native_defs:
                native_out[w] = native_defs[w]["definition"]
            if w in english_defs and w not in native_defs:
                english_out[w] = english_defs[w]["definition"]

        # Write native definitions
        native_path = os.path.join(DEFINITIONS_DIR, f"{lc}.json")
        if native_out:
            with open(native_path, "w", encoding="utf-8") as f:
                json.dump(native_out, f, ensure_ascii=False, indent=1, sort_keys=True)
        elif os.path.isfile(native_path):
            os.remove(native_path)  # Clean up stale file from previous runs

        # Write English glosses separately
        if english_out:
            out_path = os.path.join(DEFINITIONS_DIR, f"{lc}_en.json")
            with open(out_path, "w", encoding="utf-8") as f:
                json.dump(english_out, f, ensure_ascii=False, indent=1, sort_keys=True)
        else:
            stale = os.path.join(DEFINITIONS_DIR, f"{lc}_en.json")
            if os.path.isfile(stale):
                os.remove(stale)

        n_native = len(native_out)
        n_english = len(english_out)
        total = n_native + n_english
        coverage = total * 100 / len(words) if words else 0
        parts = []
        if n_native:
            parts.append(f"{n_native} native")
        if n_english:
            parts.append(f"{n_english} en")
        tag = f" ({', '.join(parts)})" if parts else ""
        print(f"  [{lc}] {total}/{len(words)} ({coverage:.0f}%){tag}")

    print(f"\nDefinitions written to: {DEFINITIONS_DIR}")


def _find_english_edition_file(lang_code, kaikki_name):
    """Find the downloaded English edition file for a language."""
    candidate = local_gz_path(lang_code, kaikki_name)
    if os.path.isfile(candidate):
        return candidate
    # Check other lang codes that share the same kaikki name (e.g., hr/sr -> Serbo-Croatian)
    for other_lc, name in LANG_CODE_TO_KAIKKI_NAME.items():
        if name == kaikki_name:
            candidate = local_gz_path(other_lc, name)
            if os.path.isfile(candidate):
                return candidate
    return None


# ---------------------------------------------------------------------------
# Subcommand: stats
# ---------------------------------------------------------------------------


def cmd_stats(lang_codes):
    """Show coverage statistics for existing definition files."""
    print(f"\n{'Lang':<6} {'Words':>7} {'Defs':>7} {'Coverage':>9}  Status")
    print("-" * 50)

    total_words = 0
    total_defs = 0
    langs_with_defs = 0
    langs_without = 0

    for lc in lang_codes:
        words = load_word_list(lc)
        n_words = len(words)
        total_words += n_words

        defs = {}
        native_path = os.path.join(DEFINITIONS_DIR, f"{lc}.json")
        en_path = os.path.join(DEFINITIONS_DIR, f"{lc}_en.json")
        if os.path.isfile(native_path):
            with open(native_path, encoding="utf-8") as f:
                defs.update(json.load(f))
        if os.path.isfile(en_path):
            with open(en_path, encoding="utf-8") as f:
                defs.update(json.load(f))
        if defs:
            n_defs = len(defs)
            total_defs += n_defs
            coverage = n_defs * 100 / n_words if n_words else 0
            status = "ok" if coverage > 50 else "low"
            print(f"{lc:<6} {n_words:>7} {n_defs:>7} {coverage:>8.1f}%  {status}")
            langs_with_defs += 1
        else:
            print(f"{lc:<6} {n_words:>7}       -         -  no data")
            langs_without += 1

    print("-" * 50)
    overall = total_defs * 100 / total_words if total_words else 0
    print(f"{'TOTAL':<6} {total_words:>7} {total_defs:>7} {overall:>8.1f}%")
    print(f"\nLanguages with definitions: {langs_with_defs}")
    print(f"Languages without data: {langs_without}")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def parse_args():
    parser = argparse.ArgumentParser(
        description="Download and extract definitions from kaikki.org for Wordle Global"
    )
    sub = parser.add_subparsers(dest="command", required=True)

    for name, help_text in [
        ("download", "Download kaikki.org JSONL files"),
        ("process", "Process downloaded data into definition files"),
        ("stats", "Show coverage statistics"),
    ]:
        sp = sub.add_parser(name, help=help_text)
        sp.add_argument(
            "--langs",
            type=str,
            default=None,
            help="Comma-separated list of language codes (default: all)",
        )
        sp.add_argument(
            "--force",
            action="store_true",
            help="Force re-download even if files exist (download only)",
        )
        sp.add_argument(
            "--edition",
            choices=["native", "english", "both"],
            default="both",
            help="Which editions to download: native, english, or both (default: both)",
        )

    return parser.parse_args()


def main():
    args = parse_args()

    all_codes = get_all_lang_codes()
    if args.langs:
        lang_codes = [lc.strip() for lc in args.langs.split(",")]
        # Validate
        for lc in lang_codes:
            if lc not in all_codes:
                print(f"Warning: '{lc}' not found in {LANGUAGES_DIR}", file=sys.stderr)
    else:
        lang_codes = all_codes

    print(f"Languages: {len(lang_codes)} selected")

    if args.command == "download":
        cmd_download(lang_codes, force=args.force, edition=args.edition)
    elif args.command == "process":
        cmd_process(lang_codes)
    elif args.command == "stats":
        cmd_stats(lang_codes)


if __name__ == "__main__":
    main()
