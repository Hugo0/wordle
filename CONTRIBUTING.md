# Contributing to Wordle Global

Thanks for your interest in contributing! This project supports 65+ languages and we welcome help improving word lists, keyboards, translations, and code.

## Quick Start

```bash
git clone https://github.com/Hugo0/wordle.git
cd wordle
pnpm install
pnpm dev           # Starts Flask server + Vite watcher
```

`uv` handles Python dependencies automatically.

## Architecture

```text
wordle/
├── webapp/                    # Flask backend
│   ├── app.py                 # Main Flask app, routes, data loading
│   ├── data/                  # Language data (word lists, configs, keyboards)
│   │   ├── languages/{lang}/  # Per-language files
│   │   │   ├── {lang}_5words.txt           # Main word list
│   │   │   ├── {lang}_5words_supplement.txt # Valid guesses (not daily words)
│   │   │   ├── {lang}_characters.txt       # Valid characters
│   │   │   ├── {lang}_keyboard.json        # Keyboard layout
│   │   │   └── language_config.json        # UI translations, metadata
│   │   └── default_language_config.json    # Fallback config
│   ├── templates/             # Jinja2 templates
│   │   ├── game.html          # Main game page (uses Vite assets)
│   │   └── index.html         # Homepage
│   └── static/
│       └── dist/              # Vite build output (gitignored)
├── frontend/                  # TypeScript/Vue frontend source
│   └── src/
│       ├── main.ts            # Entry point
│       ├── game.ts            # Vue app with game logic
│       ├── pwa.ts             # PWA install prompt
│       ├── types/index.ts     # TypeScript interfaces
│       └── __tests__/         # Vitest unit tests
├── tests/                     # pytest tests for data validation
└── scripts/                   # Utility scripts
```

## Key Concepts

### Daily Word Selection
- Algorithm in `webapp/app.py:get_todays_idx()`
- Based on days since epoch with offset: `n_days - 18992 + 195`
- Word list is shuffled with `random.seed(42)` for determinism
- Daily word = `word_list[todays_idx % len(word_list)]`

### Color Algorithm (Wordle rules)
- Green (correct): Letter in correct position
- Yellow (semicorrect): Letter exists but wrong position
- Gray (incorrect): Letter not in word
- **Important**: Handles duplicate letters correctly - green takes priority

### Build System
- **Vite** bundles TypeScript + Tailwind CSS
- Assets go to `webapp/static/dist/` with content hashes
- Flask reads `.vite/manifest.json` to get hashed filenames
- Run `pnpm build` before deploying

### Testing
- `pytest tests/` - Validates word lists, configs, daily word algorithm
- `pnpm test` - TypeScript unit tests for game logic
- CI runs both on every PR
- ~4 pytest xfails expected (pre-existing data quality issues)

## Code Style

### TypeScript
- Single quotes, 4-space indentation, trailing commas
- Run `pnpm format` (Prettier) before committing

### Python
- Ruff formatter + linter, 100 char line length
- Run `uv run ruff format webapp/ tests/` and `uv run ruff check webapp/ tests/` before committing
- Pre-commit hooks run both automatically

## Before Committing

```bash
pnpm format                          # Format TypeScript
uv run ruff format webapp/ tests/    # Format Python
uv run ruff check webapp/ tests/     # Lint Python
pnpm test                            # Run TS tests
uv run pytest tests/                 # Run Python tests
```

## How to Contribute

### Word Lists

Word lists are stored in `webapp/data/languages/{lang}/{lang}_5words.txt`.

**Good words:**
- Common 5-letter words in the language
- Words that native speakers would recognize
- Nouns, verbs, adjectives in their base/common forms

**Words to avoid:**
- Proper names (people, cities, brands)
- Offensive or inappropriate words
- Abbreviations or words from other languages
- Obscure technical terms
- Incorrect conjugations/declensions

### Keyboards

Keyboard layouts are in `webapp/data/languages/{lang}/{lang}_keyboard.json`.

```json
[
    ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
    ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
    ["⇨", "z", "x", "c", "v", "b", "n", "m", "⌫"]
]
```

- Use `⇨` for Enter and `⌫` for Backspace
- Follow the standard keyboard layout for the language
- Include all characters that appear in the word list

### Translations

UI text is in `webapp/data/languages/{lang}/language_config.json`. Please ensure translations are natural and accurate (not machine-translated).

### Adding a New Language

1. Create folder: `webapp/data/languages/{lang_code}/`
2. Add word list: `{lang}_5words.txt` (one 5-letter word per line, lowercase)
3. (Optional) Add `language_config.json` — UI translations and metadata
4. (Optional) Add `{lang_code}_keyboard.json` — custom keyboard layout
5. (Optional) Add `{lang_code}_5words_supplement.txt` — additional valid guesses

## Pull Requests

- Link the issue in your PR description (`Fixes #123`)
- All tests must pass
- One logical change per PR

## Do

- Add try-catch around localStorage (fails in private browsing)
- Test both light and dark modes
- Consider RTL languages (Hebrew, Arabic, Persian)
- Keep bundle size small (~75KB gzipped target)

## Don't

- Change random seed (42) — breaks word selection globally
- Assume word lists are alphabetical — they're shuffled
- Add console.logs to production code
- Modify `webapp/static/dist/` manually (auto-generated)

## License Agreement

By submitting a pull request, you agree that:

1. Your contributions are licensed under the [MIT License](LICENSE).
2. You have the right to submit the contribution.
3. For word lists and language data, you confirm the data is from a source that permits redistribution, or is your own compilation.

## Language Maintainers

We're looking for native speakers to help maintain specific languages. If you'd like to become a maintainer for your language, open an issue!

Current maintainers:
- **Gaelic (gd)**: @akerbeltz
- **Te Reo Māori (mi)**: @LeTink
