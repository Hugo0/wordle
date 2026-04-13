#!/usr/bin/env python3
"""Import structured dictionary data from kaikki.org into the definitions table.

Downloads kaikki.org JSONL dumps, extracts rich structured data (all senses,
etymology, IPA, forms, translations) for words in our word lists, and upserts
into the Postgres `definitions` table's dictionary columns.

Two editions:
  1. Native (de, fr, es, ...) — definitions in the word's own language
  2. English (en.wiktionary) — English glosses, also has translations

Usage:
    uv run scripts/import_dictionary.py download [--langs LANG1,LANG2,...] [--edition native|english|both]
    uv run scripts/import_dictionary.py process [--langs LANG1,LANG2,...]
    uv run scripts/import_dictionary.py upload [--langs LANG1,LANG2,...] [--dry-run]
    uv run scripts/import_dictionary.py all [--langs LANG1,LANG2,...]

Environment:
    DATABASE_URL — Postgres connection string (reads from .env)
"""

import argparse
import gzip
import html
import json
import os
import re
import sys
import urllib.parse
import urllib.request

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
LANGUAGES_DIR = os.path.join(PROJECT_ROOT, "data", "languages")
KAIKKI_DATA_DIR = os.path.join(SCRIPT_DIR, ".kaikki_data")
PROCESSED_DIR = os.path.join(SCRIPT_DIR, ".kaikki_processed")

# ---------------------------------------------------------------------------
# Language mappings (from build_definitions.py)
# ---------------------------------------------------------------------------

LANG_CODE_TO_KAIKKI_NAME = {
    "ar": "Arabic", "az": "Azerbaijani", "bg": "Bulgarian", "br": "Breton",
    "ca": "Catalan", "ckb": "Central Kurdish", "cs": "Czech", "da": "Danish",
    "de": "German", "el": "Greek", "en": "English", "eo": "Esperanto",
    "es": "Spanish", "et": "Estonian", "eu": "Basque", "fa": "Persian",
    "fi": "Finnish", "fo": "Faroese", "fr": "French", "fur": "Friulian",
    "fy": "West Frisian", "ga": "Irish", "gd": "Scottish Gaelic", "gl": "Galician",
    "he": "Hebrew", "hr": "Serbo-Croatian", "hu": "Hungarian", "hy": "Armenian",
    "hyw": "Western Armenian", "ia": "Interlingua", "ie": "Interlingue",
    "is": "Icelandic", "it": "Italian", "ka": "Georgian", "ko": "Korean",
    "la": "Latin", "lb": "Luxembourgish", "lt": "Lithuanian", "ltg": "Latgalian",
    "lv": "Latvian", "mi": "Māori", "mk": "Macedonian", "mn": "Mongolian",
    "nb": "Norwegian Bokmål", "nds": "German Low German", "ne": "Nepali",
    "nl": "Dutch", "nn": "Norwegian Nynorsk", "oc": "Occitan",
    "pau": "Palauan", "pl": "Polish", "pt": "Portuguese", "qya": "Quenya",
    "ro": "Romanian", "ru": "Russian", "rw": "Kinyarwanda", "sk": "Slovak",
    "sl": "Slovene", "sr": "Serbo-Croatian", "sv": "Swedish", "tk": "Turkmen",
    "tlh": "Klingon", "tr": "Turkish", "uk": "Ukrainian", "vi": "Vietnamese",
}

NATIVE_EDITION_MAP = {
    "cs": "cs", "de": "de", "el": "el", "es": "es", "fr": "fr",
    "it": "it", "ko": "ko", "nl": "nl", "pl": "pl", "pt": "pt",
    "ru": "ru", "tr": "tr", "vi": "vi",
}

# All our supported language codes (for filtering translations)
ALL_OUR_LANGS = set()

# Offensive sense tags — skip these
OFFENSIVE_TAGS = {"derogatory", "offensive", "slur", "vulgar", "pejorative"}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def get_all_lang_codes():
    codes = sorted(
        d for d in os.listdir(LANGUAGES_DIR)
        if os.path.isdir(os.path.join(LANGUAGES_DIR, d))
    )
    ALL_OUR_LANGS.update(codes)
    return codes


def load_word_set(lang_code):
    """Load all words for a language from words.json. Returns lowercase set."""
    words_file = os.path.join(LANGUAGES_DIR, lang_code, "words.json")
    if not os.path.isfile(words_file):
        return set()
    try:
        with open(words_file, encoding="utf-8") as f:
            data = json.load(f)
        return {w["word"].lower() for w in data.get("words", []) if w.get("word")}
    except (json.JSONDecodeError, KeyError):
        return set()


