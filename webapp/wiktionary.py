"""
Wiktionary definition fetching and parsing for Wordle Global.

Supports 20+ language-edition Wiktionaries via MediaWiki API,
with fallback to English Wiktionary REST API.
"""

import json
import os
import re
import urllib.parse
import urllib.request as urlreq

# Language codes where the Wiktionary subdomain differs from the game's lang code
WIKT_LANG_MAP = {"nb": "no", "nn": "no", "hyw": "hy", "ckb": "ku"}


def strip_html(text):
    """Strip HTML tags from a string."""
    return re.sub(r"<[^>]+>", "", text).strip()


def parse_wikt_definition(extract, word=None):
    """Extract a definition line from a Wiktionary plaintext extract.

    Args:
        extract: Plaintext content from the MediaWiki extracts API.
        word: The word being looked up (used to skip headword lines).

    Strategy: find lines that follow a definition-section header or marker,
    skipping etymology, pronunciation, inflection, and metadata. Works across
    many language-edition Wiktionary formats.
    """
    lines = extract.split("\n")
    in_definition_section = False

    # Extract the headword from the page title (first == header) if not provided
    if word is None:
        for line in lines:
            m = re.match(r"^==\s*(.+?)\s*==\s*$", line.strip())
            if m:
                word = m.group(1).strip()
                break

    # == headers that mark definition sections (e.g. "==== Noun ====")
    # Covers: English, French, Spanish, Portuguese, Italian, German, Swedish,
    # Danish, Dutch, Finnish, Estonian, Lithuanian, Hungarian, Breton, Occitan,
    # Azerbaijani/Turkish, Armenian, Kurdish, Vietnamese
    defn_headers = re.compile(
        r"^={2,4}\s*("
        # English
        r"Noun|Verb|Adjective|Adverb|Pronoun|Preposition|Conjunction|Interjection|"
        # French
        r"Nom commun|Verbe|Adjectif|Adverbe|Forme de verbe|"
        # Spanish
        r"Sustantivo\b|Verbo|Adjetivo|Adverbio|"
        # Portuguese / Italian
        r"Substantivo|Sostantivo|Aggettivo|"
        # German / Swedish / Danish / Norwegian
        r"Substantiv\w*\b|Adjektiv\w*\b|"
        # Finnish
        r"Substantiivi|Adjektiivi|Verbi|Adverbi|Pronomini|"
        # Estonian
        r"Nimisõna|Tegusõna|Omadussõna|"
        # Lithuanian
        r"Daiktavardis|Veiksmažodis|Būdvardis|"
        # Hungarian
        r"Főnév|Ige|Melléknév|"
        # Breton
        r"Anv-kadarn|"
        # Occitan
        r"Vèrb|"
        # Azerbaijani / Turkish
        r"İsim|Ad\b|"
        # Armenian
        r"Գոյական|Բայ|Ածական|"
        # Kurdish (Sorani)
        r"Rengdêr|Navdêr|"
        # Vietnamese
        r"Danh từ|Động từ|Tính từ|"
        # Arabic
        r"المعاني|"
        # Bulgarian (POS + grammar info: "Съществително нарицателно име, ...")
        r"Съществително|Прилагателно|Глагол|"
        # Russian (definitions under "Значение" = Meaning)
        r"Значение|"
        # Dutch
        r"Bijvoeglijk naamwoord|Zelfstandig naamwoord|Werkwoord" r")",
        re.IGNORECASE,
    )

    # Plain-text markers that start definition blocks (German, Polish, etc.)
    # Polish Wiktionary uses "== word (język polski) ==" headers with inline definitions
    defn_text_markers = re.compile(r"^(Bedeutungen|znaczenia)\s*:?\s*$", re.IGNORECASE)

    # Lines to always skip within a definition section
    skip_line = re.compile(
        r"^("
        r"=|IPA|Rhymes:|Homophones:|wymowa:|Pronúncia|Prononciation|Pronunciación|"
        r"Aussprache|Worttrennung|Silbentrennung|Hörbeispiele|Reime|"
        r"Étymologie|Etimología|Etimologia|Etymology|Herkunft|"
        r"Synonym|Sinónim|Sinônim|Antonym|Antónim|"
        r"Übersetzung|Translation|Tradução|Oberbegriffe|"
        r"Beispiele|Examples|Uso:|odmiana:|przykłady:|składnia:|kolokacje:|"
        r"synonimy:|antonimy:|hiperonimy:|hiponimy:|holonimy:|meronimy:|"
        r"wyrazy pokrewne:|związki frazeologiczne:|etymologia:|"
        r"Cognate |From |Du |Del |Do |Uit |Vom |Van |Derived |Compare |"
        r"rzeczownik|przymiotnik|przysłówek|czasownik"
        r")",
        re.IGNORECASE,
    )

    # Markers that end a definition section (plain-text, German/Polish style)
    end_markers = re.compile(
        r"^(Herkunft|Synonyme|Antonyme|Oberbegriffe|Beispiele|"
        r"Übersetzungen|odmiana|przykłady|składnia|kolokacje|"
        r"synonimy|antonimy|wyrazy pokrewne|związki frazeologiczne)\s*:?\s*$",
        re.IGNORECASE,
    )

    for line in lines:
        line = line.strip()
        if not line:
            continue

        # Check for == definition section header
        if defn_headers.match(line):
            in_definition_section = True
            continue

        # Check for plain-text definition marker
        if defn_text_markers.match(line):
            in_definition_section = True
            continue

        # End markers (plain text like "Herkunft:" in German)
        if end_markers.match(line):
            if in_definition_section:
                in_definition_section = False
            continue

        # Non-definition == header resets section
        if re.match(r"^={2,4}\s*\S", line):
            if in_definition_section and not defn_headers.match(line):
                in_definition_section = False
            continue

        if not in_definition_section:
            continue

        if skip_line.match(line):
            continue

        # Skip bare headword lines (word repeated alone after POS header)
        # Common in Swedish, Hungarian, Estonian, Lithuanian, Vietnamese Wiktionaries
        if word and line.lower() == word.lower():
            continue

        # Skip inflection lines like "casa ¦ plural: casas"
        if re.match(r"^\S+\s*¦", line):
            continue

        # Skip hyphenation lines like "De·pot, Plural: De·pots"
        if "·" in line or re.match(r".*Plural\s*:", line):
            continue

        # Skip phonetic/gender headword lines
        if re.match(r"^\\", line):
            continue
        if re.match(r"^[a-záàâãéèêíóòôõúüçñ.·ˈˌ]+\s*\\", line, re.IGNORECASE):
            continue
        # Skip "word (approfondimento) m sing" style (Italian)
        if re.match(r"^\w+\s*\(?\s*approfondimento", line, re.IGNORECASE):
            continue
        # Skip "de wereld v / m" style (Dutch headword with gender)
        if re.match(r"^(de|het|een|die|das|der)\s+\w+\s+[vmfn]\b", line, re.IGNORECASE):
            continue
        if re.match(
            r"^[a-záàâãéèêíóòôõúüçñ.·ˈˌ]+,?\s*(masculino|feminino|comum|neutro|féminin|masculin|m\s|f\s|m sing|f sing)",
            line,
            re.IGNORECASE,
        ):
            continue

        # Skip headword lines like "crane (plural cranes)" or "grind (third-person..."
        if re.match(
            r"^\w+\s*\((plural|third-person|present|past|pl\.)\b",
            line,
            re.IGNORECASE,
        ):
            continue

        # Skip Finnish-style headword lines: "sekka  (9-A)" or "koira  (10)"
        if re.match(r"^\w+\s+\(\d+", line):
            continue

        # German [1] definitions: "[1] Ort oder Gebäude..."
        m = re.match(r"^\[(\d+)\]\s+(.+)", line)
        if m and len(m.group(2)) > 5:
            return m.group(2).strip()[:300]

        # Polish (1.2) definitions
        m = re.match(r"^\([\d.]+\)\s+(.+)", line)
        if m:
            defn = m.group(1).strip()
            if re.match(r"(zdrobn|zgrub|forma)\b", defn, re.IGNORECASE):
                continue
            if len(defn) > 5:
                return defn[:300]
            continue

        # Spanish/numbered: "1 Vivienda" — but skip single-word topic labels
        m = re.match(r"^\d+\.?\s+(.*)", line)
        if m and len(m.group(1)) > 3:
            text = m.group(1).strip()
            return text[:300]

        # Skip example sentences (Dutch ▸, French/Spanish quotes, etc.)
        if line.startswith("▸") or line.startswith("►"):
            continue

        # Plain definition text (at least 3 chars)
        if len(line) > 3:
            return line[:300]

    return None


