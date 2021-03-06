# Wordle Global

[wordle.global](https://wordle.global/)

Open Source Wordle in a bunch of languages

PULL REQUESTS WELCOME!

It would be mega awesome if you could help in any way (especially with language addition/curation).

**How to add a new language:**
1. Make a folder in webapp/data/languages/ with the language code (e.g. en, de, fr, qya, etc.)
2. Add a list of 5-letter words and call it {lang_code}_5words.txt
    1. (Optional) Add a language_config.json file
    2. (Optional) Add a keyboard configuration 
    3. (Optional) Add a list of supplemental words (useful to have this for weird/rare words, and only have 'common' words in the main 5words.txt file)

VoilÃ !

## How to run locally

If you want to test out your changes, you can run the server locally.

1. Install Python 3

2. Install requirements
```pip3 install -r requirements.txt```

3. Run web server locally
```gunicorn --chdir webapp app:app```

4. Navigate to [http://127.0.0.1:8000/](http://127.0.0.1:8000/)

## TODOs
- [ ] take into account browser bar height on mobile
- [ ] curate wordlists for existing languages
- [ ] add keyboard layouts for existing languages
- [ ] add more languages
- [ ] fully translate game interface (missing score streaks and options)

Potential improvements:
- [ ] nice animations for revealing letters & such
- [ ] make a 4, 6, 7 letter version
- [ ] deal with accents & character modifiers better (e.g. french is horrible right now)

Nice to haves:
- [ ] improve code quality (e.g. make variable names consistent, code more reusable & less hacky)
- [ ] properly integrate TailwindCSS and Vue.js (i.e. not from CDN)
- [ ] tests...

## Status of Languages
```  
  - Hebrew (he):                   ð¨ (64540 words)
  - Serbian (sr):                  ð¨ (17968 words)
  - Central Kurdish (ckb):         ð© (14819 words)
  - English (en):                  ð© (12948 words)
  - Slovenian (sl):                ð¨ (11731 words)
  - Persian (fa):                  ð¨ (11253 words)
  - Norwegian Nynorsk (nn):        ð¨ (10523 words)
  - Slovak (sk):                   ð¨ (10444 words)
  - Greek (el):                    ð¨ (10209 words)
  - Polish (pl):                   ð¨ (10184 words)
  - Arabic (ar):                   ð¨ (10166 words)
  - Ukrainian (uk):                ð¨ (9589 words)
  - Danish (da):                   ð¨ (9516 words)
  - Estonian (et):                 ð¨ (9459 words)
  - Turkish (tr):                  ð¨ (9224 words)
  - Catalan (ca):                  ð¨ (9079 words)
  - Portuguese (pt):               ð¨ (9016 words)
  - Korean (ko):                   ð¨ (8922 words)
  - Georgian (ka):                 ð¨ (8827 words)
  - Romanian (ro):                 ð¨ (8618 words)
  - Icelandic (is):                ð¨ (8285 words)
  - Czech (cs):                    ð¨ (7544 words)
  - Basque (eu):                   ð¨ (7520 words)
  - Norwegian BokmÃ¥l (nb):         ð¨ (7471 words)
  - Dutch (nl):                    ð¨ (7441 words)
  - Breton (br):                   ð¨ (7143 words)
  - Faroese (fo):                  ð¨ (6448 words)
  - Western Frisian (fy):          ð¨ (6095 words)
  - Hungarian (hu):                ð¨ (6047 words)
  - Macedonian (mk):               ð¨ (5998 words)
  - Swedish (sv):                  ð¨ (5968 words)
  - Turkmen (tk):                  ð¨ (5814 words)
  - Latin (la):                    ð¨ (5802 words)
  - Irish (ga):                    ð¨ (5082 words)
  - Bulgarian (bg):                ð¨ (4953 words)
  - Azerbaijan (az):               ð© (4873 words)
  - Mongolian (mn):                ð¨ (4830 words)
  - Russian (ru):                  ð¨ (4688 words)
  - Gaelic (gd):                   ð¨ (4660 words)
  - French (fr):                   ð¨ (4482 words)
  - Occitan (oc):                  ð¨ (4204 words)
  - Armenian (hy):                 ð¨ (3848 words)
  - Western Armenian (hyw):        ð¨ (3748 words)
  - Spanish (es):                  ð¨ (3602 words)
  - Croatian (hr):                 ð¨ (3591 words)
  - Fur (fur):                     ð¨ (3569 words)
  - Finnish (fi):                  ð© (3271 words)
  - Galician (gl):                 ð¨ (3269 words)
  - Italian (it):                  ð¨ (2783 words)
  - Latvian (lv):                  ð¨ (2775 words)
  - Interlingua (ia):              ð¨ (2476 words)
  - Esperanto (eo):                ð¨ (2449 words)
  - German (de):                   ð¨ (2277 words)
  - Nepali (ne):                   ð¨ (2197 words)
  - Interlingue (ie):              ð¨ (2147 words)
  - Lithuanian (lt):               ð¨ (2004 words)
  - Luxembourgish (lb):            ð¨ (1752 words)
  - Quenya (qya):                  ð¨ (1327 words)
  - Low German (nds):              ð¨ (1001 words)
  - Vietnamese (vi):               ð§ (739 words)
  - Latgalian (ltg):               ð¥ (388 words)
  - Klingon (tlh):                 ð¥ (270 words)
  - Maori (mi):                    ð¥ (128 words)
  - Kinyarwanda (rw):              ð¥ (21 words)
```

![](scripts/out/n_words.png)

## Credits:
- Josh Wardle (original Wordle creator)
- NYT (presumably holds the copyright or some IP rights or something with their $$$ purchase)
- Elizabeth S (inventor of the Wordle grid)
- Nadia H (my lovely beta-tester)
- Daniel Rodriguez (for some inspiration with Tailwind)
- [Wordles of the World](https://gitlab.com/rwmpelstilzchen/wordles) for a community-sourced list of wordle-derivatives (it's impressive how many actually exist)

## Data sources
- https://www.nytimes.com/games/wordle/index.html - english word list
- https://kaino.kotus.fi/sanat/nykysuomi/ - Finnish word list
- https://github.com/wooorm/dictionaries - most other word lists ([Titus Wormer](https://wooorm.com/) is an incredible dude)
