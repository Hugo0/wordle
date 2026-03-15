#!/usr/bin/env python3
"""
Download and prepare external word list sources for Wordle Global.

Sources:
1. Leipzig Corpora — newspaper/web frequency lists (100+ languages)
2. Hunspell dictionaries — curated spell-check dictionaries
3. KBBI — official Indonesian dictionary
4. Katla — curated Indonesian Wordle answers
5. kaikki.org — Wiktionary word extracts

All data stored under scripts/.freq_data/ (gitignored).

Usage:
    python scripts/download_sources.py all
    python scripts/download_sources.py leipzig id ms tl sq ur ha yo uz om hi
    python scripts/download_sources.py hunspell
    python scripts/download_sources.py kbbi
    python scripts/download_sources.py katla
    python scripts/download_sources.py extract-kaikki
    python scripts/download_sources.py kaikki-download id ms tl sq ur ha yo uz om hi
"""

import argparse
import json
import shutil
import subprocess
import tarfile
import urllib.request
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
FREQ_DATA = SCRIPT_DIR / ".freq_data"
DEFINITIONS_DIR = SCRIPT_DIR.parent / "data" / "definitions"

# Leipzig Corpora: map our lang codes → Leipzig corpus identifiers
# Leipzig uses ISO 639-3 codes + source type
LEIPZIG_CORPORA = {
    "id": "ind_news_2024_1M",
    "ms": "msa_newscrawl_2016_300K",
    "tl": "tgl_wikipedia_2021_100K",
    "sq": "sqi_news_2020_1M",
    "ur": "urd_newscrawl_2016_1M",
    "ha": "hau_wikipedia_2021_30K",
    "yo": "yor_wikipedia_2021_10K",
    "uz": "uzb_newscrawl_2011_100K",
    "om": "orm_community_2021",
    "hi": "hin_news_2022_1M",
    "mr": "mar_wikipedia_2021_100K",
    "pa": "pan_wikipedia_2021_100K",
    "bn": "ben_wikipedia_2021_100K",
    "ko": "kor_wikipedia_2021_100K",
    # Additional languages (2026-03 expansion)
    "az": "aze_wikipedia_2021_100K",
    "br": "bre_wikipedia_2021_100K",
    "eo": "epo_wikipedia_2021_100K",
    "eu": "eus_wikipedia_2021_100K",
    "fa": "fas_news_2024_1M",
    "fy": "fry_wikipedia_2021_100K",
    "gl": "glg_wikipedia_2021_100K",
    "he": "heb_wikipedia_2021_100K",
    "hy": "hye_wikipedia_2021_100K",
    "is": "isl_wikipedia_2021_100K",
    "ka": "kat_wikipedia_2021_100K",
    "la": "lat_wikipedia_2021_100K",
    "lb": "ltz_wikipedia_2021_100K",
    "lt": "lit_wikipedia_2021_100K",
    "mk": "mkd_wikipedia_2021_100K",
    "mn": "mon_wikipedia_2021_100K",
    "ne": "nep_wikipedia_2021_100K",
    "nn": "nno_wikipedia_2021_100K",
    "oc": "oci_wikipedia_2021_100K",
    "sw": "swh_wikipedia_2021_100K",
    "vi": "vie_wikipedia_2021_100K",
    # Existing languages
    "ar": "ara_news_2024_1M",
    "bg": "bul_news_2024_1M",
    "ca": "cat_news_2024_1M",
    "cs": "ces_news_2024_1M",
    "da": "dan_news_2024_1M",
    "de": "deu_news_2024_1M",
    "el": "ell_news_2024_1M",
    "es": "spa_news_2024_1M",
    "et": "est_news_2024_1M",
    "fi": "fin_news_2024_1M",
    "fr": "fra_news_2024_1M",
    "hr": "hrv_news_2024_1M",
    "hu": "hun_news_2024_1M",
    "it": "ita_news_2024_1M",
    "nl": "nld_news_2024_1M",
    "nb": "nor_news_2024_1M",
    "pl": "pol_news_2024_1M",
    "pt": "por_news_2024_1M",
    "ro": "ron_news_2024_1M",
    "ru": "rus_news_2024_1M",
    "sk": "slk_news_2024_1M",
    "sl": "slv_news_2024_1M",
    "sr": "srp_news_2024_1M",
    "sv": "swe_news_2024_1M",
    "tr": "tur_news_2024_1M",
    "uk": "ukr_news_2024_1M",
}

