# Nuxt 3 Migration Plan — Wordle Global

## Context

Wordle Global is migrating from Flask+Jinja+Vue (Options API) to Nuxt 3 with SSR. The goal: one language (TypeScript), one server (Node/Nitro), best-in-class SEO (full SSR), and a modular component architecture ready for multiple game modes, auth, and challenge features. Python scripts remain as offline tooling for word pipeline, share image generation, and data analysis.

**Replaces:** `docs/architecture-migration.md` (Jan 2026, now outdated)

---

## Architecture Overview

```
BEFORE                              AFTER
──────                              ─────
Flask (Python)                      Nuxt 3 (Node/Nitro)
├── Jinja2 templates (SSR)          ├── Vue SFCs + SSR
├── Vue 3 Options API (client)      ├── Vue 3 Composition API
├── Vite (build only)               ├── Nuxt build system (Vite internal)
├── Gunicorn (8 workers)            ├── Nitro server
└── 1,527-line app.py monolith      └── Modular server/api/ routes

Python scripts (offline)            Python scripts (unchanged)
├── improve_word_lists.py           ├── improve_word_lists.py
├── generate_share_images.py        ├── generate_share_images.py
├── pregenerate_definitions.py      ├── pregenerate_definitions.py
└── pytest data validation          └── pytest data validation
```

---

## Target Directory Structure

```
wordle/
├── nuxt/                           # Nuxt 3 app (replaces webapp/ + frontend/)
│   ├── nuxt.config.ts
│   ├── app.vue                     # Root (dark mode init, NuxtLayout, NuxtPage)
│   ├── error.vue                   # 404 page
│   ├── assets/css/main.css         # Tailwind + custom animations
│   ├── components/
│   │   ├── game/
│   │   │   ├── GameBoard.vue       # 6x5 tile grid
│   │   │   ├── TileRow.vue         # Single row with shake binding
│   │   │   ├── Tile.vue            # Individual tile with flip
│   │   │   ├── GameKeyboard.vue    # On-screen keyboard
│   │   │   ├── KeyboardKey.vue     # Individual key with hints
│   │   │   ├── GameHeader.vue      # Title bar + buttons
│   │   │   ├── StatsModal.vue      # 3-tab statistics
│   │   │   ├── HelpModal.vue       # Tutorial
│   │   │   ├── SettingsModal.vue   # Settings toggles
│   │   │   └── NotificationToast.vue
│   │   └── shared/
│   │       ├── ToggleSwitch.vue
│   │       └── ModalBackdrop.vue
│   ├── composables/
│   │   ├── useHaptics.ts           # Vibration feedback
│   │   ├── useSounds.ts            # Web Audio tones
│   │   ├── useDefinitions.ts       # Fetch definitions + images
│   │   ├── useEmbed.ts             # Iframe detection
│   │   └── useHreflang.ts          # SEO hreflang tags
│   ├── layouts/
│   │   ├── default.vue             # Standard page layout
│   │   └── game.vue                # Full-height game layout (100dvh)
│   ├── pages/
│   │   ├── index.vue               # / — homepage
│   │   ├── stats.vue               # /stats
│   │   └── [lang]/
│   │       ├── index.vue           # /<lang> — game page
│   │       ├── words.vue           # /<lang>/words — archive
│   │       └── word/[id].vue       # /<lang>/word/<id> — word detail
│   ├── plugins/
│   │   ├── analytics.client.ts     # GA4 + PostHog
│   │   ├── pwa.client.ts           # PWA install prompts
│   │   └── debug.client.ts         # Console debug tools
│   ├── public/                     # Static files (favicons, sw.js, share images)
│   ├── server/
│   │   ├── api/
│   │   │   ├── languages.get.ts    # All language metadata
│   │   │   ├── stats.get.ts        # Site-wide statistics
│   │   │   └── [lang]/
│   │   │       ├── data.get.ts     # Language data (word list, config, keyboard)
│   │   │       ├── definition/[word].get.ts
│   │   │       ├── word-image/[word].get.ts
│   │   │       └── word-stats.post.ts
│   │   ├── routes/
│   │   │   ├── robots.txt.ts
│   │   │   ├── llms.txt.ts
│   │   │   ├── sitemap.xml.ts
│   │   │   ├── sitemap-main.xml.ts
│   │   │   └── sitemap-words-[lang].xml.ts
│   │   └── utils/
│   │       ├── data-loader.ts      # Load word lists, configs at startup
│   │       ├── word-selection.ts   # Daily word algorithm (ported from Python)
│   │       ├── definitions.ts      # LLM + kaikki fallback
│   │       ├── word-stats.ts       # Atomic stats read/write
│   │       └── language-builder.ts # Build Language object
│   ├── stores/                     # Pinia
│   │   ├── game.ts                 # Tiles, colors, game state, animations
│   │   ├── settings.ts             # Dark mode, haptics, hard mode, colorblind
│   │   ├── stats.ts                # Game results, streaks, distributions
│   │   └── language.ts             # Current language config + word lists
│   └── utils/                      # Shared (server + client)
│       ├── types.ts                # All TypeScript interfaces
│       ├── diacritics.ts           # Accent normalization (direct port)
│       ├── positional.ts           # Final form mapping (direct port)
│       ├── stats.ts                # Percentile calculation (direct port)
│       └── graphemes.ts            # Intl.Segmenter wrapper (direct port)
├── webapp/data/                    # Language data files (unchanged, read by Nuxt server)
├── scripts/                        # Python offline tooling (unchanged)
├── tests/                          # pytest data validation (unchanged)
└── docs/                           # Updated documentation
```

