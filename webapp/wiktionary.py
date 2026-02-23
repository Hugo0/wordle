"""
Wiktionary definition fetching and parsing for Wordle Global.

Supports 20+ language-edition Wiktionaries via MediaWiki API,
with fallback to English Wiktionary REST API.
"""

import json
import os
import re
import time
import urllib.parse
import urllib.request as urlreq

# Negative cache entries expire after 7 days (seconds)
NEGATIVE_CACHE_TTL = 7 * 24 * 3600

# Language codes where the Wiktionary subdomain differs from the game's lang code
WIKT_LANG_MAP = {"nb": "no", "nn": "no", "hyw": "hy", "ckb": "ku"}


def strip_html(text):
    """Strip HTML tags from a string."""
    return re.sub(r"<[^>]+>", "", text).strip()


def _fallback_extract_definition(extract, word=None):
    """Last-resort heuristic: grab first substantive line after any == header.

    Catches Wiktionaries (e.g. Hebrew) where definitions appear directly
    after the word heading without a POS subsection.
    """
    lines = extract.split("\n")
    after_header = False
    skip_sections = re.compile(
        r"^={2,4}\s*(Etymology|Pronunciation|Etym|Pronunc|הגייה|מקור|"
        r"References|See also|External|Anagrams|Derived|Related|Translations|"
        r"Übersetzung|Etimología|Etimologia|Étymologie|Herkunft)",
        re.IGNORECASE,
    )
    for line in lines:
        line = line.strip()
        if not line:
            continue
        if re.match(r"^={2,4}\s*", line):
            after_header = not skip_sections.match(line)
            continue
        if not after_header:
            continue
        # Skip IPA, pronunciation, metadata lines
        if re.match(r"^(IPA|Rhymes|Homophones|\[|//|\\)", line):
            continue
        # Skip if it's just the word itself
        if word and line.lower() == word.lower():
            continue
        # Skip very short or very long lines
        if len(line) > 5 and len(line) < 300:
            return line[:300]
    return None


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
    defn_headers = re.compile(
        r"^={2,4}\s*("
        # English
        r"Noun|Verb|Adjective|Adverb|Pronoun|Preposition|Conjunction|Interjection|"
        # French
        r"Nom commun|Verbe|Adjectif|Adverbe|Forme de verbe|Forme de nom commun|"
        # Spanish (including form headers)
        r"Sustantivo\b|Verbo|Adjetivo|Adverbio|" r"Forma adjetiva|Forma sustantiva|Forma verbal|"
        # Portuguese / Italian
        r"Substantivo|Sostantivo|Aggettivo|"
        # German / Swedish / Danish / Norwegian / Romanian
        r"Substantiv\w*\b|Adjektiv\w*\b|Verb\b|"
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
        r"İsim|Ad\b|Eylem|Sıfat|Belirteç|"
        # Armenian
        r"Գոյական|Բայ|Ածական|"
        # Kurdish (Sorani)
        r"Rengdêr|Navdêr|"
        # Vietnamese
        r"Danh từ|Động từ|Tính từ|"
        # Arabic
        r"المعاني|"
        # Bulgarian
        r"Съществително|Прилагателно|Глагол|"
        # Russian
        r"Значение|"
        # Dutch
        r"Bijvoeglijk naamwoord|Zelfstandig naamwoord|Werkwoord|"
        # Croatian / Bosnian
        r"Imenica|Glagol|Pridjev|Prilog|"
        # Serbian (Cyrillic)
        r"Именица|Глагол\b|Придев|Прилог|"
        # Slovenian
        r"Samostalnik|Pridevnik|"
        # Greek
        r"Ουσιαστικό|Ρήμα|Επίθετο|"
        # Hebrew
        r"שם עצם|פועל|שם תואר|"
        # Romanian
        r"Adjectiv|"
        # Czech / Slovak
        r"Podstatné jméno|Sloveso|Přídavné jméno|" r"Podstatné meno|Prídavné meno|"
        # Georgian
        r"არსებითი სახელი|ზმნა|"
        # Catalan
        r"Nom\b|Adjectiu|"
        # Indonesian / Malay
        r"Nomina|Verba|Adjektiva|"
        # Ukrainian
        r"Іменник|Дієслово|Прикметник" r")",
        re.IGNORECASE,
    )

    # Plain-text markers that start definition blocks (German, Polish, etc.)
    # Polish Wiktionary uses "== word (język polski) ==" headers with inline definitions
    defn_text_markers = re.compile(
        r"^(Bedeutungen|znaczenia|Значення|Значэнне)\s*:?\s*$", re.IGNORECASE
    )

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
        r"rzeczownik|przymiotnik|przysłówek|czasownik|"
        r"Deklinacija|Konjugacija|Склонение|Склоненье|"
        r"תעתיק|הגייה"
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
        # Skip headword lines like "beslemek (üçüncü tekil ...)" — word + parenthetical
        if word and re.match(re.escape(word) + r"\s*\(", line, re.IGNORECASE):
            continue
        # Skip headword lines with gender markers: "kuća ž", "dom m", "casa f"
        if word and re.match(re.escape(word) + r"\s+[mfnžcMFNŽC]\b", line, re.IGNORECASE):
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
        if re.match(r"^(de|het|een|die|das|der)\s+\w+\s+[vmfno]\b", line, re.IGNORECASE):
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

    # Structured parser found nothing — try fallback heuristic
    return _fallback_extract_definition(extract, word=word)


