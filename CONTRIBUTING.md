# Contributing to Wordle Global

Thanks for your interest in contributing! This project supports 78 languages and we welcome help improving word lists, keyboards, translations, and code.

## Quick Start

```bash
git clone https://github.com/Hugo0/wordle.git
cd wordle
pnpm install
pnpm dev           # Starts Nuxt dev server at localhost:3000
```

`uv` handles Python dependencies automatically.

## Architecture

```text
wordle/
├── pages/                     # Nuxt page routes
├── components/                # Vue components
├── composables/               # Vue composables
├── stores/                    # Pinia stores
├── server/                    # Nitro server (API routes, data loading)
│   ├── api/                   # API endpoints
│   ├── plugins/               # Server startup plugins
│   └── utils/                 # Server utilities (data-loader, definitions)
├── layouts/                   # Nuxt layouts
├── plugins/                   # Client/server plugins
├── assets/                    # CSS, static assets processed by Vite
├── public/                    # Static files served as-is
├── utils/                     # Shared utilities
├── webapp/
│   └── data/                  # Language data (word lists, configs, keyboards)
│       ├── languages/{lang}/  # Per-language files
│       │   ├── words.yaml              # Source of truth (word pipeline)
│       │   ├── words_compiled.json     # Runtime word data
│       │   ├── keyboard.json           # Keyboard layout
│       │   └── language_config.json    # UI translations, metadata
│       └── default_language_config.json
├── tests/                     # All tests (pytest + vitest)
│   ├── test_*.py              # Python tests (pytest)
│   ├── *.test.ts              # TypeScript tests (vitest)
│   └── stores/                # Store tests
├── e2e/                       # Playwright E2E tests
├── scripts/                   # Python utility scripts & word pipeline
├── app.vue                    # Root Vue component
├── nuxt.config.ts             # Nuxt configuration
├── package.json               # Node.js dependencies & scripts
└── pyproject.toml             # Python dependencies
```

## Key Concepts

### Daily Word Selection
- Algorithm in `server/utils/data-loader.ts`
- Consistent hashing (post Jan 25, 2026), legacy shuffle before that
- Word data loaded from `webapp/data/languages/{lang}/words_compiled.json`

### Color Algorithm (Wordle rules)
- Green (correct): Letter in correct position
- Yellow (semicorrect): Letter exists but wrong position
- Gray (incorrect): Letter not in word
- **Important**: Handles duplicate letters correctly - green takes priority

### Build System
- **Nuxt 3** with Nitro server and Vite bundling
- Tailwind CSS v4 via `@tailwindcss/vite` plugin
- PWA support via `@vite-pwa/nuxt`
- Run `pnpm build` before deploying

### Testing
- `uv run pytest tests/` — Python tests for word lists, configs, daily word algorithm
- `pnpm test` — TypeScript unit tests (vitest) for game logic, API, definitions
- `pnpm test:e2e` — Playwright E2E tests
- CI runs all three on every PR
- `npx nuxt prepare` required before running vitest

## Code Style

### TypeScript
- Single quotes, 4-space indentation, trailing commas
- Run `pnpm format` (Prettier) before committing

### Python
- Ruff formatter + linter, 100 char line length
- Run `uv run ruff format webapp/ tests/ scripts/` and `uv run ruff check webapp/ tests/ scripts/`
- Pre-commit hooks run both automatically

## Before Committing

```bash
pnpm format                                    # Format TypeScript
uv run ruff format webapp/ tests/ scripts/     # Format Python
uv run ruff check webapp/ tests/ scripts/      # Lint Python
npx nuxt prepare && pnpm test                  # Run TS tests
uv run pytest tests/                           # Run Python tests
```

## How to Contribute

### Word Lists

Word data is managed via the word pipeline in `scripts/word_pipeline/`. Source of truth is `webapp/data/languages/{lang}/words.yaml`.

### Keyboards

Keyboard layouts are in `webapp/data/languages/{lang}/keyboard.json`.

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
2. Add `words.yaml` with word list data
3. Run the word pipeline: `cd scripts && uv run python -m word_pipeline run {lang_code}`
4. (Optional) Add `language_config.json` — UI translations and metadata
5. (Optional) Add `keyboard.json` — custom keyboard layout

## Pull Requests

- Link the issue in your PR description (`Fixes #123`)
- All tests must pass
- One logical change per PR

## Do

- Add try-catch around localStorage (fails in private browsing)
- Test both light and dark modes
- Consider RTL languages (Hebrew, Arabic, Persian)
- Keep bundle size small

## Don't

- Change the daily word algorithm — breaks word selection globally
- Add console.logs to production code
- Modify `.nuxt/` or `.output/` manually (auto-generated)

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