def clean_gloss(text):
    """Clean wiki markup from a gloss string."""
    text = html.unescape(text)
    text = re.sub(r"\{\{[^}]*\}\}", "", text)
    text = re.sub(r"\[\[([^\]|]*\|)?([^\]]*)\]\]", r"\2", text)
    text = re.sub(r"[\[\]{}]", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) > 300:
        cut = text[:300].rfind(".")
        text = text[: cut + 1] if cut > 100 else text[:300] + "…"
    return text


def is_unhelpful(gloss):
    """Skip bare grammatical forms and form-of references."""
    if re.match(r"^(alternative |obsolete |archaic )?(form|spelling) of\b", gloss, re.I):
        return True
    if re.match(r"^See \w+\.?$", gloss, re.I):
        return True
    return False


# ---------------------------------------------------------------------------
# Download (reuses logic from build_definitions.py)
# ---------------------------------------------------------------------------

def kaikki_url(lang_name):
    dir_part = urllib.parse.quote(lang_name, safe="")
    filename_base = lang_name.replace(" ", "").replace("-", "")
    filename = f"kaikki.org-dictionary-{filename_base}.jsonl.gz"
    return f"https://kaikki.org/dictionary/{dir_part}/{urllib.parse.quote(filename, safe='.-')}"


def native_edition_url(wikt_code):
    return f"https://kaikki.org/dictionary/downloads/{wikt_code}/{wikt_code}-extract.jsonl.gz"


def download_file(url, dest):
    print(f"  Downloading: {url}")
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "WordleGlobal/1.0"})
        with urllib.request.urlopen(req, timeout=300) as resp:
            total = resp.headers.get("Content-Length")
            total = int(total) if total else None
            downloaded = 0
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            with open(dest, "wb") as out:
                while True:
                    chunk = resp.read(256 * 1024)
                    if not chunk:
                        break
                    out.write(chunk)
                    downloaded += len(chunk)
                    if total:
                        pct = downloaded * 100 // total
                        print(f"\r  {downloaded / 1e6:.1f}/{total / 1e6:.1f} MB ({pct}%)", end="", flush=True)
            print(f"\r  Done: {downloaded / 1e6:.1f} MB" + " " * 30)
            return True
    except urllib.error.HTTPError as e:
        if e.code == 404:
            print("  Not found (404)")
            return False
        raise
    except Exception as e:
        print(f"  Error: {e}")
        return False


def cmd_download(lang_codes, edition="both"):
    os.makedirs(KAIKKI_DATA_DIR, exist_ok=True)

    if edition in ("native", "both"):
        needed = {NATIVE_EDITION_MAP[lc] for lc in lang_codes if lc in NATIVE_EDITION_MAP}
        if needed:
            print(f"\n=== Native editions ({len(needed)}) ===\n")
            for code in sorted(needed):
                dest = os.path.join(KAIKKI_DATA_DIR, f"native_{code}-extract.jsonl.gz")
                if os.path.isfile(dest):
                    print(f"[{code}] native: exists ({os.path.getsize(dest) / 1e6:.1f} MB)")
                    continue
                print(f"[{code}] native:")
                download_file(native_edition_url(code), dest)

    if edition in ("english", "both"):
        seen = {}
        plan = []
        for lc in lang_codes:
            name = LANG_CODE_TO_KAIKKI_NAME.get(lc)
            if not name or name in seen:
                continue
            seen[name] = lc
            plan.append((lc, name))

        print(f"\n=== English edition ({len(plan)} languages) ===\n")
        for lc, name in plan:
            safe = name.replace(" ", "_").replace("-", "_")
            dest = os.path.join(KAIKKI_DATA_DIR, f"{lc}_{safe}.jsonl.gz")
            if os.path.isfile(dest):
                print(f"[{lc}] {name}: exists ({os.path.getsize(dest) / 1e6:.1f} MB)")
                continue
            print(f"[{lc}] {name}:")
            download_file(kaikki_url(name), dest)


# ---------------------------------------------------------------------------
# Process — extract rich structured data
# ---------------------------------------------------------------------------