---

## Migration Phases

### Phase 0: Foundation (Week 1)

**Goal:** Scaffolded Nuxt project that builds and serves a "hello world" page.

- [ ] Initialize Nuxt 3 project in `nuxt/` directory
- [ ] Install deps: `@pinia/nuxt`, `@vite-pwa/nuxt`, `openai`, `proper-lockfile`, `sharp`
- [ ] Configure Tailwind v4 via `@tailwindcss/vite` plugin in nuxt.config.ts
- [ ] Copy `frontend/src/style.css` → `nuxt/assets/css/main.css`
- [ ] Copy pure utility modules verbatim: `diacritics.ts`, `positional.ts`, `stats.ts`, `graphemes.ts`, `types.ts`
- [ ] Symlink `webapp/data/` → accessible from Nuxt server
- [ ] Copy `webapp/static/` assets → `nuxt/public/` (favicons, offline pages, share images)
- [ ] Pre-compute shuffled word lists: Run a one-time Python script that writes `{lang}_5words_shuffled.json` for each language (avoids replicating Python's PRNG in Node)
- [ ] Deprecate `docs/architecture-migration.md`, replace with this document

### Phase 1: Server Logic Port (Week 2-3)

**Goal:** All Flask backend logic running in Nitro with verified algorithm parity.

**Data Loading** (`server/utils/data-loader.ts`):
- [ ] Port `load_words()` — read pre-shuffled JSON lists
- [ ] Port `load_supplemental_words()`
- [ ] Port `load_blocklist()`
- [ ] Port `load_daily_words()`
- [ ] Port `load_curated_schedule()`
- [ ] Port `load_language_config()` — deep merge with defaults
- [ ] Port `load_keyboard()` — normalize layouts, generate alphabetical fallback
- [ ] Port `load_characters()` — auto-generate from word list if missing
- [ ] Implement startup cache (all data loaded once, same as Flask)

**Word Selection** (`server/utils/word-selection.ts`):
- [ ] Port `get_todays_idx(timezone)` — use `Intl.DateTimeFormat` for timezone
- [ ] Port `_word_hash()` / `_day_hash()` — use `crypto.createHash('sha256')`
- [ ] Port `get_daily_word_consistent_hash()` — binary search for closest hash
- [ ] Port `get_daily_word_legacy()` — read pre-shuffled list, `words[idx % len]`
- [ ] Port `get_word_for_day()` — 3-tier selection + disk caching
- [ ] Port `_compute_word_for_day()` — curated schedule → daily words → filtered main
- [ ] Port `idx_to_date()` — reverse mapping
- [ ] `MIGRATION_DAY_IDX = 1681` constant
- [ ] **PARITY TEST**: Script that verifies identical word selection for all 77 langs × days 1-1800

**Definitions** (`server/utils/definitions.ts`):
- [ ] Port `fetch_definition()` — 3-tier: cache → LLM → kaikki
- [ ] Port `_call_llm_definition()` — use OpenAI TypeScript SDK
- [ ] Port `lookup_kaikki_native()` / `lookup_kaikki_english()` — read JSON files
- [ ] Port `_wiktionary_url()` — URL construction
- [ ] Port cache read/write — same JSON format, same paths
- [ ] Port negative cache with 24h TTL

**Stats** (`server/utils/word-stats.ts`):
- [ ] Port `_load_word_stats()` — read JSON file
- [ ] Port `_update_word_stats()` — use `proper-lockfile` instead of `fcntl.flock()`
- [ ] Port IP/client deduplication (in-memory Map, 50K cap, daily reset)
- [ ] Port `_build_stats_data()` — aggregate all languages, 5-min cache

**Language Builder** (`server/utils/language-builder.ts`):
- [ ] Port `Language` class — daily word, keyboard layouts, diacritic hints, timezone offset

### Phase 2: API Routes (Week 3-4)

**Goal:** All Flask routes working as Nitro endpoints.

**API routes** (`server/api/`):
- [ ] `GET /api/languages` — all language metadata (replaces homepage data injection)
- [ ] `GET /api/[lang]/data` — word list, supplement, characters, config, todaysIdx, todaysWord, timezoneOffset, keyboard
- [ ] `GET /api/[lang]/definition/[word]` — definition JSON
- [ ] `GET /api/[lang]/word-image/[word]` — DALL-E image (use `sharp` for WebP)
- [ ] `POST /api/[lang]/word-stats` — anonymous stats submission
- [ ] `GET /api/stats` — site-wide statistics aggregation

**Non-API routes** (`server/routes/`):
- [ ] `robots.txt` — same content
- [ ] `llms.txt` — same content
- [ ] `sitemap.xml` — sitemap index
- [ ] `sitemap-main.xml` — homepage, language pages, word hubs
- [ ] `sitemap-words-[lang].xml` — per-language word pages

**Middleware**:
- [ ] HTTP → HTTPS redirect (non-localhost)

### Phase 3: Frontend — Pinia Stores (Week 4-5)

**Goal:** All game state and logic decomposed into Pinia stores.

**`stores/game.ts`** — extracted from game.ts (1,816 lines):
- [ ] Tile state: tiles, tileClasses, tilesVisual, tileClassesVisual
- [ ] Game state: activeRow, activeCell, gameOver, gameWon, gameLost, attempts
- [ ] Keyboard: keyClasses, pendingKeyUpdates
- [ ] Animation: animating, shakingRow
- [ ] Notifications: show, fading, message
- [ ] Modals: showHelpModal, showStatsModal, showOptionsModal
- [ ] Actions: addChar(), deleteChar(), submitGuess(), updateColors()
- [ ] Animations: revealRow(), shakeRow(), bounceRow(), _nudgeKey()
- [ ] Share: getEmojiBoard(), share()
- [ ] localStorage save/load
- [ ] Hard mode validation
- [ ] Colorblind/high-contrast mode

**`stores/settings.ts`**:
- [ ] darkMode, feedbackEnabled, wordInfoEnabled, hardMode, highContrast
- [ ] All toggles with localStorage persistence
- [ ] SSR-safe: read localStorage only in `onMounted` / `import.meta.client`

**`stores/stats.ts`**:
- [ ] gameResults (from localStorage)
- [ ] calculateStats(langCode), calculateTotalStats()
- [ ] saveResult(), loadGameResults()
- [ ] submitWordStats() — POST to API

**`stores/language.ts`**:
- [ ] config, wordList, wordListSupplement, characters
- [ ] todaysIdx, todaysWord, timezoneOffset
- [ ] keyboard, keyboardLayouts, keyDiacriticHints
- [ ] Normalization maps (built from config)

### Phase 4: Frontend — Vue Components (Week 5-7)

**Goal:** All Jinja templates replaced with Vue SFCs.

**Game components** (from game.html 715 lines):
- [ ] `GameBoard.vue` — 6x5 grid with perspective
- [ ] `TileRow.vue` — single row, shake binding
- [ ] `Tile.vue` — individual tile, v-bind:class from store
- [ ] `GameKeyboard.vue` — keyboard rows from language store
- [ ] `KeyboardKey.vue` — key with diacritic hints, color state
- [ ] `GameHeader.vue` — title, help/stats/settings buttons
- [ ] `StatsModal.vue` — 3 tabs (Today/Stats/Global), guess distribution, streaks
- [ ] `HelpModal.vue` — tutorial with localized text
- [ ] `SettingsModal.vue` — toggles (dark mode, feedback, hard mode, colorblind, word info)
- [ ] `NotificationToast.vue` — slide-down + fade-out

**Shared components** (from Jinja partials):
- [ ] `ToggleSwitch.vue` — replaces `_toggle_switch.html` macro
- [ ] `ModalBackdrop.vue` — replaces `_modal_backdrop.html`

**Pages**:
- [ ] `pages/index.vue` — homepage (replaces index.html + index-app.ts)
- [ ] `pages/[lang]/index.vue` — game page (replaces game.html + game.ts)
- [ ] `pages/[lang]/words.vue` — word archive (replaces words_hub.html)
- [ ] `pages/[lang]/word/[id].vue` — word detail (replaces word.html)
- [ ] `pages/stats.vue` — site stats (replaces stats.html)
- [ ] `error.vue` — 404 page (replaces 404.html)

**Composables** (from frontend modules):
- [ ] `useHaptics.ts` — wrap haptics.ts with SSR guard
- [ ] `useSounds.ts` — wrap sounds.ts with SSR guard
- [ ] `useDefinitions.ts` — definition + image fetching (use `$fetch`)
- [ ] `useEmbed.ts` — iframe detection
- [ ] `useHreflang.ts` — SEO hreflang via `useHead()`

**Plugins** (client-only):
- [ ] `analytics.client.ts` — GA4 gtag + PostHog init
- [ ] `pwa.client.ts` — PWA install prompts (@khmyznikov/pwa-install)
- [ ] `debug.client.ts` — console debug tools (ASCII banner)

**Layouts**:
- [ ] `default.vue` — standard pages (homepage, stats, word pages)
- [ ] `game.vue` — full-height game layout (100dvh, overflow-hidden, safe-area)

**SEO per page** (via `useHead` / `useSeoMeta`):
- [ ] Title, description, og:title, og:description, og:image, og:url
- [ ] hreflang for all 77 languages
- [ ] JSON-LD structured data (WebApplication, BreadcrumbList)
- [ ] canonical URLs
- [ ] Share result meta tags (when `?r=` query param present)

### Phase 5: PWA, Analytics, Service Worker (Week 7-8)

- [ ] Configure `@vite-pwa/nuxt` — manifest, workbox, offline fallback
- [ ] Port service worker caching strategy (network-first HTML, cache-first assets)
- [ ] GA4 gtag initialization (deferred script load)
- [ ] PostHog initialization (3% session recording)
- [ ] Dark mode flash prevention (inline script via `useHead`)
- [ ] PWA install banner (after game win, 7-day dismiss cooldown)
- [ ] Embed banner (iframe detection)

### Phase 6: Testing & Verification (Week 8-9)

**Algorithm parity** (most critical):
- [ ] Script that tests `getWordForDay(lang, dayIdx)` for all 77 langs × days 1-1800
- [ ] Compare Flask output vs Nuxt output — must be 100% identical

**SEO parity**:
- [ ] Crawl both servers with Screaming Frog
- [ ] Compare: title tags, meta descriptions, canonical URLs, hreflang, structured data
- [ ] Compare sitemap XML byte-for-byte
- [ ] Verify robots.txt and llms.txt match

**Vitest** (port from frontend/src/__tests__/):
- [ ] game-logic.test.ts — color calculation, stats
- [ ] diacritics.test.ts — accent normalization
- [ ] positional.test.ts — final form mapping
- [ ] definitions.test.ts — API mocking
- [ ] percentile.test.ts — community percentile

**Playwright E2E** (port from e2e/):
- [ ] Homepage loads, language picker works
- [ ] Game page loads for 5 languages (en, fi, ar, he, ko)
- [ ] Typing, submitting, win/loss flows
- [ ] Dark mode toggle
- [ ] Mobile viewport

**Visual regression**:
- [ ] Screenshot comparison (Flask vs Nuxt) for 10 key pages
- [ ] Light + dark mode

### Phase 7: Deployment & Switchover (Week 9-10)

**Render configuration**:
- [ ] Build command: `cd nuxt && pnpm install && pnpm build`
- [ ] Start command: `node nuxt/.output/server/index.mjs`
- [ ] Runtime: Node.js (not Python)
- [ ] Persistent disk: same `/data` mount (word-images, word-defs, word-stats, word-history)
- [ ] Environment: `DATA_DIR=/data`, `OPENAI_API_KEY=...`, `NODE_ENV=production`

**Switchover plan**:
1. Deploy Nuxt to staging URL on Render (separate service, shared disk)
2. Run full parity + SEO tests against staging
3. Switch main service: update build/start commands, change runtime to Node
4. Monitor for 24h: error rates, word selection, stats submissions
5. Rollback plan: revert to Flask commands (both stacks read same data files)

**Post-migration cleanup** (after 2 weeks stable):
- [ ] Remove `webapp/` (Flask app, Jinja templates)
- [ ] Remove `frontend/` (old Vite setup)
- [ ] Remove `vite.config.js`, `gunicorn.dev.py`, `Procfile`, `Dockerfile`
- [ ] Update `pyproject.toml` — remove Flask, gunicorn deps (keep pytest, ruff, scripts deps)
- [ ] Update `CLAUDE.md` — new architecture, new dev commands
- [ ] Update CI workflow — no Python in build/lint jobs
- [ ] Keep `tests/` for pytest data validation (still Python)

---

## Key Technical Decisions

### Word list shuffle parity
Python's `random.seed(42)` + `random.shuffle()` uses Mersenne Twister. Replicating this in Node is fragile. **Solution:** keep backwards compatibility to not change historic words, but we're fine with future word changes using new deterministic shuffle.

### Atomic file writes (replaces fcntl.flock)
Use `proper-lockfile` npm package. Lock file, read-modify-write, unlock. Non-blocking retry with skip (same behavior as Flask's non-blocking flock).

### Daily word in client bundle
Keep current approach: `todaysWord` included in SSR payload (visible in page source). This is the existing security posture. Server-side guess validation would add latency and break offline play.

### Tailwind v4 in Nuxt
Use `@tailwindcss/vite` directly in `nuxt.config.ts` under `vite.plugins`. Avoids `@nuxtjs/tailwindcss` module which is v3-centric.

### Dark mode flash
Inline script in `<head>` via `useHead({ script: [{ innerHTML: '...', tagPosition: 'head' }] })`. Same approach as current `_dark_mode_init.html`.

### SSR + localStorage
All localStorage reads happen behind `import.meta.client` guards or in `onMounted()`. Never during SSR. Pinia stores initialize with defaults, then hydrate from localStorage on mount.

### Share images
`scripts/generate_share_images.py` stays as Python offline tool. Generates static PNGs at build time. DALL-E runtime image generation uses OpenAI TS SDK + `sharp` for WebP conversion.

---

## File Migration Map

### Python → TypeScript (Server)

| Python Source | TypeScript Destination | ~Lines |
|---|---|---|
| `webapp/app.py` data loading (lines 117-457) | `server/utils/data-loader.ts` | 250 |
| `webapp/app.py` word selection (lines 337-510) | `server/utils/word-selection.ts` | 120 |
| `webapp/app.py` Language class (lines 636-792) | `server/utils/language-builder.ts` | 120 |
| `webapp/app.py` stats (lines 810-872) | `server/utils/word-stats.ts` | 80 |
| `webapp/app.py` routes (lines 874-1527) | `server/api/**/*.ts` + `server/routes/**/*.ts` | 400 |
| `webapp/definitions.py` (321 lines) | `server/utils/definitions.ts` | 250 |

### Frontend → Nuxt (Client)

| Source | Destination | Approach |
|---|---|---|
| `frontend/src/game.ts` (1,816 lines) | `stores/game.ts` + 10 components | Decompose |
| `frontend/src/index-app.ts` (350 lines) | `pages/index.vue` | Rewrite |
| `frontend/src/main.ts` (48 lines) | Eliminated (Nuxt handles entry) | — |
| `frontend/src/analytics.ts` (839 lines) | `plugins/analytics.client.ts` | Minimal wrapper |
| `frontend/src/posthog.ts` (131 lines) | `plugins/analytics.client.ts` | Merge |
| `frontend/src/definitions.ts` (193 lines) | `composables/useDefinitions.ts` | Use `$fetch` |
| `frontend/src/haptics.ts` (123 lines) | `composables/useHaptics.ts` | SSR guard |
| `frontend/src/sounds.ts` (107 lines) | `composables/useSounds.ts` | SSR guard |
| `frontend/src/pwa.ts` (167 lines) | `plugins/pwa.client.ts` | Use @vite-pwa/nuxt |
| `frontend/src/embed.ts` (63 lines) | `composables/useEmbed.ts` | Composable |
| `frontend/src/debug.ts` (124 lines) | `plugins/debug.client.ts` | Client-only |
| `frontend/src/diacritics.ts` (86 lines) | `utils/diacritics.ts` | Copy verbatim |
| `frontend/src/positional.ts` (110 lines) | `utils/positional.ts` | Copy verbatim |
| `frontend/src/stats.ts` (45 lines) | `utils/stats.ts` | Copy verbatim |
| `frontend/src/graphemes.ts` (19 lines) | `utils/graphemes.ts` | Copy verbatim |
| `frontend/src/types/index.ts` (206 lines) | `utils/types.ts` | Remove Window augmentation |
| `frontend/src/style.css` (255 lines) | `assets/css/main.css` | Copy |

### Jinja Templates → Vue SFCs

| Jinja Template | Vue Destination |
|---|---|
| `game.html` (715 lines) | `pages/[lang]/index.vue` + 10 game components |
| `index.html` (327 lines) | `pages/index.vue` |
| `stats.html` (420 lines) | `pages/stats.vue` |
| `word.html` (281 lines) | `pages/[lang]/word/[id].vue` |
| `words_hub.html` (164 lines) | `pages/[lang]/words.vue` |
| `404.html` (30 lines) | `error.vue` |
| `_base_head.html` | `nuxt.config.ts` + `app.vue` |
| `_dark_mode_init.html` | `app.vue` (inline script) |
| `_hreflang.html` | `composables/useHreflang.ts` |
| `_breadcrumb_schema.html` | `composables/useBreadcrumb.ts` |
| `_toggle_switch.html` | `components/shared/ToggleSwitch.vue` |
| `_modal_backdrop.html` | `components/shared/ModalBackdrop.vue` |
| `_loading_skeleton.html` | Eliminated (SSR replaces skeleton) |
| `_pwa_install.html` | `@vite-pwa/nuxt` module |
| `sitemap_*.xml` | `server/routes/sitemap*.ts` |

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| Word selection mismatch | Critical | Pre-shuffled lists + exhaustive parity test (77 langs × 1800 days) |
| SEO ranking drop | High | Exact URL parity, crawl comparison, staged rollout |
| localStorage SSR hydration | Medium | All reads behind `import.meta.client` / `onMounted()` |
| Performance regression | Medium | Nitro is typically faster than Gunicorn for page serving. Monitor TTFB. |
| PWA cache conflicts | Medium | Increment SW cache version. New asset URL pattern (`/_nuxt/`). |
| Persistent disk access | Low | Same paths, same env var. No data migration needed. |

---

## Estimated Effort

| Phase | Duration | Key Deliverable |
|---|---|---|
| 0: Foundation | 3 days | Nuxt project scaffolded, utils copied |
| 1: Server logic | 8 days | All Python→TS ports, word selection parity verified |
| 2: API routes | 4 days | All 13 Flask routes working in Nitro |
| 3: Pinia stores | 5 days | game.ts monolith decomposed into 4 stores |
| 4: Vue components | 8 days | All templates → SFCs, all pages SSR |
| 5: PWA/Analytics | 3 days | Service worker, GA4, PostHog, dark mode |
| 6: Testing | 5 days | Parity, SEO, visual regression, E2E |
| 7: Deployment | 3 days | Staging → production switchover |
| **Total** | **~5-6 weeks** | |

---

## First Steps (actionable now)

1. Create `nuxt/` directory and initialize project
2. Write Python script to pre-compute shuffled word lists
3. Port `word-selection.ts` and run parity test — this is the highest-risk piece
4. Copy pure utility modules (diacritics, positional, stats, types)
5. Build first API route (`/api/[lang]/data`) and first page (`pages/[lang]/index.vue`)

---

## Verification

After each phase:
- `pnpm dev` in nuxt/ — verify pages render
- Run parity tests against Flask (word selection, definitions)
- `pnpm test` — vitest passes
- `pnpm build` — production build succeeds
- Screaming Frog crawl comparison (Phase 6+)

Final verification before switchover:
- All 77 languages load and render correctly
- Word selection matches Flask for today + past 1800 days
- Sitemaps identical
- Share images served correctly
- Stats submission works
- Definition caching works
- PWA installs and works offline
