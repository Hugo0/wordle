# Wordle Global - TODO

## Retention (IMPROVED - 64% returning users as of Feb 2026)

**Finnish users have 5.1 sessions/user, Bulgarian 6.9. Overall engagement rate 82%.**

### Hooked Model Implementation

1. **Trigger** (bring users back daily)
   - [ ] Email/push notifications for daily word reminder
   - [ ] "Yesterday's word was X" teaser on social media
   - [x] Browser notifications (PWA installed by 1,874 users/mo, 8,932 PWA sessions/mo)

2. **Action** (make playing frictionless)
   - [x] Faster load time (430KB → 75KB gzipped)
   - [ ] Remember last played language
   - [x] One-tap play from PWA home screen icon

3. **Variable Reward** (make winning satisfying)
   - [x] Win animations (flip, shake, pop + haptic feedback + sound effects)
   - [x] Share card with emoji grid
   - [x] Social share preview with per-language OG images
   - [ ] "Hard mode" for experienced players
   - [x] Daily stats comparison with global averages (community percentile)

4. **Investment** (make users invested)
   - [x] Cross-language stats ("You've played 5 languages!")
   - [ ] Streak protection (miss a day, keep streak with ad/share)
   - [ ] Achievement badges (first win, 7-day streak, etc.)
   - [ ] Leaderboards per language

## High Priority

- [x] Curate word lists for existing languages (38 langs now have daily_words.txt)
- [x] Add keyboard layouts for languages missing them (all 65 have keyboards)
- [ ] Fully translate game interface (missing: some UI strings in smaller langs)
- [x] Migrate homepage (`index.html`) to Vite build

## Mobile (bounce rate now 21.8% — was 58%)

- [x] Investigate why mobile users leave quickly (fixed: engagement features, PWA, word quality)
- [ ] Test on low-end Android devices
- [x] Reduce time-to-interactive (75KB gzipped bundle)
- [x] AMP not needed — mobile bounce rate dropped from 58% → 22%

## Features

- [x] Nice animations for revealing letters (flip/shake/pop + haptics + sounds)
- [ ] 4, 6, 7 letter word variants
- [x] Better accent/diacritic handling (diacritic normalization maps)
- [x] OG image for social sharing (per-language + per-share-result images)
- [x] www → non-www redirect
- [ ] "Unlimited mode" (practice with random words) — #1 missing feature by traffic potential
- [ ] Hard mode — table stakes, NYT/Sanuli/wordleunlimited all have it
- [ ] Colorblind / high contrast mode — accessibility standard
- [ ] Auto-show tutorial on first visit

## Language Quality (Priority by Traffic)

**Philosophy: Fix data, not code. Curated word lists > normalization hacks.**

Finnish (39% retention) proves this - official dictionary source, no workarounds needed.

### Curation Strategy for Top 30 Languages

