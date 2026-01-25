# Wordle Global

[wordle.global](https://wordle.global/)

Open Source Wordle in a bunch of languages

PULL REQUESTS WELCOME!

It would be mega awesome if you could help in any way (especially with language addition/curation).

contact: wordle@hugo0.com

**How to add a new language:**

1. Make a folder in webapp/data/languages/ with the language code (e.g. en, de, fr, qya, etc.)
2. Add a list of 5-letter words and call it {lang_code}\_5words.txt
   1. (Optional) Add a language_config.json file
   2. (Optional) Add a keyboard configuration
   3. (Optional) Add a list of supplemental words (useful to have this for weird/rare words, and only have 'common' words in the main 5words.txt file)

Voilà!

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

## Using Docker

1. Make sure you have Docker installed.
2. Build the image:

   ```bash
   docker build . -t wordle
   ```

3. Run the container:

   ```bash
   docker run -d -p 8000:8000 wordle
   ```

## Status of Languages

```
  - Hebrew (he):                   🟨 (64540 words)
  - Serbian (sr):                  🟨 (17968 words)
  - Central Kurdish (ckb):         🟩 (14819 words)
  - English (en):                  🟩 (12948 words)
  - Slovenian (sl):                🟨 (11731 words)
  - Persian (fa):                  🟨 (11253 words)
  - Norwegian Nynorsk (nn):        🟨 (10523 words)
  - Slovak (sk):                   🟨 (10444 words)
  - Greek (el):                    🟨 (10209 words)
  - Polish (pl):                   🟨 (10184 words)
  - Arabic (ar):                   🟨 (10166 words)
  - Ukrainian (uk):                🟨 (9589 words)
  - Danish (da):                   🟨 (9516 words)
  - Estonian (et):                 🟨 (9459 words)
  - Turkish (tr):                  🟨 (9224 words)
  - Catalan (ca):                  🟨 (9079 words)
  - Portuguese (pt):               🟨 (9016 words)
  - Korean (ko):                   🟨 (8922 words)
  - Georgian (ka):                 🟨 (8827 words)
  - Romanian (ro):                 🟨 (8618 words)
  - Icelandic (is):                🟨 (8285 words)
  - Czech (cs):                    🟨 (7544 words)
  - Basque (eu):                   🟨 (7520 words)
  - Norwegian Bokmål (nb):         🟨 (7471 words)
  - Dutch (nl):                    🟨 (7441 words)
  - Breton (br):                   🟨 (7143 words)
  - Faroese (fo):                  🟨 (6448 words)
  - Western Frisian (fy):          🟨 (6095 words)
  - Hungarian (hu):                🟨 (6047 words)
  - Macedonian (mk):               🟨 (5998 words)
  - Swedish (sv):                  🟨 (5968 words)
  - Turkmen (tk):                  🟨 (5814 words)
  - Latin (la):                    🟨 (5802 words)
  - Irish (ga):                    🟨 (5082 words)
  - Bulgarian (bg):                🟨 (4953 words)
  - Azerbaijan (az):               🟩 (4873 words)
  - Mongolian (mn):                🟨 (4830 words)
  - Russian (ru):                  🟨 (4688 words)
  - Gaelic (gd):                   🟨 (4660 words)
  - French (fr):                   🟨 (4482 words)
  - Occitan (oc):                  🟨 (4204 words)
  - Armenian (hy):                 🟨 (3848 words)
  - Western Armenian (hyw):        🟨 (3748 words)
  - Spanish (es):                  🟨 (3602 words)
  - Croatian (hr):                 🟨 (3591 words)
  - Fur (fur):                     🟨 (3569 words)
  - Finnish (fi):                  🟩 (3271 words)
  - Galician (gl):                 🟨 (3269 words)
  - Italian (it):                  🟨 (2783 words)
  - Latvian (lv):                  🟨 (2775 words)
  - Interlingua (ia):              🟨 (2476 words)
  - Esperanto (eo):                🟨 (2449 words)
  - German (de):                   🟨 (2277 words)
  - Nepali (ne):                   🟨 (2197 words)
  - Interlingue (ie):              🟨 (2147 words)
  - Lithuanian (lt):               🟨 (2004 words)
  - Luxembourgish (lb):            🟨 (1752 words)
  - Quenya (qya):                  🟨 (1327 words)
  - Low German (nds):              🟨 (1001 words)
  - Vietnamese (vi):               🟧 (739 words)
  - Latgalian (ltg):               🟥 (388 words)
  - Klingon (tlh):                 🟥 (270 words)
  - Maori (mi):                    🟥 (128 words)
  - Kinyarwanda (rw):              🟥 (21 words)
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