def fetch_native_wiktionary(word, lang_code):
    """Try native-language Wiktionary via MediaWiki API. Returns dict or None."""
    wikt_lang = WIKT_LANG_MAP.get(lang_code, lang_code)

    # Try original case first, then title-case (German nouns are capitalized)
    candidates = [word]
    if word[0].islower():
        candidates.append(word[0].upper() + word[1:])

    for try_word in candidates:
        api_url = (
            f"https://{wikt_lang}.wiktionary.org/w/api.php?"
            f"action=query&titles={urllib.parse.quote(try_word)}"
            f"&prop=extracts&explaintext=1&format=json"
        )
        try:
            req = urlreq.Request(api_url, headers={"User-Agent": "WordleGlobal/1.0"})
            with urlreq.urlopen(req, timeout=5) as resp:
                data = json.loads(resp.read())
                pages = data.get("query", {}).get("pages", {})
                for pid, page in pages.items():
                    if pid == "-1":
                        continue
                    extract = page.get("extract", "").strip()
                    if not extract:
                        continue
                    defn = parse_wikt_definition(extract, word=try_word)
                    if defn:
                        return {
                            "definition": defn,
                            "source": "native",
                            "url": f"https://{wikt_lang}.wiktionary.org/wiki/{urllib.parse.quote(try_word)}",
                        }
        except Exception:
            pass
    return None


