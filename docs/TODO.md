# Action Items

*Updated: March 21, 2026*

Near-term bugs and tasks. For feature planning, see `docs/ROADMAP.md`.

---

## P0

- [x] **PWA post-win banner restored** — `#pwa-install-banner` element re-added to `pages/[lang]/index.vue`. Banner shows post-win via `pwa.client.ts`. *(Fixed during Nuxt migration)*
  - [ ] **Deduplicate listeners:** `pwa.client.ts:152` and `SettingsModal.vue` both capture `beforeinstallprompt` independently — consolidate to plugin only.
  - [ ] **Desktop: show bookmark CTA instead of PWA install.** Desktop install rate is 1.9% vs mobile 4.0%. Only show PWA install on mobile/tablet.
  - [ ] **Stop nagging returning users.** Cap at ~3 lifetime impressions for returners (current 7-day cooldown resets forever).

---

## Retention: New User Drop-Off (March 19 analysis)

**Problem:** 65K new users/month, only ~4.2K convert to returning (~6.5% retention). 93% play once and never come back.

**Where the funnel leaks (last 28 days):**

| Stage | Users | Lost |
|-------|-------|------|
| Land on site | 65,000 | |
| Start a game | 56,000 | 9,000 (14%) never engage |
| Complete a game | 34,000 | 22,000 (39%) abandon mid-game |
| Come back next day | ~4,200 | 30,000 (88%) never return |

**Key findings:**

