# Wordle Global - TODO

## Retention (Critical - 93% users are new, only 7% return)

**Finnish users have 39% return rate vs ~10% for others - study why!**

### Hooked Model Implementation

1. **Trigger** (bring users back daily)
   - [ ] Email/push notifications for daily word reminder
   - [ ] "Yesterday's word was X" teaser on social media
   - [ ] Browser notifications (already have PWA)

2. **Action** (make playing frictionless)
   - [ ] Faster load time (already improved: 430KB → 75KB)
   - [ ] Remember last played language
   - [ ] One-tap play from PWA home screen icon

3. **Variable Reward** (make winning satisfying)
   - [ ] Better win animations (confetti, etc.)
   - [ ] Share card with emoji grid (improve design)
   - [ ] Social share preview with user stats and history (win %, streak, guess distribution) to incentivize sharing
   - [ ] "Hard mode" for experienced players
   - [ ] Daily stats comparison with global averages

4. **Investment** (make users invested)
   - [ ] Cross-language stats ("You've played 5 languages!")
   - [ ] Streak protection (miss a day, keep streak with ad/share)
   - [ ] Achievement badges (first win, 7-day streak, etc.)
   - [ ] Leaderboards per language

## High Priority

- [ ] Curate word lists for existing languages (50% of user complaints)
- [ ] Add keyboard layouts for languages missing them
- [ ] Fully translate game interface (missing: score streaks, options modal)
- [ ] Migrate homepage (`index.html`) to Vite build (still uses CDN)

## Mobile (58% bounce rate on mobile)

- [ ] Investigate why mobile users leave quickly
- [ ] Test on low-end Android devices
- [ ] Reduce time-to-interactive
- [ ] Consider AMP or lighter mobile version

## Features

- [ ] Nice animations for revealing letters
- [ ] 4, 6, 7 letter word variants
- [ ] Better accent/diacritic handling (French is problematic)
- [ ] OG image for social sharing
- [ ] www → non-www redirect
- [ ] "Unlimited mode" (practice with random words)

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

### Arabic (`/ar`) - 13.5K sessions, 56% bounce

- [x] Add Arabic 101 keyboard layout (Arabic 101 + Alphabetical)
- [ ] Curate word list - remove grammatical forms like حاكما (accusative)
- [ ] Verify RTL rendering works correctly

### Hebrew (`/he`) - 3.4K sessions, 61% bounce (worst)

