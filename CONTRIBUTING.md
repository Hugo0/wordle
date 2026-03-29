# Contributing to Wordle Global

Thanks for your interest in contributing! This project supports 80 languages and we welcome help improving word lists, keyboards, translations, and code.

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
├── data/                      # Language data (word lists, configs, keyboards)
│   ├── languages/{lang}/      # Per-language files
│   │   ├── words.json         # Word data (source of truth + runtime)
│   │   ├── keyboard.json      # Keyboard layout
│   │   └── language_config.json # UI translations, metadata
│   └── default_language_config.json
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
- Word data loaded from `data/languages/{lang}/words.json`

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
- Run `uv run ruff format scripts/ tests/` and `uv run ruff check scripts/ tests/`
- Pre-commit hooks run both automatically

## Before Committing

```bash
pnpm format                                    # Format TypeScript
uv run ruff format scripts/ tests/     # Format Python
uv run ruff check scripts/ tests/      # Lint Python
npx nuxt prepare && pnpm test                  # Run TS tests
uv run pytest tests/                           # Run Python tests
```

## How to Contribute

### Word Lists

Word data is managed via the word pipeline in `scripts/word_pipeline/`. Source of truth is `data/languages/{lang}/words.json`.

### Keyboards

Keyboard layouts are in `data/languages/{lang}/keyboard.json`.

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

UI text is in `data/languages/{lang}/language_config.json`. Please ensure translations are natural and accurate (not machine-translated).

### SEO Content (`seo` block)

All SEO content (FAQ, HowTo, tips, value props, section headings) lives in the `seo` section of each language's `language_config.json`. English defaults are in `data/default_language_config.json`.

**Contract for translators:**
- Provide the **full `seo` block** when translating — the data loader does a shallow merge, so a partial `seo` override replaces the entire object and loses unspecified keys.
- Placeholders are interpolated at runtime: `{langName}`, `{lang}`, `{modeName}`, `{boardCount}`, `{maxGuesses}`. Keep them as-is in translations.
- Mode-specific content uses `mode_*` keys. Multi-board modes (dordle through duotrigordle) share the `multiboard` key.
- `faq` is the default (classic mode). `mode_faq.unlimited`, `mode_faq.speed`, `mode_faq.multiboard` override per mode.
- Same pattern for `howto` / `mode_howto` and `tips` / `tips_speed` / `tips_multiboard`.
- Currently translated: `en` (defaults), `fi`, `ar`, `de`. All other languages fall back to English.

### Adding a New Language

1. Create folder: `data/languages/{lang_code}/`
2. Add `words.json` with word list data
3. Run the word pipeline: `cd scripts && uv run python -m word_pipeline run {lang_code}`
4. (Optional) Add `language_config.json` — UI translations and metadata
5. (Optional) Add `keyboard.json` — custom keyboard layout

## Pull Requests

- Link the issue in your PR description (`Fixes #123`)
- All tests must pass

## Do

- Add try-catch around localStorage (fails in private browsing)
- Test both light and dark modes
- Consider RTL languages (Hebrew, Arabic, Persian)
- Keep bundle size small
- **Test direct navigation**, not just SPA clicks. Pages like `/en/word/123` and `/en/words` are reached via Google, bookmarks, and shared links — not just by clicking through the app. If a page depends on store state, verify it works when that store hasn't been initialized.
- **Check what already exists** before building something new. Search `components/shared/` for reusable components (e.g., `BaseModal`), `composables/` for shared logic, and `utils/` for helpers. Don't hand-roll what's already available.
- **Type API responses explicitly.** Don't use `any`, `Record<string, unknown>`, or untyped `let x = null`. Define interfaces for response shapes so downstream consumers get type safety.
- **Clean up after yourself.** Remove dead code, remove unused imports, add `onUnmounted` cleanup for event listeners added in `onMounted`.

## Don't

- Change the daily word algorithm — breaks word selection globally
- Add console.logs to production code
- Modify `.nuxt/` or `.output/` manually (auto-generated)
- **Don't manipulate the DOM imperatively in Vue components.** No `$event.target.style.display`, no `classList.add/remove`, no `parentElement!.classList`. Use reactive state (`ref`, `reactive`, `computed`) and let Vue's template directives (`v-if`, `v-show`, `:class`) handle visibility. The only exception is third-party integrations (e.g., Giscus) that require direct DOM access.
- **Don't copy-paste template blocks.** If you have similar markup in 2+ places, extract it into a component or use a computed to unify the data source. Three definition blocks that differ only in which variable they read is not DRY.
- **Don't use `langStore` outside game pages.** The language store requires `init()` which only happens via `useGamePage()` on game routes. Standalone pages (`/[lang]/word/[id]`, `/[lang]/words`, etc.) must get UI labels from their own API response, not from the store. If a page needs translated strings, add `ui: config.ui` to the API endpoint's return value.

## Multi-Agent Collaboration

When multiple AI agents work on this repo concurrently, follow these rules:

- Every agent **MUST** work in its own git worktree. Use `git worktree add` to create an isolated copy of the repo before making changes.
- If an agent is not working in a worktree, it **MUST** be careful with other agents' code. Never stash, checkout, reset, or in any way modify or discard another agent's in-progress work without explicit permission.
- Coordinate before touching shared files. If two agents need to edit the same file, one should finish and commit first.
- Never force-push or rewrite history on a branch another agent is using.

## License Agreement

This project is licensed under the **PolyForm Noncommercial 1.0.0** license. You may use, modify, and distribute it for any noncommercial purpose. Commercial use (ads, subscriptions, selling) requires written permission from the licensor.

By submitting a pull request, you agree that:

1. Your contributions are licensed under the [PolyForm Noncommercial 1.0.0](LICENSE) license.
2. You grant the project maintainer the right to relicense your contribution under future license terms.
3. You have the right to submit the contribution.
4. For word lists and language data, you confirm the data is from a source that permits redistribution, or is your own compilation.

## Language Maintainers

We're looking for native speakers to help maintain specific languages. If you'd like to become a maintainer for your language, open an issue!

Current maintainers:
- **Gaelic (gd)**: @akerbeltz
- **Te Reo Māori (mi)**: @LeTink