def fetch_english_definition(word, lang_code):
    """Fetch an English-language definition for a word (any language).

    Hits the English Wiktionary REST API and returns the definition string,
    or None if not found.
    """
    try:
        url = f"https://en.wiktionary.org/api/rest_v1/page/definition/{urllib.parse.quote(word.lower())}"
        req = urlreq.Request(url, headers={"User-Agent": "WordleGlobal/1.0"})
        with urlreq.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read())
            for try_lang in [lang_code, "en"]:
                for entry in data.get(try_lang, []):
                    for defn in entry.get("definitions", []):
                        raw_def = defn.get("definition", "")
                        clean_def = strip_html(raw_def)
                        if clean_def:
                            return clean_def[:200]
    except Exception:
        pass
    return None


def fetch_definition_cached(word, lang_code, cache_dir=None):
    """Fetch definition from Wiktionary with disk caching.

    Tries native-language Wiktionary first, falls back to English Wiktionary.
    Returns dict with keys: definition, part_of_speech, source, url.
    Returns None if no definition found.
    """
    if cache_dir:
        lang_cache_dir = os.path.join(cache_dir, lang_code)
        cache_path = os.path.join(lang_cache_dir, f"{word.lower()}.json")

        # Check cache first (skip empty {} entries — those are failed lookups to retry)
        if os.path.exists(cache_path):
            try:
                with open(cache_path, "r") as f:
                    loaded = json.load(f)
                    if loaded:
                        return loaded
            except Exception:
                pass
    else:
        cache_path = None
        lang_cache_dir = None

    # Try native Wiktionary first (definitions in the word's own language)
    result = fetch_native_wiktionary(word, lang_code)

    # Fall back to English Wiktionary REST API
    if not result:
        try:
            url = f"https://en.wiktionary.org/api/rest_v1/page/definition/{urllib.parse.quote(word.lower())}"
            req = urlreq.Request(url, headers={"User-Agent": "WordleGlobal/1.0"})
            with urlreq.urlopen(req, timeout=5) as resp:
                data = json.loads(resp.read())
                # Try target language first, then English
                for try_lang in [lang_code, "en"]:
                    for entry in data.get(try_lang, []):
                        for defn in entry.get("definitions", []):
                            raw_def = defn.get("definition", "")
                            clean_def = strip_html(raw_def)
                            # Skip useless "form of" / "synonym of" definitions
                            if clean_def and not re.match(
                                r"^(synonym|plural|feminine|masculine|diminutive|augmentative|"
                                r"alternative|archaic|obsolete|dated|rare)\s+(form\s+)?of\s+",
                                clean_def,
                                re.IGNORECASE,
                            ):
                                result = {
                                    "definition": clean_def[:300],
                                    "part_of_speech": entry.get("partOfSpeech"),
                                    "source": "english",
                                    "url": f"https://en.wiktionary.org/wiki/{urllib.parse.quote(word.lower())}",
                                }
                                break
                        if result:
                            break
                    if result:
                        break
        except Exception:
            pass

    # Cache result (even None as empty object to avoid re-fetching)
    if lang_cache_dir:
        try:
            os.makedirs(lang_cache_dir, exist_ok=True)
            with open(cache_path, "w") as f:
                json.dump(result or {}, f)
        except IOError:
            pass

    return result