# Language-specific lemma suffixes to try when a word isn't found in Wiktionary.
# For agglutinative languages, daily words are often conjugated forms (e.g. Turkish
# "besle" is the imperative of "beslemek"), but Wiktionary only has the infinitive.
LEMMA_SUFFIXES = {
    "tr": ["mek", "mak"],  # Turkish infinitive (vowel harmony)
    "az": ["mək", "maq"],  # Azerbaijani infinitive
}

# Suffix stripping rules for inflected forms: (suffix_to_strip, replacement)
# Longer suffixes listed first so they match before shorter ones.
LEMMA_STRIP_RULES = {
    # Romance: plural/gender suffixes
    "es": [("es", ""), ("as", "a"), ("os", "o"), ("s", "")],
    "pt": [("ões", "ão"), ("es", ""), ("as", "a"), ("os", "o"), ("s", "")],
    "fr": [("eaux", "eau"), ("aux", "al"), ("es", "e"), ("s", "")],
    "it": [
        ("chi", "co"),
        ("ghi", "go"),
        ("ni", "ne"),
        ("li", "le"),
        ("hi", "o"),
        ("i", "o"),
        ("e", "a"),
    ],
    "ca": [("ns", "n"), ("es", ""), ("s", "")],
    "ro": [("uri", ""), ("i", ""), ("e", "")],
    # Germanic
    "de": [("ern", ""), ("en", ""), ("er", ""), ("e", "")],
    "nl": [("en", ""), ("er", ""), ("s", "")],
    "sv": [
        ("arna", ""),
        ("orna", ""),
        ("erna", ""),
        ("ar", ""),
        ("er", ""),
        ("or", ""),
        ("en", ""),
        ("et", ""),
        ("na", ""),
    ],
    "nb": [("ene", ""), ("er", ""), ("et", "")],
    "nn": [("ane", ""), ("ar", ""), ("et", "")],
    # Slavic
    "hr": [("ovima", ""), ("evima", ""), ("ovi", ""), ("evi", ""), ("a", ""), ("i", ""), ("e", "")],
    "sr": [("ови", ""), ("еви", ""), ("а", ""), ("и", ""), ("е", "")],
    "bg": [("етата", "е"), ("ите", ""), ("ата", ""), ("ът", ""), ("та", ""), ("а", ""), ("и", "")],
    "ru": [("ов", ""), ("ей", ""), ("а", ""), ("ы", ""), ("и", "")],
    "uk": [("ів", ""), ("ей", ""), ("а", ""), ("и", ""), ("і", "")],
    "cs": [("ů", ""), ("ech", ""), ("y", ""), ("e", ""), ("i", "")],
    "sk": [("ov", ""), ("ách", ""), ("y", ""), ("e", ""), ("i", "")],
    "sl": [("ov", ""), ("ev", ""), ("i", ""), ("e", ""), ("a", "")],
    # Finno-Ugric (common case endings)
    "fi": [
        ("ssa", ""),
        ("ssä", ""),
        ("sta", ""),
        ("stä", ""),
        ("lla", ""),
        ("llä", ""),
        ("lta", ""),
        ("ltä", ""),
        ("n", ""),
        ("t", ""),
    ],
    "et": [("de", ""), ("te", ""), ("d", "")],
    "hu": [("ban", ""), ("ben", ""), ("nak", ""), ("nek", ""), ("k", ""), ("t", "")],
}


