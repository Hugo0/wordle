# Wordle Global

[![Tests](https://github.com/Hugo0/wordle/actions/workflows/test.yml/badge.svg)](https://github.com/Hugo0/wordle/actions/workflows/test.yml)
[![Languages](https://img.shields.io/badge/languages-65+-blue)](https://wordle.global)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/Hugo0/wordle/pulls)

[wordle.global](https://wordle.global/) — Open Source Wordle in 65+ languages

**Pull requests welcome!** Especially for language addition and curation.

Contact: wordle@hugo0.com

**For developers**: See [CLAUDE.md](CLAUDE.md) for architecture details, key algorithms, and coding guidelines.

## Adding a new language

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

## Language Coverage

65 languages supported. 42 have supplement word lists (additional valid guesses), and 38 have frequency-curated daily word lists.

Top languages by total valid words: Arabic (54K), Hebrew (65K), Breton (22K), Polish (42K), Spanish (18K), English (13K), German (12K), Turkish (12K).

Each language folder in `webapp/data/languages/` contains a `SOURCES.md` with details.

## TODO

- [ ] Word definitions — show the definition of the daily word after the game (e.g. via Wiktionary API)
- [ ] Native speaker review of daily word lists for remaining languages

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
- [wordfreq](https://github.com/rspeer/wordfreq) — Multi-source word frequency data (Wikipedia, Reddit, Twitter, Google Books) for additional supplement words