1. **39% of new users never finish a game.** Completion rates vary wildly by language: Bulgarian 90%, Finnish 76%, English 64%, Arabic 47%, Portuguese 54%. Arabic is the 4th biggest traffic source with the worst completion rate.
2. **PWA prompt timing is wrong.** Shown to 14.7K new users, 787 install (5.3%). Full funnel Game Start → Complete → PWA Install = 7 people total. The prompt fires before the user has any reason to care.
3. **Desktop bounces 31% vs mobile 23%.** Chrome desktop is worst (32% bounce, 200s avg). Likely users searching "wordle" expecting NYT.
4. **Hebrew bounces 38%** — worst of any language (next worst: Spanish 29%). Likely RTL issues (PR #180 may help).
5. **Users who never trigger `invalid_word` have 40% completion vs 87% for those who do.** The non-engagers aren't confused by the word list — they never typed a guess at all.

**Recommendations (prioritized):**

- [ ] **P1 — Move PWA prompt to post-first-win.** Show on the win/stats modal after the dopamine hit, not on page load or during play. This is the only moment we have new user attention + positive emotion. Currently tracked in P0 as declining installs — this is the root cause.
- [ ] **P1 — Add "come back tomorrow" hook to win screen.** Show next-word countdown timer + streak explanation. New users don't know this is a daily game.
- [ ] **P1 — Investigate Arabic completion rate (47%).** Check: word difficulty, keyboard layout, RTL input bugs, word list quality. 7K Google sessions/month with >50% abandoning mid-game.
- [ ] **P2 — Desktop landing page intent mismatch.** 36K new desktop sessions, 31% bounce. Consider a clearer hero/title distinguishing from NYT Wordle, or a "start playing" CTA above the fold.
- [ ] **P2 — First-game friction reduction.** 22K new users/month start but don't finish. Ideas: first-word hint for new users, tutorial overlay, easier first daily word via curation. Needs A/B testing.
- [ ] **P3 — Portuguese/French completion (54%/56%).** After Arabic, these are the next worst. Check word list difficulty + `invalid_word` rates.

*Data source: GA4 property 299782185 + PostHog project 141403, Feb 19–Mar 18 2026. Full analysis in conversation log.*

---

## P1

- [ ] **Japanese 16-min median** — keyboard/input UX broken. Investigate IME handling with `physical_key_map`.
- [ ] **Share rate collapsed** (7.6%→5.2%) — share UX may have regressed in Nuxt migration. Investigate Web Share API + clipboard flow.
- [ ] **Page errors spiked 4x** (870→3,646/wk) — likely extension noise ("Script error", "runtime.sendMessage"). See P2 filter item.
- [ ] **Rewrite pregenerate scripts** — `pregenerate_definitions.py` + `pregenerate_images.py` import deleted Flask app. Need Nuxt-compatible equivalents.
- [ ] **Set up daily freeze cron** — `uv run python scripts/freeze_all_history.py`
- [ ] **Submit 14 new language URLs to Google Search Console** — bn, ha, hi, id, ja, mr, ms, pa, sq, sw, tl, ur, uz, yo
- [x] **Show game number in header** — editorial game header now shows `#idx` as mono subtitle. *(Mar 20, v3 design)*
- [x] **PostHog DAU/WAU dashboard tiles** — changed from `$pageview` to `page_view_enhanced`. *(Mar 19)*

---

## P2

- [ ] **Remove PostHog skip list** — `guess_submit`, `guess_time`, `first_guess_delay` are excluded from PostHog (`POSTHOG_SKIP_EVENTS` in `composables/useAnalytics.ts:24`). Adds ~1.8M events/mo → ~$90/mo PostHog cost. Enables per-guess analytics (guess patterns, time-per-guess by language, word difficulty). Set a billing limit first.
- [ ] **English word list quality** — 44% frustration rate, 3.2 invalid/start. Biggest language, worst quality. ~21K frustration events/wk.
- [ ] **Curate word lists** — Tagalog (7min median), Hebrew (6.3% abandon), Luxembourgish (6.0 avg attempts), Romanian (6.6 invalid/start), Irish (8.2 invalid/start), Basque (64% frustration).
- [ ] **Remove `getDailyWordLegacy()`** — dead code, all 1,730 days frozen in history.
- [ ] **Bot traffic filtering** — Singapore/China bots crawling word pages. ~1,400 sessions/wk, 97% bounce.
- [ ] **Filter extension noise from page_error** — "Script error", "runtime.sendMessage" etc. are ~100% of errors. Filter before counting.
- [ ] **Accessibility: modal focus trapping** — `aria-modal="true"` is set but focus can still Tab out. Need `useFocusTrap`.
- [ ] **Accessibility: color contrast** — white on green/yellow tiles fails WCAG 4.5:1 ratio. Investigate darker tile backgrounds or dark text.
- [ ] **Accessibility: diacritic popup keyboard access** — popup is long-press only, needs keyboard equivalent (e.g., hold key for 500ms).
- [ ] **PWA offline fallback 404** — service worker expects `/offline.html` but Nuxt serves `/offline`. Workbox `createHandlerBoundToURL` throws `non-precached-url` error. Only affects PWA users going fully offline.

---

## P3

- [ ] **Buy `words.global` domain**
- [ ] Investigate studyourway.com referral (233 sessions/wk, appeared from nowhere)
- [ ] Hebrew SEO — competitor dead, Hebrew growing +49%. RTL fix (PR #180) should accelerate.
- [ ] Spanish/Italian SEO — no dominant clone, large speaker bases (es +434%, it +342%)
- [ ] LLM traffic channel (35 sessions/wk from `llm/(not set)`) — review llms.txt

---

## V3 Cleanup (March 21, 2026)

Small loose ends from the design system + Speed Streak arcade sessions. None are blocking.

- [x] **Speed timer consolidated to 5 minutes** — Timer was 3 min, SEO/help said 5 min. Changed timer to 300,000ms (5 min) to match all references. *(Mar 22)*
- [x] **Delete `SpeedCountdown.vue`** — deleted. *(Mar 21)*
- [x] **`wordInfoEnabled` setting store code** — Word Info toggle restored to Settings UI (commit 9de275a). Store code is now needed. *(Mar 22)*
- [x] **Statistics page overhaul** — Rewritten as personal stats dashboard with per-mode breakdown, per-language list, editorial design. *(Mar 21)*
- [ ] **Tile flip sound** — #1 delight gap from `docs/DELIGHT.md` audit. Add subtle tick per tile during flip reveal. 30 min.
- [ ] **Streak milestone celebrations** — #1 retention gap. Toast + haptic when streak hits 7, 30, 100, 365 days. 20 min.
- [ ] **Speed Streak personal best tracking** — No localStorage save for best score / best combo / best word count. Users can't see improvement over time.

---

## Tech Debt (March 22, 2026 audit)

Comprehensive audit of architecture, duplication, and code quality. Grouped by theme, ordered by impact within each group.

### Architecture — Monolithic Store

- [ ] **`stores/game.ts` is 2,275 lines** — Monolithic store managing game state, single-board logic, multi-board logic, Speed Streak arcade (timers, scoring, combo), UI modals, persistence, community stats, definitions, and analytics. Split into focused stores: `game-core.ts` (board/config), `game-speed.ts` (timer/scoring/combo), `game-ui.ts` (modals/sharing/notifications). Biggest single file in the codebase.
- [ ] **Speed mode logic should be its own store** — ~300 lines of speed-specific state (`speedState`, tick logic, arcade events, combo tracking) mixed into the main game store. Every non-speed feature has to mentally skip past it.

### Architecture — Page Duplication

- [ ] **DRY multi-board pages** — `dordle.vue`, `tridle.vue`, `quordle.vue` are near-identical (~100 lines each, only mode name/boardCount differs). Refactor to single `[mode].vue` dynamic route or shared `MultiboardPage.vue` component. Every change (like post-keyboard slot removal) requires touching 3 files.
- [ ] **Landing page modals are hand-rolled** — `pages/index.vue` About and Settings modals duplicate BaseModal pattern (own backdrop, positioning, close buttons). Trivial to refactor to `SharedBaseModal`.
- [ ] **Remaining standalone modals** — GameModePicker and CopyFallbackModal re-implement backdrop/escape/transition instead of using `SharedBaseModal`. ~40 lines each eliminable.

### Architecture — Composable Quality

- [ ] **`useAnalytics.ts` is 978 lines** — Monolithic analytics module with 50+ tracking functions, mixed GA4 + PostHog + user identification. Split into focused modules (game events, retention, session, share tracking).
- [ ] **`useGameModes.ts` and `useFlag.ts` aren't composables** — Pure data/constants, no Vue Composition API usage. Rename to `utils/game-modes.ts` and `utils/flag-mapping.ts` for clarity.
- [ ] **Speed mode conditionals scattered** — `game.gameConfig.mode === 'speed'` checks leak into PageShell, useGameAnimations, main.css, game.ts. Extract to computed flags like `game.hasKeyboardFlip` so downstream code doesn't need to know why.
- [ ] **`timeUntilNextDay` timer management** — Countdown interval buried in game.ts, consumed by StatsModal. Extract to `useCountdown` composable so the timer only runs when a component needs it.

### Consistency — localStorage

- [ ] **Inconsistent localStorage access** — `settings.ts` uses abstracted `readLocal()`/`writeLocal()` helpers. `game.ts` and `stats.ts` use raw `localStorage.getItem/setItem` with inconsistent try-catch wrapping. Some pages (`word/[id].vue`, `words.vue`) access localStorage without any try-catch (breaks in private browsing). Standardize on a shared `safeLocalStorage()` utility.

### Consistency — Hardcoded Config

- [ ] **Duplicate `LANGUAGE_POPULARITY` arrays** — `server/api/languages.get.ts` has 73 languages, `server/api/[lang]/word-image/[word].get.ts` has a different top-30 list. Single source of truth needed.
- [ ] **Duplicate `WIKT_LANG_MAP`** — Identical mapping in `server/utils/definitions.ts` and `server/api/[lang]/word/[id].get.ts`. Extract to shared server utility.
- [ ] **GA4 measurement ID hardcoded** — `plugins/analytics.client.ts:15` has `G-273H1MLL3T` inline. Should be env variable or runtime config.
- [ ] **`IMPROVEMENT_LANGS = ['ko', 'ja']` hardcoded in page** — `pages/[lang]/index.vue:20`. Should be in language_config.json or a config file.

### Consistency — Settings Store Boilerplate

- [ ] **6 identical toggle/setter pairs in `settings.ts`** — `toggleDarkMode/setDarkMode`, `toggleFeedback/setFeedbackEnabled`, etc. Each follows the same pattern (flip value, persist, track). Setter methods don't call analytics (inconsistent). Factory helper would eliminate ~60 lines.

### CSS

- [ ] **`!important` declarations in `main.css`** — Lines 44-45 (`.key.has-hint` padding) and line 317 (`.pop` border-color). Review parent selectors and remove.
- [ ] **Hardcoded hex in high-contrast mode** — `main.css` uses `#85c0f9` and `#f5793a` for high-contrast correct/semicorrect instead of design tokens. Extract to `--color-correct-high-contrast` etc.
- [ ] **Dark mode keyboard base color hardcoded** — `.dark .key` uses `#818384` instead of a token. Intentional (3-step luminance ladder) but should be documented via a CSS variable.
- [ ] **Duplicate animation selectors** — Dark mode and high-contrast keyboard key states repeat `animation: key-pop 200ms` identically. Define once, vary only colors.

### Hardcoded Strings (i18n)

- [ ] **Sidebar Hebrew nav label** — `AppSidebar.vue:22` has hardcoded `'תפריט ניווט'` for Hebrew, all other languages get `'Navigation menu'`. Should be in `language_config.json`.
- [ ] **Settings modal fallback strings** — Word Info, Animations, difficulty warning have English fallbacks inline in `SettingsModal.vue`. Move to `default_language_config.json`.

### Type Safety

- [ ] **`as any` type casts in plugins** — `pwa.client.ts:68` (`nuxtApp as any`), `debug.client.ts:112` (`window as any`). Define proper interfaces.
- [ ] **Multi-board restore uses `any`** — `game.ts` line ~1810: `boards.value = data.boards.map((saved: any, ...)`. Define a `SavedBoardState` type.
- [ ] **`JSON.parse` without type validation** — `stats.ts` and `game.ts` parse localStorage data with type assertions but no runtime validation. Corrupted data silently breaks.

### Dead Code

- [ ] **`_normalizedWordMap` in game.ts** — Declared but never populated or used. Remove.
- [ ] **Module-level timing vars not reset** — `gameStartTime`, `lastGuessTime`, `firstGuessFired` in game.ts never reset in `resetGameState()`. Stale timing data may cause analytics miscalculations on game restart.
- [ ] **Verify `getShareText()` usage** — `useGameShare.ts` exports it but no component appears to import it. Remove if dead.

---

## V3 Game Modes — Audit Items (March 20, 2026)

Findings from exhaustive feature-parity audit comparing new modes (Unlimited, Speed, Dordle, Tridle, Quordle) against the classic daily game.

### Done

- [x] **Per-mode stats separation** — Stats now stored under mode-specific keys (`en_dordle`, `en_quordle`, etc.) so modes don't contaminate each other's stats. `buildStatsKey()` wired into stats store.
- [x] **Streaks isolated to daily modes** — Unlimited/Speed losses no longer break classic daily streaks. Overall streaks in `calculateTotalStats` only count classic daily results.
- [x] **Dynamic guess distribution** — StatsModal renders correct number of bars based on `gameConfig.maxGuesses` (7 for Dordle, 8 for Tridle, 9 for Quordle). Rows start at `boardCount` (e.g., Quordle starts at row 4 — impossible to win in fewer). Fixed `getDistributionCount` type casting. *(Updated Mar 22)*
- [x] **Speed mode excluded from persistent stats** — Speed is session-only, doesn't save to game_results.
- [x] **Stats modal adapts to mode** — Daily modes show Streak/Best columns; non-daily modes show Wins/Avg instead.
- [x] **Stats recalculated on page reload** — `useGamePage` now calls `calculateStats` with correct stats key on mount, so stats modal shows correct data after refresh.

### P1 — End-of-Game Experience

- [x] **Definitions wired for all modes** — Multi-board shows all board words + definitions in StatsModal. Unlimited uses correct target word (not daily). Definition cache prevents duplicate API calls. *(Mar 21)*
- [ ] **AI images not loaded for new modes** — Classic displays AI-generated word image in StatsModal. New modes don't fetch images.
- [x] **Speed Results modal lacks polish** — Redesigned with score, combo, last missed word, share icon, backdrop close, reopenable via stats icon. *(Mar 21)*
- [x] **Unlimited: no "New Word" in stats modal** — Removed redundant "New Word" button below keyboard; modal has "New Game" CTA. *(Mar 21)*
- [ ] **No community percentile for new modes** — Classic shows "Better than X% of players" from API. New modes don't submit or fetch community stats.

### P1 — Help & Onboarding

- [x] **Help modal is now mode-aware** — Speed Streak shows specific rules (timer, bonus table, scoring, pressure ramp). Classic shows standard tutorial. Other modes still show classic tutorial — could be improved for multi-board. *(Mar 21)*

### P2 — Animations & Delight

- [ ] **No celebration for multi-board wins** — Solving all 4 Quordle boards is a big achievement, deserves confetti or special animation beyond the standard stats modal.
- [ ] **No per-board solve celebration** — When a board is solved in Dordle/Tridle/Quordle, only a fade overlay appears. No bounce animation on the solved board.
- [ ] **No "last board clutch" animation** — Solving the final multi-board on the last guess deserves special fanfare.
- [ ] **Speed mode: no win bounce** — Solving a word in speed resets the board immediately. A quick micro-celebration before reset would feel better.
- [ ] **No streak milestone celebrations** — Reaching 7-day, 30-day, 100-day streaks has no special moment.

### P2 — CSS & Design Tokens

- [x] **MultiBoardLayout.vue hardcoded colors** — Migrated to `bg-correct-soft`, `border-correct`, `text-correct`. *(Mar 20, v3 design)*
- [x] **SpeedStatsStrip.vue** — Migrated to design tokens. *(Mar 20)*
- [x] **main.css speed animations** — Migrated to `var(--color-correct)`, `var(--color-accent)`. *(Mar 20)*
- [x] **KeyboardKey.vue diacritic popup** — Migrated to `var(--color-muted-soft)`, `var(--color-ink)`, `var(--color-accent)`. *(Mar 20)*
- [ ] **Diacritic popup animation missing from `prefers-reduced-motion`** — `diacritic-popup-in` not disabled in reduced motion block.
- [ ] **Tile font sizing** — `clamp(10px, 3vw, 26px)` works but is viewport-relative. Could use container-relative units (`cqw`) for better classic vs multi-board scaling. Low priority — current sizing is acceptable.

### P2 — Sharing

- [ ] **Speed share has no emoji grid** — Text-only format. Consider colored dots per word.
- [ ] **Unlimited share URL leads to daily game** — Recipients can't play the same random word.

### P2 — Keyboard

- [x] **Split-color keyboard keys** — Implemented by other agent. CSS gradient per key showing per-board state. *(Mar 20)*

### P3 — Archive & Discovery

- [x] ~~**No archive pages for new modes**~~ — No longer needed. Dordle/Tridle/Quordle converted to free-play (random words, no daily). Only classic daily has an archive. *(Mar 21)*
- [ ] **No mode-specific SEO** — Archive/word pages only reference classic mode. No structured data for multi-board modes.

### P3 — PWA & Notifications

- [ ] **PWA install banner only triggers on classic daily** — Should also trigger after first win in any mode.
- [x] ~~**No push notification hooks for multi-board dailies**~~ — No longer applicable. Dordle/Tridle/Quordle are free-play, not daily. *(Mar 21)*

### P3 — Speed Mode Persistence

- [ ] **Speed sessions lost on refresh** — No localStorage save for active session. Consider saving at minimum the final results for personal best tracking.
- [ ] **Speed personal best not tracked** — No best score / best average / best streak saved anywhere.

---

## Recently Done

**Mar 21 — Stats audit, game mode conversion, navigation fix, simplify:**
- Per-mode stats separation: `buildStatsKey`, `isClassicDailyStatsKey`, `computeStats` pure helper
- Streaks isolated to daily classic only (27 stats tests, was 7)
- Stats page full rehaul as personal dashboard (editorial design, per-mode cards)
- Definitions wired for all modes (in-memory cache, multi-board definitions, fixed unlimited bug)
- Dordle/Tridle/Quordle converted to free-play (random words, "Play Again", no daily index)
- Tridle layout: removed broken expand/collapse, now uses same 2-col grid as quordle
- Fixed broken `<component :is="'NuxtLink'">` in SidebarItem + homepage (all nav was dead)
- Multi-board grid: JS-based height measurement for proportional tile sizing
- Error page editorial redesign, dark mode keyboard contrast fix, tile selection disabled
- Speed/Dordle/Quordle badges: NEW → BETA, Tridle re-enabled as BETA
- Game mode picker language pill now clickable
- Simplify: debounced resize, fixed error caching, Set-based word sampling, mode label from config

**Mar 21 — Speed Streak arcade overhaul + polish:**
- Timer: 3 min start, variable bonus (10-60s by guess count), -30s fail penalty, pressure ramp (1.2x→2.5x)
- Scoring: points with combo multiplier (up to 3x), combo breaks on fail
- Arcade overlay: word toasts with emoji reactions, points float-up, combo/milestone banners, screen flash, screen shake on fail, timer bar glow
- Paper-aging background (calm→warm→amber→red pulse by urgency)
- Speed results modal: redesigned with score, combo, last missed word, backdrop close, share icon
- Start screen: inline (no overlay), racing shine button, rules in mode-aware help modal
- Settings simplified: removed Word Info, RTL toggle, Language button (redundant)
- Sidebar: consolidated GitHub links to single "Report a bug", settings closes sidebar first, stats links to /stats page, profile pinned to bottom, minimal scrollbar
- Game mode deduplication: `composables/useGameModes.ts` single source of truth
- Homepage: removed tagline (too much space), "& More" card opens mode picker, smart default language from localStorage
- Fixed: sidebar persistence, Speed 500 error (useGameShare import), prop validation warnings, flag fallbacks
- Standardized all language count references to "80+" with central comment in nuxt.config.ts
- Beeping reduced to last 5 seconds only
- See `docs/DELIGHT.md` for full delight audit

**Mar 20 — V3 Design System (Direction A: Editorial):**
- Full design token system (@theme + editorial utilities + dark mode overrides)
- Fraunces Variable (full axes incl. optical size), Source Sans 3 Variable, JetBrains Mono — self-hosted via @fontsource
- Lucide icons throughout (all inline SVGs replaced)
- Circle Flags (404 SVGs self-hosted, `useFlag` composable with 80-language mapping)
- Homepage redesign: masthead, mode cards (6), language grid with flags, announcement bar, game mode picker modal
- Sidebar: game modes (9), language selector, settings, archive, stats, bug report
- GameHeader: editorial typography, Lucide icons, sidebar toggle
- Endgame screen: editorial card (large word, definition, AI image, distribution, share/unlimited buttons, timer)
- All 10 pages + 15 components migrated to design tokens (zero old Tailwind color patterns)
- Speed Streak: inline start screen (no more full-screen overlay blocking nav)
- Game mode deduplication: `composables/useGameModes.ts` single source of truth
- Tile styling: serif font, square borders, design token colors
- Keyboard styling: warm editorial look, minimal diacritic popup
- E2E tests updated (26 passing), unit tests updated (170 passing)
- Smart default language (most recent from localStorage → browser → English)
- Sidebar persistence fixed (localStorage read/write on close)
- See `docs/DESIGN_SYSTEM_DECISIONS.md` for pixel-level audit

**Mar 20 — V3 game modes stats audit:**
- Per-mode stats separation (buildStatsKey wired)
- Streaks isolated to daily classic only
- Dynamic guess distribution (7/8/9 bars)
- Stats modal mode-aware (streak vs wins/avg)

**Mar 19 — PR #180 merged** (RTL fix, diacritic popup, accessibility, PostHog proxy):
- Hebrew/Arabic/Persian/Kurdish/Urdu RTL typing (#178)
- iOS-style diacritic long-press popup (#177)
- WCAG 2.1 AA accessibility (20+ fixes)
- PostHog proxy (`/t` route) + `@posthog/nuxt` module
- Cross-language game state bleed fix
- 5 new E2E tests

**Mar 19 — PR #173 merged:** Definition diacritics fix + archive word reveal after winning

**Mar 19 — PR #166 merged:** Rotating globe + ko/ja banner fix

**Mar 15-16:** Nuxt migration (PR #165), words.json consolidation, 14 new languages (65→79)

---

*Growth items (SEO content pages, roundup site listings, App Store) are tracked in `docs/ROADMAP.md` Phase 6.*
*Next analytics report: March 23, 2026*