def _build_candidates(word, lang_code):
    """Generate lookup candidates: original, title-case, lemma additions, lemma stripping."""
    candidates = [word]
    if word[0].islower():
        candidates.append(word[0].upper() + word[1:])
    # Suffix additions (agglutinative: e.g. Turkish "besle" → "beslemek")
    for suffix in LEMMA_SUFFIXES.get(lang_code, []):
        candidates.append(word + suffix)
    # Suffix stripping (inflected forms: e.g. Spanish "galas" → "gala")
    for strip_suffix, replacement in LEMMA_STRIP_RULES.get(lang_code, []):
        if word.lower().endswith(strip_suffix) and len(word) > len(strip_suffix):
            base = word[: len(word) - len(strip_suffix)] + replacement
            if len(base) >= 2 and base not in candidates:
                candidates.append(base)
    return candidates


def fetch_native_wiktionary(word, lang_code):
    """Try native-language Wiktionary via MediaWiki API. Returns dict or None."""
    wikt_lang = WIKT_LANG_MAP.get(lang_code, lang_code)
    candidates = _build_candidates(word, lang_code)

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


_FORM_OF_RE = re.compile(
    r"^(?:(?:feminine|masculine|neuter|singular|plural|diminutive|augmentative|"
    r"alternative|comparative|superlative|past|present|gerund|"
    r"(?:first|second|third)[- ]person|imperative|infinitive|"
    r"nominative|genitive|dative|accusative|ablative|instrumental)\s+)*"
    r"(?:form|plural|tense|participle|conjugation)?\s*"
    r"(?:of|de|di|du|von|van)\s+(\w+)",
    re.IGNORECASE,
)


def _follow_form_of(definition, lang_code):
    """If definition is 'X form of Y', look up Y and return its definition."""
    m = _FORM_OF_RE.match(definition)
    if m:
        base_word = m.group(1)
        defn = fetch_english_definition(base_word, lang_code)
        if defn:
            return defn
    return None


# Language names for LLM fallback prompts (allowlist — only languages we're confident about)
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
}


def fetch_llm_definition(word, lang_code):
    """Generate a definition using OpenAI gpt-4o-mini as last resort.

    Returns dict with keys: definition, source, url — or None.
    Only called when both native and English Wiktionary fail.
    """
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        return None
    lang_name = LLM_LANG_NAMES.get(lang_code)
    if not lang_name:
        return None

    prompt = (
        f"Define the {lang_name} word '{word}' in one short sentence in English. "
        f"If it has a clear part of speech, prefix with it (e.g. 'noun: ...'). "
        f"If you're not confident about this word, respond with just 'UNKNOWN'."
    )

    try:
        req = urlreq.Request(
            "https://api.openai.com/v1/chat/completions",
            data=json.dumps(
                {
                    "model": "gpt-4o-mini",
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 80,
                    "temperature": 0,
                }
            ).encode(),
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
        )
        with urlreq.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read())
            text = data["choices"][0]["message"]["content"].strip()
            if "UNKNOWN" in text.upper() or len(text) < 3:
                return None
            return {
                "definition": text[:300],
                "source": "ai",
                "url": None,
            }
    except Exception:
        return None