**Current State (after PR #111):**
- 4 languages well-filtered: Hebrew (64K→8.5K), Arabic (10K→9.4K), Turkish (9.2K→8.7K), Serbian (18K→17.3K)
- 26 languages need attention: Most have 5-17K words with minimal/no blocklists

**Three-Tier Approach:**

**Tier 1: Automated Morphological Filtering** (Languages with rich inflection)
Apply pattern-based blocklists similar to Hebrew/Arabic/Turkish/Serbian:

| Language | Size | Filter Strategy |
|----------|------|-----------------|
| Slovenian (sl) | 11.7K | Block diminutives (-ček/-čka), possessives, case forms |
| Persian (fa) | 11.3K | Block verb conjugations, Arabic loanwords with ال- |
| Greek (el) | 10.2K | Block definite articles fused with words, verb tenses |
| Polish (pl) | 10.2K | Block diminutives (-ek/-ka), case endings |
| Ukrainian (uk) | 9.6K | Block patronymics (-ович/-івна), diminutives |
| Korean (ko) | 8.9K | Block verb conjugations, honorifics |
| Georgian (ka) | 8.8K | Block verb prefixes/suffixes |
| Basque (eu) | 7.5K | Block case suffixes (-ak/-ek/-en) |
| Hungarian (hu) | 6K | Block possessive/case suffixes |

**Tier 2: Community Curation** (Languages that need native speaker review)
For languages where automated filtering is hard, create `{lang}_daily_words.txt` files:

1. Extract next 365-1000 days of words: `python scripts/curate_words.py extract {lang} 1000`
2. Send to native speakers for review (mark proper nouns, obscure words, offensive terms)
3. Create `{lang}_daily_words.txt` with curated subset

Priority languages: Norwegian Nynorsk (nn), Slovak (sk), Danish (da), Estonian (et), Catalan (ca)

**Tier 3: Accept As-Is** (Languages with reasonable sizes)
Languages under ~6K words with good quality: Finnish (fi), Icelandic (is), Czech (cs), Dutch (nl), Faroese (fo)

**How Curation Works with Current Day:**
The consistent hashing algorithm (for days > 1681/Jan 25, 2026) handles curation gracefully:
- Past days (≤ 1681): Unaffected - uses legacy algorithm
- Adding blocklist entries: Only affects days where that word would have been selected
- Creating `daily_words.txt`: Immediately improves quality for future days

See [CURATED_WORDS.md](./CURATED_WORDS.md) for blocklist registry.

### Arabic (`/ar`) - 10.3K sessions/mo, 22% bounce (was 56%)

- [x] Add Arabic 101 keyboard layout (Arabic 101 + Alphabetical)
- [x] Char difficulty filter: removed 212 words with rare chars, 1,788 daily words
- [x] RTL rendering works correctly
- [ ] Further curate word list — remove grammatical forms

### Hebrew (`/he`) - 3K sessions/mo, 22% bounce (was 61%) — GROWING +43% WoW

- [x] Add keyboard layouts (PR #105)
- [x] Reduce word list — suffix dedup + wordfreq filter: 1,000 daily words (100% verified)
- [x] Blocklist: 1,442 additions
- [ ] Fix incorrect final letter usage (ושכשכ ends in כ instead of ך)
- **Note:** Former dominant competitor (meduyeket.net) is dead. We're likely #1 Hebrew Wordle now.

### Turkish (`/tr`) - 5.6K sessions/mo, 20% bounce (was 46%)

- [x] Add Turkish-Q keyboard layout (Turkish Q + Alphabetical)
- [ ] Curate to root words only (no suffixed forms)
- [ ] Use TDK dictionary as source

### Bulgarian (`/bg`) - 4.2K sessions/mo, 16% bounce (was 54%) — most loyal users (6.9 sessions/user)

- [x] Keyboard exists (Cyrillic QWERTY)
- [x] Remove 700+ proper nouns from word list (728 removed, 4952 → 4224 words)
- [x] Curated schedule: 126 words

### Hungarian (`/hu`) - 2.9K sessions/mo, 17% bounce (was 55%) — we rank #1 on Google

- [x] Add Hungarian keyboard layout (QWERTZ + Alphabetical)
- [x] Add missing letter "Y" to character set (GitHub #18)
- [ ] Remove non-Hungarian words: hodor, rauch, etc.
- [ ] Fix preverb handling (GitHub #51)

### Croatian (`/hr`) - 6K sessions/mo, 15% bounce (was 48%) — we likely lead this market

- [ ] Major word list cleanup needed (DrWords opened 20+ issues)
- [ ] Remove Serbian words, proper names, invalid declensions
- [ ] Consider partnering with wordle.hr maintainers

### Other Data Issues

- [ ] Fix Portuguese word list (duplicates, whitespace)
- [ ] Fix Esperanto word endings (GitHub #102)
- [ ] Recruit native speaker maintainers per language
- [ ] Build word validation pipeline (Hunspell + name filter)

## Analytics & Monitoring

### GA4 Setup
- [x] Fix gtag initialization timing in `_base_head.html`
- [x] Refactored analytics to session-aggregated model
- [x] `game_complete` now includes: total_invalid_attempts, max_consecutive_invalid, had_frustration, time_to_complete_seconds
- [x] `frustration_signal` replaced with frustration state in game_complete
- [x] Time tracking (game start → complete)
- [ ] Register custom dimensions in GA4 Admin for better querying
- [ ] A/B test retention features
- [ ] Monitor Core Web Vitals
- [ ] Error tracking (Sentry or similar) — currently 4,623 page_error events/mo

## Architecture

See [architecture-migration.md](./architecture-migration.md) for the SPA refactor plan.
See [data-pipeline.md](./data-pipeline.md) for word list and keyboard data documentation.
See [CURATED_WORDS.md](./CURATED_WORDS.md) for curated language registry and blocklists.

- [ ] Add `/api/language/{code}` JSON endpoint
- [ ] Add `/api/languages` list endpoint
- [ ] Refactor game to fetch data from API instead of Jinja injection
- [x] Move keyboard rendering to JavaScript
- [ ] Consolidate storage to localStorage only (remove cookies)
- [ ] Update service worker to cache API responses
- [ ] Enable offline play for all visited languages

## SEO (added Mar 2026)

- [x] hreflang tags for all 65 languages + x-default
- [x] JSON-LD structured data (WebSite, WebApplication, BreadcrumbList, CollectionPage)
- [x] Dynamic sitemaps (index + main + 65 per-language word sitemaps)
- [x] Per-language meta titles and descriptions (localized)
- [x] OG images (default + per-language + per-share-result)
- [x] Canonical URLs on all pages
- [x] noscript content block on game pages (localized how-to-play + cross-language links)
- [ ] FAQ / SEO content pages (wordleunlimited has this, drives 10M/mo)
- [ ] Get listed on Wordle alternative roundup sites
- [ ] Add Article schema to word pages

## Testing Improvements

Current test coverage:

- **pytest**: Word list validation, language configs, daily word algorithm (2029 passed, 289 skipped, 4 xfailed)
- **Vitest**: 81 tests — calculateColors, calculateStats, diacritics, positional normalization, definitions
- **Playwright**: 18 smoke tests (homepage, game pages, RTL, dark mode, mobile) - **local only, not in CI**
- **CI**: GitHub Actions runs lint (Ruff), pytest, vitest, type-check, and build on every PR

### CI Improvements

- [ ] Add Playwright tests to GitHub Actions CI workflow (requires Flask server + browser install)

### Recommended Test Additions

- [ ] Vitest: Word validation tests (`checkWord` logic with diacritic normalization)
- [ ] Vitest: Emoji board generation (`getEmojiBoard`)
- [ ] Vitest: Time until next day calculation (`getTimeUntilNextDay` with timezone offsets)
- [ ] Vitest: Game state transitions (win/lose detection, row advancement)
- [ ] Playwright: Gameplay interaction tests (type word, submit, check colors)
- [ ] Playwright: localStorage persistence tests (refresh preserves game state)
- [ ] Playwright: Stats modal tests (verify distribution bars, streak display)

## Curated Schedule System

**New feature: `{lang}_curated_schedule.txt`** - Ordered hand-curated daily words.

Priority order for daily word selection (days > 1681):

1. **curated_schedule.txt** - Line N = Day (1681 + N), highest priority
2. **daily_words.txt** - Curated pool with consistent hashing
3. **blocklist-filtered main list** - Fallback

### Curated Schedules Created

| Language       | Words | Status      |
|----------------|-------|-------------|
| German (de)    | 186   | ✅ Complete |
| Bulgarian (bg) | 126   | ✅ Complete |

### Curated Schedules Needed

Priority languages (by traffic, updated Mar 2026):

- [ ] Arabic (ar) - 10.3K sessions/mo, needs native speaker review
- [ ] Turkish (tr) - 5.6K sessions/mo, needs native speaker review
- [ ] Croatian (hr) - 6K sessions/mo, major cleanup needed
- [ ] Hebrew (he) - 3K sessions/mo (+43% growth), has daily_words but needs final form filtering
- [ ] Hungarian (hu) - 2.9K sessions/mo, needs non-Hungarian word removal
- [ ] Serbian (sr) - 1.9K sessions/mo, has blocklist but needs curated schedule
- [ ] English (en) - 45K sessions/mo, no daily_words.txt yet (uses main list)

## Completed

- [x] Multiple keyboard layouts per language (PR #105)
- [x] Vite build system (CDN → bundled, ~430KB → ~75KB gzipped)
- [x] TypeScript migration with strict null checks
- [x] Testing infrastructure (pytest + vitest)
- [x] CI/CD with GitHub Actions
- [x] PWA support (manifest, service worker, install prompt)
- [x] Dark mode toggle
- [x] Guess distribution graph in stats modal
- [x] Mobile viewport fixes (`100dvh`, touch-action, notch handling)
- [x] Share button fallback chain
- [x] Formatting (Prettier + Black)
- [x] Playwright E2E smoke tests setup (18 tests)
- [x] Curated schedule system (`curated_schedule.txt` support in app.py)
