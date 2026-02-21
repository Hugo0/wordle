# Wordle Global - Development Guide

This file provides context for AI assistants (Claude, Cursor, etc.) working on this codebase.

## Project Overview

Wordle Global is an open-source Wordle clone supporting 65+ languages. Users play a daily word guessing game where they have 6 attempts to guess a 5-letter word.

**Live site**: [wordle.global](https://wordle.global)

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
│   │   └── index.html         # Homepage (still uses CDN - not migrated)
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

## Common Tasks

### Adding a New Language
1. Create folder: `webapp/data/languages/{lang_code}/`
2. Add word list: `{lang}_5words.txt` (one 5-letter word per line, lowercase)
3. Optionally add: keyboard, config, supplement words

### Running Locally
```bash
pnpm dev           # Starts both Flask server + Vite watcher
```

### Before Committing
```bash
pnpm format            # Format TypeScript
uv run black webapp/ tests/  # Format Python
pnpm test              # Run TS tests
uv run pytest tests/   # Run Python tests
```

## Important Notes

1. **Word lists are shuffled**: Don't assume alphabetical order
2. **Seed 42 is critical**: Changing it would change all daily words
3. **Homepage not migrated**: `index.html` still uses CDN, game pages use Vite
4. **~145 pytest xfails expected**: Pre-existing data quality issues (keyboards, word lists) are marked as `xfail`
5. **RTL languages**: Some languages (Hebrew, Arabic) are right-to-left

## Data Quality Issues (Known)
- Arabic: Some words not exactly 5 chars
- Portuguese: Has duplicates and whitespace
- Several languages: Character set mismatches

These are tracked by pytest but not blocking - they're data issues, not code issues.

## Code Style

### TypeScript

- Single quotes, 4-space indentation, trailing commas
- Run `pnpm format` (Prettier) before committing

### Python

- Black formatter, 100 char line length
- Run `black webapp/ tests/` before committing

## Don't

- Change random seed (42) - breaks word selection globally
- Assume word lists are alphabetical - they're shuffled
- Forget to run `pnpm build` before deploying
- Add console.logs to production code
- Modify `webapp/static/dist/` manually (auto-generated)

## Do

- Add try-catch around localStorage (fails in private browsing)
- Test both light and dark modes
- Consider RTL languages (Hebrew, Arabic, Persian)
- Keep bundle size small (~75KB gzipped target)