def fetch_definition_cached(word, lang_code, cache_dir=None):
    """Fetch definition from Wiktionary with disk caching.

    Tries native-language Wiktionary first, falls back to English Wiktionary,
    then to LLM generation as a last resort.
    Returns dict with keys: definition, part_of_speech, source, url.
    Returns None if no definition found.
    """
    if cache_dir:
        lang_cache_dir = os.path.join(cache_dir, lang_code)
        cache_path = os.path.join(lang_cache_dir, f"{word.lower()}.json")

        # Check cache — includes negative results ({"not_found": true, "ts": ...})
        if os.path.exists(cache_path):
            try:
                with open(cache_path, "r") as f:
                    loaded = json.load(f)
                    if loaded.get("not_found"):
                        # Negative entries expire so parser improvements get retried
                        cached_ts = loaded.get("ts", 0)
                        if time.time() - cached_ts < NEGATIVE_CACHE_TTL:
                            return None
                        # Expired — fall through to re-fetch
                    elif loaded:
                        return loaded
            except Exception:
                pass
    else:
        cache_path = None
        lang_cache_dir = None

    # Try native Wiktionary first (definitions in the word's own language)
    result = fetch_native_wiktionary(word, lang_code)

    # Fall back to English Wiktionary REST API
    # Use _build_candidates for broader lookup (includes lemma stripping)
    if not result:
        en_candidates = _build_candidates(word.lower(), lang_code)
        for try_word in en_candidates:
            if result:
                break
            try:
                url = f"https://en.wiktionary.org/api/rest_v1/page/definition/{urllib.parse.quote(try_word)}"
                req = urlreq.Request(url, headers={"User-Agent": "WordleGlobal/1.0"})
                with urlreq.urlopen(req, timeout=5) as resp:
                    data = json.loads(resp.read())
                    for try_lang in [lang_code, "en"]:
                        for entry in data.get(try_lang, []):
                            for defn in entry.get("definitions", []):
                                raw_def = defn.get("definition", "")
                                clean_def = strip_html(raw_def)
                                if not clean_def:
                                    continue
                                # Try to follow "form of" definitions
                                if re.match(
                                    r"^(synonym|plural|feminine|masculine|diminutive|augmentative|"
                                    r"alternative|archaic|obsolete|dated|rare|singular|"
                                    r"(?:first|second|third)[- ]person|past|present|"
                                    r"comparative|superlative|nominative|genitive|"
                                    r"dative|accusative|instrumental|imperative|"
                                    r"infinitive|(?:\w+ )?(?:form|tense|participle))\s+"
                                    r"(?:form\s+)?of\s+",
                                    clean_def,
                                    re.IGNORECASE,
                                ):
                                    followed = _follow_form_of(clean_def, lang_code)
                                    if followed:
                                        result = {
                                            "definition": followed[:300],
                                            "part_of_speech": entry.get("partOfSpeech"),
                                            "source": "english",
                                            "url": f"https://en.wiktionary.org/wiki/{urllib.parse.quote(try_word)}",
                                        }
                                        break
                                    continue  # Skip "form of" if can't follow
                                result = {
                                    "definition": clean_def[:300],
                                    "part_of_speech": entry.get("partOfSpeech"),
                                    "source": "english",
                                    "url": f"https://en.wiktionary.org/wiki/{urllib.parse.quote(try_word)}",
                                }
                                break
                            if result:
                                break
                        if result:
                            break
            except Exception:
                pass

    # LLM fallback as last resort
    if not result:
        result = fetch_llm_definition(word, lang_code)

    # Cache result (including negative results to avoid re-fetching from Wiktionary)
    if lang_cache_dir:
        try:
            os.makedirs(lang_cache_dir, exist_ok=True)
            with open(cache_path, "w") as f:
                json.dump(result or {"not_found": True, "ts": int(time.time())}, f)
        except IOError:
            pass

    return result
