# Wordle Global

[![Tests](https://github.com/Hugo0/wordle/actions/workflows/test.yml/badge.svg)](https://github.com/Hugo0/wordle/actions/workflows/test.yml)
[![Languages](https://img.shields.io/badge/languages-65+-blue)](https://wordle.global)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/Hugo0/wordle/pulls)

[wordle.global](https://wordle.global/) — Open Source Wordle in 65+ languages

**Pull requests welcome!** Especially for language addition and curation.

Contact: wordle@hugo0.com

**For developers**: See [CLAUDE.md](CLAUDE.md) for architecture details, key algorithms, and coding guidelines.

### Adding a new language

1. Create a folder in `webapp/data/languages/` with the language code (e.g. `en`, `de`, `fr`, `qya`)
2. Add a list of 5-letter words: `{lang_code}_5words.txt` (one word per line, lowercase)
3. (Optional) Add `language_config.json` — UI translations and metadata
4. (Optional) Add `{lang_code}_keyboard.json` — custom keyboard layout
5. (Optional) Add `{lang_code}_5words_supplement.txt` — additional valid guesses (rare words players might try)

## How to run locally

If you want to test out your changes, you can run the server locally.

### Prerequisites

- [uv](https://docs.astral.sh/uv/getting-started/installation/) (Python package manager)
- Node.js 22+ and [pnpm](https://pnpm.io/installation)

### Installation

```bash
git clone https://github.com/Hugo0/wordle.git
cd wordle
pnpm install
```

That's it — `uv` handles Python dependencies automatically.

### Development

```bash
pnpm dev
```

This starts both the Flask server and the Vite frontend watcher. Navigate to [http://127.0.0.1:8000/](http://127.0.0.1:8000/)

### Running Tests

```bash
uv run pytest tests/     # Python tests (data validation)
pnpm test                # TypeScript tests (game logic)
pnpm test:watch          # TypeScript tests in watch mode
```

### Testing on mobile with ngrok

To test on your phone or other devices, you can use [ngrok](https://ngrok.com/) to expose your local server:

1. [Install ngrok](https://ngrok.com/download)

2. Start your local server (see above)

3. In a new terminal, run:

   ```bash
   ngrok http 8000
   ```

4. ngrok will display a public URL (e.g., `https://abc123.ngrok.io`) — open this on your mobile device

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

## TODO

- [ ] Word definitions — show the definition of the daily word after the game (e.g. via Wiktionary API)
- [ ] Language-specific keyboard layouts (French AZERTY, German QWERTZ, Turkish I/İ handling)
- [ ] Native speaker review of daily word lists (filter out profanity, abbreviations, Roman numerals)
- [ ] Support for languages not covered by FrequencyWords (Faroese, Irish, Maori, etc.)

## Credits

- Josh Wardle (original Wordle creator)
- NYT (presumably holds the copyright or some IP rights)
- Elizabeth S (inventor of the Wordle grid)
- Nadia H (lovely beta-tester)
- Daniel Rodriguez (Tailwind inspiration)
- [Wordles of the World](https://gitlab.com/rwmpelstilzchen/wordles) for a community-sourced list of Wordle derivatives
- All users, issue reporters, and PR contributors!

## Data Sources

- [NYT Wordle](https://www.nytimes.com/games/wordle/index.html) — English word list
- [Kotus](https://kaino.kotus.fi/sanat/nykysuomi/) — Finnish word list
- [wooorm/dictionaries](https://github.com/wooorm/dictionaries) — most other word lists (Hunspell-based, by [Titus Wormer](https://wooorm.com/))
- [FrequencyWords](https://github.com/hermitdave/FrequencyWords) — OpenSubtitles frequency data for daily word ranking and supplement generation