def extract_from_jsonl(gz_path, target_words, lang_code_filter=None):
    """Extract rich dictionary data from a kaikki JSONL file.

    Returns: {word: {
        "senses": [{pos, glosses: [{gloss, tags?, examples?, synonyms?}]}],
        "etymology": str | None,
        "pronunciation": str | None,
        "forms": [{form, tags}] | None,
        "translations": [{code, word}] | None,
    }}
    """
    # Accumulate entries by word — each word may have multiple POS entries
    raw = {}  # word -> [{pos, glosses, etymology, ipa, forms, translations}]

    with gzip.open(gz_path, "rt", encoding="utf-8") as f:
      try:
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

            if lang_code_filter and entry.get("lang_code") != lang_code_filter:
                continue

            pos = entry.get("pos", "unknown")

            # Etymology
            etymology = entry.get("etymology_text") or ""
            if not etymology:
                texts = entry.get("etymology_texts", [])
                if texts:
                    etymology = texts[0] if isinstance(texts, list) else ""
            etymology = html.unescape(etymology).strip() if etymology else None
            # Skip tree-format etymologies
            if etymology and (etymology.startswith("Etymology tree") or etymology.count("\n") > 3):
                etymology = None

            # IPA
            sounds = entry.get("sounds", [])
            ipas = [s["ipa"] for s in sounds if isinstance(s, dict) and "ipa" in s]
            ipa = ", ".join(ipas[:3]) if ipas else None

            # Forms — filter to useful ones (actual word forms, not metadata)
            forms_raw = entry.get("forms", [])
            forms = []
            for fm in forms_raw:
                if not isinstance(fm, dict):
                    continue
                form_text = fm.get("form", "")
                tags = fm.get("tags", [])
                # Skip metadata entries
                if any(t in tags for t in ["table-tags", "inflection-template", "class"]):
                    continue
                if not form_text or form_text.startswith("no-") or form_text.startswith("fi-"):
                    continue
                # Keep only common useful tags
                clean_tags = [t for t in tags if t not in ("declension", "conjugation", "mutation")]
                if clean_tags and form_text:
                    forms.append({"form": html.unescape(form_text), "tags": clean_tags})

            # Translations (only from English edition entries)
            trans_raw = entry.get("translations", [])
            translations = []
            for t in trans_raw:
                if not isinstance(t, dict):
                    continue
                tcode = t.get("lang_code", "")
                tword = t.get("word", "")
                if tcode and tword and tcode in ALL_OUR_LANGS:
                    translations.append({"code": tcode, "word": html.unescape(tword)})

            # Senses/glosses
            glosses = []
            for sense in entry.get("senses", []):
                sense_glosses = sense.get("glosses", [])
                if not sense_glosses:
                    continue
                # Use last gloss (most specific) or first if only one
                gloss_text = sense_glosses[-1] if len(sense_glosses) > 1 else sense_glosses[0]
                gloss_text = clean_gloss(gloss_text)
                if not gloss_text or len(gloss_text) < 3:
                    continue
                if is_unhelpful(gloss_text):
                    continue

                # Skip offensive senses
                tags = set(sense.get("tags", []))
                if tags & OFFENSIVE_TAGS:
                    continue

                g = {"gloss": gloss_text}
                clean_tags = [t for t in sense.get("tags", []) if t not in OFFENSIVE_TAGS]
                if clean_tags:
                    g["tags"] = clean_tags[:5]

                # Examples
                examples = []
                for ex in sense.get("examples", []):
                    if isinstance(ex, dict):
                        text = html.unescape(ex.get("text", "")).strip()
                        if text and len(text) > 5:
                            e = {"text": text[:200]}
                            tr = ex.get("english", "") or ex.get("translation", "")
                            if tr:
                                e["translation"] = html.unescape(tr)[:200]
                            examples.append(e)
                if examples:
                    g["examples"] = examples[:3]

                # Synonyms
                syn_list = []
                for syn in sense.get("synonyms", []):
                    if isinstance(syn, dict) and syn.get("word"):
                        syn_list.append(syn["word"])
                if syn_list:
                    g["synonyms"] = syn_list[:5]

                glosses.append(g)

            if not glosses:
                continue

            if word not in raw:
                raw[word] = []
            raw[word].append({
                "pos": pos,
                "glosses": glosses,
                "etymology": etymology,
                "ipa": ipa,
                "forms": forms,
                "translations": translations,
            })
      except EOFError:
        print(f"    Warning: truncated gzip file, processing {len(raw)} words found so far")

    # Merge into final format
    results = {}
    for word, entries in raw.items():
        # Merge same-POS entries
        by_pos = {}
        best_etymology = None
        best_ipa = None
        all_forms = []
        all_translations = {}

        for e in entries:
            pos = e["pos"]
            if pos not in by_pos:
                by_pos[pos] = []
            by_pos[pos].extend(e["glosses"])

            if not best_etymology and e["etymology"]:
                best_etymology = e["etymology"]
            if not best_ipa and e["ipa"]:
                best_ipa = e["ipa"]
            all_forms.extend(e["forms"])
            for t in e["translations"]:
                key = t["code"]
                if key not in all_translations:
                    all_translations[key] = t["word"]

        senses = [{"pos": p, "glosses": g} for p, g in by_pos.items()]

        # Deduplicate forms
        seen_forms = set()
        unique_forms = []
        for fm in all_forms:
            key = (fm["form"], tuple(fm["tags"]))
            if key not in seen_forms:
                seen_forms.add(key)
                unique_forms.append(fm)

        results[word] = {
            "senses": senses,
            "etymology": best_etymology,
            "pronunciation": best_ipa,
            "forms": unique_forms[:20] if unique_forms else None,
            "translations": all_translations if all_translations else None,
        }

    return results