- [x] Add keyboard layouts (PR #105)
- [ ] Reduce word list from 64K to ~5-10K curated words
- [ ] Fix incorrect final letter usage (ושכשכ ends in כ instead of ך)
- [ ] Remove invalid words: קבותם, ושכשכ (GitHub #79, #72, #77)

### Turkish (`/tr`) - 6.6K sessions, 46% bounce

- [x] Add Turkish-Q keyboard layout (Turkish Q + Alphabetical)
- [ ] Curate to root words only (no suffixed forms)
- [ ] Use TDK dictionary as source

### Bulgarian (`/bg`) - 4.6K sessions, 54% bounce

- [x] Keyboard exists (Cyrillic QWERTY)
- [x] Remove 700+ proper nouns from word list (728 removed, 4952 → 4224 words)

### Hungarian (`/hu`) - 2.3K sessions, 55% bounce

- [x] Add Hungarian keyboard layout (QWERTZ + Alphabetical)
- [x] Add missing letter "Y" to character set (GitHub #18)
- [ ] Remove non-Hungarian words: hodor, rauch, etc.
- [ ] Fix preverb handling (GitHub #51)

### Croatian (`/hr`) - 5.1K sessions, 48% bounce

- [ ] Major word list cleanup needed (DrWords opened 20+ issues)
- [ ] Remove Serbian words, proper names, invalid declensions
- [ ] Consider partnering with wordle.hr maintainers

### Other Data Issues

- [ ] Fix Portuguese word list (duplicates, whitespace)
- [ ] Fix Esperanto word endings (GitHub #102)
- [ ] Recruit native speaker maintainers per language
- [ ] Build word validation pipeline (Hunspell + name filter)

## Analytics & Monitoring

### GA4 Setup (Required)
- [ ] Register `language` as custom dimension in GA4 Admin (currently sent but not queryable)
- [ ] Register `attempt_number` as custom dimension
- [ ] Register `won` as custom dimension

### GA4 Bug Fix (High Priority)
- [x] Fix gtag initialization timing in `_base_head.html`
  - Moved `gtag('js')` and `gtag('config')` outside the `window.load` listener so early events (game_start, pwa_session) queue properly before gtag.js loads.

### Analytics Refactor (v2)

Current implementation fires fragmented events. Refactor to session-aggregated approach:

**Problems with current schema:**
1. `frustration_signal` fires every 3rd consecutive invalid - noisy. 247 signals in realtime doesn't tell us if it's 247 users or 30 users hitting it 8x each
2. Module-level state (`consecutiveInvalidCount`) is fragile - doesn't reset on game completion
3. `game_complete` missing struggle context (total invalids, max streak, time spent)

**Fix:** Track session state in `game.ts`, pass full picture to `game_complete`:

```typescript
// In game.ts during gameplay:
let sessionInvalidCount = 0;
let maxConsecutiveInvalid = 0;
let currentConsecutiveInvalid = 0;

// On invalid word:
sessionInvalidCount++;
currentConsecutiveInvalid++;
maxConsecutiveInvalid = Math.max(maxConsecutiveInvalid, currentConsecutiveInvalid);

// On valid word:
currentConsecutiveInvalid = 0;  // Reset streak

// On game complete - ONE event with full context:
analytics.trackGameComplete({
    language,
    won,
    attempts,
    streak_after,
    total_invalid_attempts: sessionInvalidCount,
    max_consecutive_invalid: maxConsecutiveInvalid,
    had_frustration: maxConsecutiveInvalid >= 3,
    time_to_complete_seconds: Math.floor((Date.now() - gameStartTime) / 1000),
});
```

Then delete `frustration_signal` event entirely. One event with full context > many fragmented signals.

- [ ] Refactor analytics to session-aggregated model
- [ ] Add time tracking (game start → complete)
- [ ] Delete `frustration_signal` event, move to `game_complete` property
- [ ] Track completion rate per language
- [ ] A/B test retention features
- [ ] Monitor Core Web Vitals
- [ ] Error tracking (Sentry or similar)

## Architecture

See [architecture-migration.md](./architecture-migration.md) for the SPA refactor plan.
See [data-pipeline.md](./data-pipeline.md) for word list and keyboard data documentation.
See [CURATED_WORDS.md](./CURATED_WORDS.md) for curated language registry and blocklists.

- [ ] Add `/api/language/{code}` JSON endpoint
- [ ] Add `/api/languages` list endpoint
- [ ] Refactor game to fetch data from API instead of Jinja injection
- [ ] Move keyboard rendering to JavaScript
- [ ] Consolidate storage to localStorage only (remove cookies)
- [ ] Update service worker to cache API responses
- [ ] Enable offline play for all visited languages

## Testing Improvements

Current test coverage:

- **pytest**: Word list validation, language configs, daily word algorithm (1636 tests)
- **Vitest**: `calculateColors`, `calculateStats`, diacritics, positional normalization
- **Playwright**: 18 smoke tests (homepage, game pages, RTL, dark mode, mobile) - **local only, not in CI**

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

Priority languages (by traffic/bounce rate):

- [ ] Arabic (ar) - 13.5K sessions, needs native speaker review
- [ ] Turkish (tr) - 6.6K sessions, needs native speaker review
- [ ] Croatian (hr) - 5.1K sessions, major cleanup needed
- [ ] Hebrew (he) - 3.4K sessions, needs final form filtering
- [ ] Hungarian (hu) - 2.3K sessions, needs non-Hungarian word removal
- [ ] Serbian (sr) - Has blocklist but needs curated schedule

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