LEIPZIG_BASE_URL = "https://downloads.wortschatz-leipzig.de/corpora"

# Kaikki.org: map lang codes → kaikki language names
KAIKKI_LANGS = {
    "id": "Indonesian",
    "ms": "Malay",
    "tl": "Tagalog",
    "sq": "Albanian",
    "ur": "Urdu",
    "ha": "Hausa",
    "yo": "Yoruba",
    "uz": "Uzbek",
    "om": "Oromo",
    "hi": "Hindi",
    "mr": "Marathi",
    "sw": "Swahili",
}


def download_file(url: str, dest: Path, desc: str = "") -> bool:
    """Download a file with progress reporting."""
    print(f"  Downloading {desc or url}...")
    try:
        urllib.request.urlretrieve(url, dest)
        size_mb = dest.stat().st_size / 1024 / 1024
        print(f"  Downloaded {size_mb:.1f} MB → {dest.name}")
        return True
    except Exception as e:
        print(f"  FAILED: {e}")
        return False


# ── Leipzig Corpora ───────────────────────────────────────────────────────────


def download_leipzig(langs: list[str]):
    """Download Leipzig Corpora word frequency lists."""
    target_dir = FREQ_DATA / "leipzig"
    target_dir.mkdir(parents=True, exist_ok=True)

    for lang in langs:
        corpus_id = LEIPZIG_CORPORA.get(lang)
        if not corpus_id:
            print(f"  {lang}: no Leipzig corpus mapping, skipping")
            continue

        lang_dir = target_dir / lang
        words_file = lang_dir / f"{lang}-words.txt"
        if words_file.exists():
            print(f"  {lang}: already downloaded ({words_file})")
            continue

        url = f"{LEIPZIG_BASE_URL}/{corpus_id}.tar.gz"
        tar_path = target_dir / f"{corpus_id}.tar.gz"

        if not download_file(url, tar_path, f"Leipzig {lang} ({corpus_id})"):
            # Try alternative corpus names
            alt_names = _leipzig_alternatives(lang)
            success = False
            for alt in alt_names:
                alt_url = f"{LEIPZIG_BASE_URL}/{alt}.tar.gz"
                if download_file(alt_url, tar_path, f"Leipzig {lang} ({alt})"):
                    success = True
                    break
            if not success:
                print(f"  {lang}: all Leipzig sources failed")
                continue

        # Extract words file from tar.gz
        try:
            lang_dir.mkdir(parents=True, exist_ok=True)
            with tarfile.open(tar_path, "r:gz") as tar:
                for member in tar.getmembers():
                    if member.name.endswith("-words.txt"):
                        content = tar.extractfile(member)
                        if content:
                            words_file.write_bytes(content.read())
                            print(f"  Extracted → {words_file}")
                            break
                else:
                    print(f"  WARNING: no -words.txt found in archive for {lang}")
            tar_path.unlink()  # Clean up tar
        except Exception as e:
            print(f"  ERROR extracting {lang}: {e}")
            if tar_path.exists():
                tar_path.unlink()


def _leipzig_alternatives(lang: str) -> list[str]:
    """Generate alternative Leipzig corpus names to try."""
    iso3 = LEIPZIG_CORPORA.get(lang, "").split("_")[0]
    if not iso3:
        return []
    # Try different sources and years
    alts = []
    for source in ["wikipedia_2021", "newscrawl_2011", "news_2020", "community_2017"]:
        for size in ["300K", "100K", "1M", "10K"]:
            name = f"{iso3}_{source}_{size}"
            if name != LEIPZIG_CORPORA.get(lang):
                alts.append(name)
    return alts[:8]  # Try up to 8 alternatives


# ── Hunspell Dictionaries ─────────────────────────────────────────────────────