def find_english_gz(lang_code):
    name = LANG_CODE_TO_KAIKKI_NAME.get(lang_code)
    if not name:
        return None
    safe = name.replace(" ", "_").replace("-", "_")
    path = os.path.join(KAIKKI_DATA_DIR, f"{lang_code}_{safe}.jsonl.gz")
    if os.path.isfile(path):
        return path
    # Check shared names (hr/sr -> Serbo-Croatian)
    for lc, n in LANG_CODE_TO_KAIKKI_NAME.items():
        if n == name:
            safe2 = n.replace(" ", "_").replace("-", "_")
            p2 = os.path.join(KAIKKI_DATA_DIR, f"{lc}_{safe2}.jsonl.gz")
            if os.path.isfile(p2):
                return p2
    return None


def cmd_process(lang_codes):
    os.makedirs(PROCESSED_DIR, exist_ok=True)
    print(f"\nProcessing {len(lang_codes)} languages...\n")

    for lc in sorted(lang_codes):
        words = load_word_set(lc)
        if not words:
            print(f"  [{lc}] No words — skip")
            continue

        result = {}

        # Native edition first (definitions in the word's own language)
        wikt_code = NATIVE_EDITION_MAP.get(lc)
        if wikt_code:
            gz = os.path.join(KAIKKI_DATA_DIR, f"native_{wikt_code}-extract.jsonl.gz")
            if os.path.isfile(gz):
                native = extract_from_jsonl(gz, words, lang_code_filter=lc)
                result.update(native)

        # English edition as supplement (fills gaps + adds translations)
        en_gz = find_english_gz(lc)
        if en_gz:
            english = extract_from_jsonl(en_gz, words)
            for w, data in english.items():
                if w not in result:
                    # No native data — use English glosses
                    result[w] = data
                else:
                    # Native data exists — only take translations from English
                    if data.get("translations") and not result[w].get("translations"):
                        result[w]["translations"] = data["translations"]

        # For English, native = english
        if lc == "en" and not result:
            en_gz = find_english_gz("en")
            if en_gz:
                result = extract_from_jsonl(en_gz, words)

        n = len(result)
        coverage = n * 100 / len(words) if words else 0
        print(f"  [{lc}] {n}/{len(words)} ({coverage:.0f}%)")

        # Write processed data
        out_path = os.path.join(PROCESSED_DIR, f"{lc}.json")
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False)

    print(f"\nProcessed data in: {PROCESSED_DIR}")


# ---------------------------------------------------------------------------
# Upload — write to Postgres
# ---------------------------------------------------------------------------

