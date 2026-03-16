#!/usr/bin/env python3
"""Fix diacritic_maps that incorrectly normalize distinct alphabet letters.

Rule: if a character has its own key on the keyboard, it's a distinct letter
and should NOT be in the diacritic_map (the color algorithm would wrongly
treat it as equivalent to its base).

Language-by-language decisions for the 43 maps added in 574ab2f:

REMOVE ENTIRE MAP (all mapped chars are distinct alphabet letters):
  az    - Azerbaijani: ç,ö,ü,ğ,ı,ş are all separate letters
  bg    - Bulgarian: й is distinct from и
  da    - Danish: å,æ,ø are 27th-29th letters
  et    - Estonian: ä,õ,ö,ü,š,ž are distinct
  hr    - Croatian: ć,č,đ,š,ž are distinct
  lt    - Lithuanian: ą,č,ė,ę,į,š,ū,ų,ž are distinct
  ltg   - Latgalian: ā,č,ē,ī,ķ,ļ,ņ,ō,š,ū,ž are distinct
  lv    - Latvian: ā,č,ē,ģ,ī,ķ,ļ,ņ,š,ū,ž are distinct
  mk    - Macedonian: ѓ,ќ are distinct
  mn    - Mongolian: й,ё are distinct
  ro    - Romanian: â,î,ă,ș,ț are distinct
  sl    - Slovenian: č,š,ž are distinct
  sq    - Albanian: ç,ë are distinct letters
  sv    - Swedish: ä,ö,å are 27th-29th letters
  tk    - Turkmen: all mapped chars are distinct
  tr    - Turkish: ç,ğ,ı,ö,ş,ü are distinct (especially ı vs i!)
  uk    - Ukrainian: й,ї are distinct

REMOVE ON-KEYBOARD CHARS, KEEP OFF-KEYBOARD ACCENT VARIANTS:
  cs    - Czech: remove háček letters (č,ď,ě,ň,ř,š,ť,ů,ž,ú on kb);
          keep long vowels (á,é,í,ó,ý not on kb — legitimate variants)
  fi    - Finnish: remove ä,ö,å (distinct, on kb);
          keep à,é (foreign accent marks, not on kb)
  fo    - Faroese: remove æ,ð,ø (distinct, on kb);
          keep á,í,ó,ú,ý (accent variants, not on kb)
  hu    - Hungarian: remove ö,ü,ő,ű (distinct, on kb);
          keep á,é,í,ó,ú (long vowels, not on kb)
  is    - Icelandic: remove æ,ð,ö,þ (distinct, on kb);
          keep á,é,í,ó,ú,ý (accent variants, not on kb)
  lb    - Luxembourgish: remove ä,ë (on kb);
          keep é (not on kb)
  pl    - Polish: remove ą,ć,ę,ł,ń,ó,ś,ź,ż (distinct, on kb);
          keep ç,ö,ü (foreign chars, not on kb)
  sk    - Slovak: remove háček letters + ô (on kb);
          keep long vowels á,ä,é,í,ó,ú,ý (not on kb)

KEEP ENTIRE MAP (chars are genuine accent/variant marks):
  br    - Breton: ê,ù not on kb (keep); ñ on kb but acceptable for Breton
  ckb   - Kurdish: hamza variants are interchangeable in Arabic script
  eo    - Esperanto: circumflex letters (none on kb, all variants)
  eu    - Basque: ç not on kb (keep); ñ on kb but is a variant in Basque
  fa    - Persian: alef/hamza forms are genuinely interchangeable
  fur   - Friulian: accent marks (only ç on kb, rest not)
  fy    - Frisian: all accent variants, none on kb
  ga    - Irish: fada vowels, none on kb
  gd    - Scottish Gaelic: grave vowels, none on kb
  hi    - Hindi: nukta variants, none on kb
  ie    - Interlingue: accent vowels, none on kb
  mi    - Māori: macrons on kb BUT macrons are length marks, not distinct
          letters — ā is "long a" and matching a→ā is a useful convenience
  nds   - Low German: umlauts on kb BUT Low German treats them as variants
          (unlike standard German's distinct treatment in Finnish/Swedish)
  oc    - Occitan: accent marks (only ç on kb)
  qya   - Quenya: fictional lang, accents are variants (ñ,þ on kb but ok)
  ru    - Russian: ё→е is universally accepted normalization (most Russian
          text doesn't use ё); й→и is wrong but ё→е is so standard we keep it
  tl    - Tagalog: ñ on kb but is a Spanish loanword accent, not distinct
  ur    - Urdu: hamza variants are interchangeable in Arabic script

SPECIAL CASE — partial fix needed:
  ru    - Remove й→и mapping (distinct), keep ё→е (standard normalization)
"""

import json
import os

DATA = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "languages"
)

# Languages to remove ENTIRE diacritic_map
REMOVE_ALL = {
    "az",
    "bg",
    "da",
    "et",
    "hr",
    "lt",
    "ltg",
    "lv",
    "mk",
    "mn",
    "ro",
    "sl",
    "sq",
    "sv",
    "tk",
    "tr",
    "uk",
}

# Languages to remove specific chars from map (char → set of variants to remove)
REMOVE_SPECIFIC = {
    "cs": {"ě", "ú", "ů", "č", "ď", "ň", "ř", "š", "ť", "ž"},
    "fi": {"ä", "å", "ö"},
    "fo": {"æ", "ð", "ø"},
    "hu": {"ö", "ü", "ő", "ű"},
    "is": {"æ", "ð", "ö", "þ"},
    "lb": {"ä", "ë"},
    "pl": {"ą", "ć", "ę", "ł", "ń", "ó", "ś", "ź", "ż"},
    "sk": {"č", "ď", "ĺ", "ľ", "ň", "ô", "ŕ", "š", "ť", "ž"},
    "ru": {"й"},  # Keep ё→е (standard Russian normalization)
}


def fix_language(lang_code):
    cfg_path = os.path.join(DATA, lang_code, "language_config.json")
    with open(cfg_path) as f:
        cfg = json.load(f)

    if "diacritic_map" not in cfg:
        return False

    if lang_code in REMOVE_ALL:
        del cfg["diacritic_map"]
        print(f"  {lang_code}: removed entire diacritic_map")
    elif lang_code in REMOVE_SPECIFIC:
        chars_to_remove = REMOVE_SPECIFIC[lang_code]
        new_map = {}
        for base, variants in cfg["diacritic_map"].items():
            kept = [v for v in variants if v not in chars_to_remove]
            if kept:
                new_map[base] = kept
        if new_map:
            cfg["diacritic_map"] = new_map
            print(f"  {lang_code}: removed {sorted(chars_to_remove)} from map, kept {new_map}")
        else:
            del cfg["diacritic_map"]
            print(f"  {lang_code}: removed all chars → removed entire map")
    else:
        return False

    with open(cfg_path, "w") as f:
        json.dump(cfg, f, indent=4, ensure_ascii=False)
        f.write("\n")
    return True


def main():
    count = 0
    for lang_code in sorted(REMOVE_ALL | set(REMOVE_SPECIFIC.keys())):
        cfg_path = os.path.join(DATA, lang_code, "language_config.json")
        if os.path.exists(cfg_path) and fix_language(lang_code):
            count += 1
    print(f"\nFixed {count} languages")


if __name__ == "__main__":
    main()