def download_hunspell():
    """Install and extract Hunspell dictionaries."""
    target_dir = FREQ_DATA / "hunspell"
    target_dir.mkdir(parents=True, exist_ok=True)

    # Languages available via apt
    apt_langs = {
        "id": "hunspell-id",
        "hi": "hunspell-hi",
    }

    for lang, package in apt_langs.items():
        dic_file = target_dir / f"{lang}.dic"
        if dic_file.exists():
            print(f"  {lang}: already extracted ({dic_file})")
            continue

        # Check if package is installed
        result = subprocess.run(["dpkg", "-s", package], capture_output=True, text=True)
        if result.returncode != 0:
            print(f"  Installing {package}...")
            result = subprocess.run(
                ["sudo", "apt", "install", "-y", package],
                capture_output=True,
                text=True,
            )
            if result.returncode != 0:
                print(f"  FAILED to install {package}: {result.stderr}")
                continue

        # Find and copy .dic file
        hunspell_dir = Path("/usr/share/hunspell")
        for pattern in [f"{lang}*.dic", f"{lang.upper()}*.dic"]:
            dics = list(hunspell_dir.glob(pattern))
            if dics:
                shutil.copy2(dics[0], dic_file)
                print(f"  Extracted {dics[0].name} → {dic_file}")
                break
        else:
            # Try myspell directory
            myspell_dir = Path("/usr/share/myspell/dicts")
            for pattern in [f"{lang}*.dic", f"{lang.upper()}*.dic"]:
                dics = list(myspell_dir.glob(pattern)) if myspell_dir.exists() else []
                if dics:
                    shutil.copy2(dics[0], dic_file)
                    print(f"  Extracted {dics[0].name} → {dic_file}")
                    break

    # Albanian: download from LibreOffice dictionaries git
    sq_dic = target_dir / "sq.dic"
    if not sq_dic.exists():
        url = "https://cgit.freedesktop.org/libreoffice/dictionaries/plain/sq_AL/sq_AL.dic"
        download_file(url, sq_dic, "Albanian Hunspell dictionary")


# ── KBBI (Indonesian Dictionary) ──────────────────────────────────────────────