def cmd_upload(lang_codes, dry_run=False):
    import pg8000

    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        env_path = os.path.join(PROJECT_ROOT, ".env")
        if os.path.isfile(env_path):
            with open(env_path) as f:
                for line in f:
                    if line.startswith("DATABASE_URL="):
                        db_url = line.split("=", 1)[1].strip().strip('"')
                        break
    if not db_url:
        print("ERROR: DATABASE_URL not set", file=sys.stderr)
        sys.exit(1)

    from urllib.parse import urlparse, unquote
    parsed = urlparse(db_url)
    conn = pg8000.connect(
        host=parsed.hostname, port=parsed.port or 5432,
        user=unquote(parsed.username or ""), password=unquote(parsed.password or ""),
        database=parsed.path.lstrip("/"), ssl_context=True,
    )
    cursor = conn.cursor()
    total = 0
    BATCH = 500

    for lc in sorted(lang_codes):
        path = os.path.join(PROCESSED_DIR, f"{lc}.json")
        if not os.path.isfile(path):
            continue
        data = json.load(open(path, encoding="utf-8"))
        if not data:
            continue

        items = list(data.items())
        count = 0

        for i in range(0, len(items), BATCH):
            batch = items[i:i + BATCH]
            if dry_run:
                count += len(batch)
                continue

            # Build multi-row INSERT ... ON CONFLICT
            values = []
            params = []
            for idx, (word, entry) in enumerate(batch):
                sj = json.dumps(entry["senses"], ensure_ascii=False)
                fj = json.dumps(entry["forms"], ensure_ascii=False) if entry.get("forms") else None
                tj = json.dumps(entry["translations"], ensure_ascii=False) if entry.get("translations") else None
                base = idx * 7
                values.append(f"(${base+1}, ${base+2}, ${base+3}::jsonb, ${base+4}, ${base+5}, ${base+6}::jsonb, ${base+7}::jsonb)")
                params.extend([lc, word, sj, entry.get("etymology"), entry.get("pronunciation"), fj, tj])

            sql = f"""INSERT INTO wordle.definitions (lang, word, senses, etymology, pronunciation, forms, translations)
                VALUES {', '.join(values)}
                ON CONFLICT (lang, word) DO UPDATE SET
                    senses = EXCLUDED.senses,
                    etymology = EXCLUDED.etymology,
                    pronunciation = EXCLUDED.pronunciation,
                    forms = COALESCE(EXCLUDED.forms, wordle.definitions.forms),
                    translations = COALESCE(EXCLUDED.translations, wordle.definitions.translations)"""

            try:
                cursor.execute(sql, params)
                count += len(batch)
            except Exception as e:
                # pg8000 may not support $N placeholders, fall back to %s
                conn.rollback()
                # Retry with %s placeholders
                values2 = []
                params2 = []
                for word, entry in batch:
                    sj = json.dumps(entry["senses"], ensure_ascii=False)
                    fj = json.dumps(entry["forms"], ensure_ascii=False) if entry.get("forms") else None
                    tj = json.dumps(entry["translations"], ensure_ascii=False) if entry.get("translations") else None
                    values2.append("(%s, %s, %s::jsonb, %s, %s, %s::jsonb, %s::jsonb)")
                    params2.extend([lc, word, sj, entry.get("etymology"), entry.get("pronunciation"), fj, tj])
                sql2 = f"""INSERT INTO wordle.definitions (lang, word, senses, etymology, pronunciation, forms, translations)
                    VALUES {', '.join(values2)}
                    ON CONFLICT (lang, word) DO UPDATE SET
                        senses = EXCLUDED.senses, etymology = EXCLUDED.etymology,
                        pronunciation = EXCLUDED.pronunciation,
                        forms = EXCLUDED.forms, translations = EXCLUDED.translations"""
                cursor.execute(sql2, params2)
                count += len(batch)

            conn.commit()

        total += count
        print(f"  [{lc}] {count} upserted", flush=True)

    conn.close()
    print(f"\nTotal: {total} rows upserted")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Import kaikki.org dictionary data")
    parser.add_argument("command", choices=["download", "process", "upload", "all", "stats"])
    parser.add_argument("--langs", help="Comma-separated language codes (default: all)")
    parser.add_argument("--edition", choices=["native", "english", "both"], default="both")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    all_codes = get_all_lang_codes()
    lang_codes = args.langs.split(",") if args.langs else all_codes

    if args.command == "download":
        cmd_download(lang_codes, edition=args.edition)
    elif args.command == "process":
        cmd_process(lang_codes)
    elif args.command == "upload":
        cmd_upload(lang_codes, dry_run=args.dry_run)
    elif args.command == "all":
        cmd_download(lang_codes, edition=args.edition)
        cmd_process(lang_codes)
        cmd_upload(lang_codes, dry_run=args.dry_run)
    elif args.command == "stats":
        for lc in sorted(lang_codes):
            p = os.path.join(PROCESSED_DIR, f"{lc}.json")
            if os.path.isfile(p):
                d = json.load(open(p))
                words = load_word_set(lc)
                print(f"  [{lc}] {len(d)}/{len(words)} ({len(d)*100//max(len(words),1)}%)")


if __name__ == "__main__":
    main()
