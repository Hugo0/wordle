# Wordle Global
Open Source Wordle in a bunch of languages

PULL REQUESTS WELCOME!

It would be mega awesome if you could help in any way (especially with language curation).

**How to add a new language:**
1. Make a folder in webapp/data/languages/ with the language code (e.g. en, de, fr, es. You can also go longer if needed)
2. Add a list of 5-letter words and call it {lang_code}_5words.txt
    1. (Optional) Add a language_config.json file
    2. (Optional) Add a list of supplemental words
3. Add your new language to the list at webapp/data/languages.json

Voilà!

## TODOs
- [ ] take into account browser bar height on mobile
- [ ] curate wordlists for existing languages
- [ ] add keyboard layouts for existing languages
- [ ] add more languages

Potential improvements:
- [ ] nice animations for revealing letters & such
- [ ] make a 4, 6, 7 letter version

Nice to haves:
- [ ] improve code quality (e.g. make variable names consistent)
- [ ] properly integrate TailwindCSS and Vue.js (i.e. not from CDN)

## Status of Languages
```
  - Interlingue (ie):              🟨 (2147 words)
  - Korean (ko):                   🟨 (8922 words)
  - Nepali (ne):                   🟨 (6562 words)
  - Slovenian (sl):                🟨 (12092 words)
  - Dutch (nl):                    🟨 (8076 words)
  - Luxembourgish (lb):            🟨 (1799 words)
  - Hungarian (hu):                🟨 (6999 words)
  - French (fr):                   🟨 (4945 words)
  - Occitan (oc):                  🟨 (4204 words)
  - English (en):                  🟩 (12948 words)
  - Interlingua (ia):              🟨 (2507 words)
  - Macedonian (mk):               🟨 (6005 words)
  - Irish (ga):                    🟨 (5779 words)
  - Turkish (tr):                  🟨 (9277 words)
  - Icelandic (is):                🟨 (8306 words)
  - Italian (it):                  🟨 (2791 words)
  - Russian (ru):                  🟨 (4688 words)
  - Portuguese (pt):               🟨 (9481 words)
  - Spanish (es):                  🟨 (3602 words)
  - Latvian (lv):                  🟨 (2784 words)
  - Breton (br):                   🟨 (7253 words)
  - Catalan (ca):                  🟨 (9174 words)
  - Croatian (hr):                 🟨 (3592 words)
  - Estonian (et):                 🟨 (9584 words)
  - Latgalian (ltg):               🟥 (388 words)
  - Serbian (sr):                  🟨 (17968 words)
  - Polish (pl):                   🟨 (10390 words)
  - Hebrew (he):                   🟨 (64772 words)
  - Vietnamese (vi):               🟧 (739 words)
  - Persian (fa):                  🟨 (11394 words)
  - Basque (eu):                   🟨 (7576 words)
  - Ukrainian (uk):                🟨 (9708 words)
  - Romanian (ro):                 🟨 (8630 words)
  - Fur (fur):                     🟨 (3577 words)
  - Western Frisian (fy):          🟨 (6289 words)
  - Arabic (ar):                   🟨 (13883 words)
  - Turkmen (tk):                  🟨 (5814 words)
  - Mongolian (mn):                🟨 (4830 words)
  - Gaelic (gd):                   🟨 (4919 words)
  - Slovak (sk):                   🟨 (10447 words)
  - Latin (la):                    🟨 (5807 words)
  - Klingon (tlh):                 🟥 (270 words)
  - Latgalian (nds):               🟨 (1014 words)
  - Bulgarian (bg):                🟨 (4953 words)
  - Armenian (hy):                 🟨 (3848 words)
  - Norwegian Nynorsk (nn):        🟨 (10543 words)
  - Czech (cs):                    🟨 (7557 words)
  - Esperanto (eo):                🟨 (2450 words)
  - Western Armenian (hyw):        🟨 (3748 words)
  - Greek (el):                    🟨 (10209 words)
  - Danish (da):                   🟨 (9707 words)
  - Kinyarwanda (rw):              🟥 (21 words)
  - Faroese (fo):                  🟨 (6472 words)
  - Swedish (sv):                  🟨 (6028 words)
  - Norwegian Bokmål (nb):         🟨 (7523 words)
  - German (de):                   🟨 (2308 words)
  - Galician (gl):                 🟨 (3281 words)
  - Lithuanian (lt):               🟨 (2547 words)
  - Georgian (ka):                 🟨 (8827 words)
```

![](scripts/out/n_words.png)

## Credits:
- Josh Wardle (original Wordle creator)
- NYT (presumably holds the copyright or some IP rights or something with their $$$ purchase)
- Elizabeth S (inventor of the Wordle grid)
- Nadia H (my lovely beta-tester)
- Daniel Rodriguez (for some inspiration with Tailwind)

## Data sources
- https://www.nytimes.com/games/wordle/index.html - english word list
- https://github.com/wooorm/dictionaries - most other word lists ([Titus Wormer](https://wooorm.com/) is an incredible dude)