def download_kbbi():
    """Download KBBI Indonesian word list."""
    target_dir = FREQ_DATA / "kbbi"
    words_file = target_dir / "words.txt"
    if words_file.exists():
        print(f"  KBBI: already downloaded ({words_file})")
        return

    target_dir.mkdir(parents=True, exist_ok=True)
    repo_dir = target_dir / "repo"

    if not repo_dir.exists():
        print("  Cloning KBBI repository...")
        result = subprocess.run(
            [
                "git",
                "clone",
                "--depth",
                "1",
                "https://github.com/damzaky/kumpulan-kata-bahasa-indonesia-KBBI.git",
                str(repo_dir),
            ],
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            print(f"  FAILED to clone KBBI: {result.stderr}")
            return

    # Extract words from the repo — look for word list files
    words = set()
    for txt_file in repo_dir.rglob("*.txt"):
        for line in txt_file.read_text(encoding="utf-8", errors="ignore").splitlines():
            word = line.strip().lower()
            if word and word.isalpha():
                words.add(word)

    # Also check CSV files
    for csv_file in repo_dir.rglob("*.csv"):
        try:
            for line in csv_file.read_text(encoding="utf-8", errors="ignore").splitlines():
                word = line.strip().split(",")[0].strip().lower()
                if word and word.isalpha():
                    words.add(word)
        except Exception:
            pass

    words_file.write_text("\n".join(sorted(words)) + "\n", encoding="utf-8")
    print(f"  KBBI: extracted {len(words)} words → {words_file}")

    # Clean up repo
    shutil.rmtree(repo_dir, ignore_errors=True)


# ── Katla (Indonesian Wordle) ─────────────────────────────────────────────────


def download_katla():
    """Download Katla Indonesian Wordle word lists."""
    target_dir = FREQ_DATA / "katla"
    answers_file = target_dir / "answers.txt"
    if answers_file.exists():
        print(f"  Katla: already downloaded ({answers_file})")
        return

    target_dir.mkdir(parents=True, exist_ok=True)

    # Download raw CSV files directly from GitHub
    base = "https://raw.githubusercontent.com/pveyes/katla/main/.scripts"
    for name, filename in [("answers", "answers.csv"), ("valid", "whitelist.csv")]:
        out_file = target_dir / f"{name}.txt"
        csv_path = target_dir / filename
        if download_file(f"{base}/{filename}", csv_path, f"Katla {name}"):
            # Katla CSVs are comma-separated on a single line
            content = csv_path.read_text(encoding="utf-8", errors="ignore")
            words = set()
            for part in content.replace("\n", ",").split(","):
                w = part.strip().lower()
                if w and len(w) == 5 and w.isalpha():
                    words.add(w)
            if words:
                out_file.write_text("\n".join(sorted(words)) + "\n", encoding="utf-8")
                print(f"  Katla {name}: {len(words)} words → {out_file}")
            csv_path.unlink(missing_ok=True)


# ── Shabdle (Hindi Wordle) ─────────────────────────────────────────────────────


def download_shabdle():
    """Download Shabdle Hindi Wordle word list."""
    target_dir = FREQ_DATA / "shabdle"
    words_file = target_dir / "hi_words.txt"
    if words_file.exists():
        print(f"  Shabdle: already downloaded ({words_file})")
        return

    target_dir.mkdir(parents=True, exist_ok=True)
    url = "https://raw.githubusercontent.com/kach/shabdle/main/hi.wl"
    raw_path = target_dir / "hi.wl"
    if download_file(url, raw_path, "Shabdle Hindi word list"):
        words = [w.strip() for w in raw_path.read_text(encoding="utf-8").splitlines() if w.strip()]
        words_file.write_text("\n".join(words) + "\n", encoding="utf-8")
        print(f"  Shabdle: {len(words)} Hindi words → {words_file}")
        raw_path.unlink(missing_ok=True)


# ── kaikki.org Word Extraction ────────────────────────────────────────────────


def extract_kaikki():
    """Extract 5-letter word lists from existing kaikki definition JSONs."""
    target_dir = FREQ_DATA / "kaikki"
    target_dir.mkdir(parents=True, exist_ok=True)

    for json_file in sorted(DEFINITIONS_DIR.glob("*_en.json")):
        lang = json_file.stem.replace("_en", "")
        out_file = target_dir / f"{lang}_words.txt"

        if out_file.exists():
            continue

        try:
            data = json.loads(json_file.read_text(encoding="utf-8"))
            words = sorted(w for w in data if len(w) == 5 and w.isalpha() and w == w.lower())
            if words:
                out_file.write_text("\n".join(words) + "\n", encoding="utf-8")
                print(f"  {lang}: {len(words)} 5-letter words from kaikki")
        except Exception as e:
            print(f"  {lang}: failed to extract — {e}")

    # Also extract from non-_en files (native language definitions)
    for json_file in sorted(DEFINITIONS_DIR.glob("*.json")):
        if "_en" in json_file.stem:
            continue
        lang = json_file.stem
        out_file = target_dir / f"{lang}_words.txt"
        if out_file.exists():
            continue

        try:
            data = json.loads(json_file.read_text(encoding="utf-8"))
            words = sorted(w for w in data if len(w) == 5 and w.isalpha() and w == w.lower())
            if words:
                out_file.write_text("\n".join(words) + "\n", encoding="utf-8")
                print(f"  {lang}: {len(words)} 5-letter words from kaikki (native)")
        except Exception as e:
            print(f"  {lang}: failed to extract native kaikki — {e}")


def download_kaikki(langs: list[str]):
    """Download kaikki.org definition files for languages we don't have yet."""
    target_dir = FREQ_DATA / "kaikki"
    target_dir.mkdir(parents=True, exist_ok=True)

    for lang in langs:
        kaikki_name = KAIKKI_LANGS.get(lang)
        if not kaikki_name:
            print(f"  {lang}: no kaikki mapping")
            continue

        out_file = target_dir / f"{lang}_words.txt"
        if out_file.exists():
            print(f"  {lang}: already extracted")
            continue

        # Check if we already have the definition file
        def_file = DEFINITIONS_DIR / f"{lang}_en.json"
        if def_file.exists():
            # Extract from existing file
            try:
                data = json.loads(def_file.read_text(encoding="utf-8"))
                words = sorted(w for w in data if len(w) == 5 and w.isalpha() and w == w.lower())
                if words:
                    out_file.write_text("\n".join(words) + "\n", encoding="utf-8")
                    print(f"  {lang}: {len(words)} 5-letter words from existing kaikki")
                continue
            except Exception:
                pass

        # Download from kaikki.org
        # Format: https://kaikki.org/dictionary/{Language}/kaikki.org-dictionary-{Language}.jsonl
        url = (
            f"https://kaikki.org/dictionary/{kaikki_name}/kaikki.org-dictionary-{kaikki_name}.jsonl"
        )
        jsonl_path = target_dir / f"{lang}_kaikki.jsonl"

        if download_file(url, jsonl_path, f"kaikki {kaikki_name}"):
            # Extract 5-letter words from JSONL (line-by-line to limit memory)
            words = set()
            try:
                with open(jsonl_path, encoding="utf-8", errors="ignore") as fh:
                    for line in fh:
                        try:
                            entry = json.loads(line)
                            word = entry.get("word", "").strip().lower()
                            if len(word) == 5 and word.isalpha():
                                words.add(word)
                        except json.JSONDecodeError:
                            continue
                if words:
                    out_file.write_text("\n".join(sorted(words)) + "\n", encoding="utf-8")
                    print(f"  {lang}: {len(words)} 5-letter words from kaikki.org")
                else:
                    print(f"  {lang}: no 5-letter words found in kaikki download")
            except Exception as e:
                print(f"  {lang}: failed to parse kaikki JSONL — {e}")
            finally:
                jsonl_path.unlink(missing_ok=True)  # Clean up large JSONL


# ── Main ──────────────────────────────────────────────────────────────────────


def main():
    parser = argparse.ArgumentParser(description="Download external word list sources")
    subparsers = parser.add_subparsers(dest="command")

    subparsers.add_parser("all", help="Download everything")

    leipzig_cmd = subparsers.add_parser("leipzig", help="Download Leipzig Corpora")
    leipzig_cmd.add_argument("langs", nargs="*", default=list(LEIPZIG_CORPORA.keys()))

    subparsers.add_parser("hunspell", help="Download Hunspell dictionaries")
    subparsers.add_parser("kbbi", help="Download KBBI Indonesian dictionary")
    subparsers.add_parser("katla", help="Download Katla Indonesian Wordle lists")
    subparsers.add_parser("shabdle", help="Download Shabdle Hindi Wordle word list")
    subparsers.add_parser("extract-kaikki", help="Extract word lists from existing kaikki JSONs")

    kaikki_cmd = subparsers.add_parser(
        "kaikki-download", help="Download kaikki.org data for languages"
    )
    kaikki_cmd.add_argument("langs", nargs="*", default=list(KAIKKI_LANGS.keys()))

    args = parser.parse_args()

    if args.command == "all":
        print("=== Downloading all sources ===\n")
        print("--- Leipzig Corpora ---")
        download_leipzig(list(LEIPZIG_CORPORA.keys()))
        print("\n--- Hunspell ---")
        download_hunspell()
        print("\n--- KBBI ---")
        download_kbbi()
        print("\n--- Katla ---")
        download_katla()
        print("\n--- Shabdle ---")
        download_shabdle()
        print("\n--- Extract kaikki from existing definitions ---")
        extract_kaikki()
        print("\n--- Download kaikki for new languages ---")
        download_kaikki(list(KAIKKI_LANGS.keys()))
        print("\n=== Done ===")
    elif args.command == "leipzig":
        download_leipzig(args.langs)
    elif args.command == "hunspell":
        download_hunspell()
    elif args.command == "kbbi":
        download_kbbi()
    elif args.command == "katla":
        download_katla()
    elif args.command == "shabdle":
        download_shabdle()
    elif args.command == "extract-kaikki":
        extract_kaikki()
    elif args.command == "kaikki-download":
        download_kaikki(args.langs)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
