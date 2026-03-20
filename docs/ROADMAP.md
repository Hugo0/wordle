# Wordle Global — Product Roadmap

*Created: March 19, 2026 · Updated: March 20, 2026*

Synthesizes findings from competitor research (`docs/competitor-research/`), the multi-board analysis (`docs/tridle_quordle_gamemodes.md`), the semantic mode design (`docs/semantic_explorer_mode.md`), the design exploration session (`../wordle-design-explorations/`), and a deep audit of the current codebase.

---

## Vision

Wordle Global is the world's word game — 80+ languages, beautiful definitions and art for every word, and game modes for every type of player. Free to play, with an optional premium tier for power users.

---

## Current State (March 2026)

- 80 languages, daily 5-letter classic Wordle
- PWA (installable, offline-capable via service worker)
- LLM definitions (GPT-5.2) + DALL-E word images post-game
- Community percentile stats (anonymous, file-based)
- Hard mode, high contrast, dark mode, haptics, sounds
- PostHog + GA4 analytics
- ~47K weekly sessions, ~6,700 DAU
- **No database, no auth, no user accounts, no server-side user state**

---

## Design System (established March 20, 2026)

A design exploration session produced two candidate design directions and a product architecture for the full roadmap. Key decisions made:

### Design Directions

Two directions prototyped with 15+ screens each (see `../wordle-design-explorations/`):
- **Direction A: Editorial** — Fraunces serif + Source Sans 3, ink-on-paper, 1px rules, newspaper aesthetic
- **Direction C: Quiet Craft** — Cormorant Garamond + Outfit, warm earth tones, soft shadows, tactile feel

Final choice TBD — both work. The redesign ships later (see Phase 3) but code should be written with clean component boundaries to enable it.

### Icon System
- **Lucide** (`lucide-vue-next`) for UI icons — clean 2px strokes, MIT licensed, tree-shakeable
- **Circle Flags** for country flags — consistent circular SVGs instead of platform-dependent emoji flags

### Product Architecture: The Hybrid (Option F)

After exploring 5 navigation approaches, the recommended architecture is:

1. **Homepage Hub** (returning users) — personalized dashboard showing today's puzzles, active languages, streaks, social actions
2. **Board Type Picker** (new game) — hero choice of game mode: Classic, Dordle, Tridle, Quordle, Semantic, Speed Streak
3. **Game Screen with Config Bar** — persistent sub-bar for play type (Daily/Unlimited/Custom) × social (Solo/Party) × language
4. **Party as an overlay** — bottom sheet triggered from config bar, works with any game mode

This separates game modes into **4 independent dimensions**:

| Dimension | Options |
|-----------|---------|
| **Board type** | Classic, Dordle, Tridle, Quordle, Semantic, Speed Streak |
| **Play type** | Daily, Unlimited, Custom Word |
| **Social** | Solo, Party |
| **Language** | 80 languages × word lengths |

See design exploration files for full mockups of each screen.

### Multi-Board Layout Decisions

| Mode | Desktop | Mobile |
|------|---------|--------|
| **Dordle** (2 boards) | Side by side | Side by side (tiles ~170px each) |
| **Tridle** (3 boards) | Stacked: 1 expanded + 2 collapsed | Same — expanded board on top, 2 collapsed below side-by-side |
| **Quordle** (4 boards) | 2×2 grid | 2×2 grid, tight padding, all 4 visible |

- Collapsed tridle boards show last 2 completed rows + "Tap to expand"
- No empty future-guess rows anywhere — use "N guesses remaining" text indicator
- Keyboards show split vertical colors per board (2/3/4 way gradient splits)
- All game screens fit within 100vh (game bar + boards + keyboard as flex layout)

### Game Header Bar

Consistent across all game modes (like NYT/La Palabra del Día):
```
[ℹ] [☰]     Quordle           [📊] [⚙]
           English · Guess 5/9
```

---

## Planned Features

### Game Modes

| Feature | Description | Reference |
|---------|-------------|-----------|
| **Unlimited** | Play random words endlessly after the daily puzzle | wordleunlimited (8-15M/mo), Wekele, Sanuli |
| **Dordle** | 2 boards simultaneously, 7 guesses, shared keyboard | Dordle (5-10M/mo) |
| **Tridle** | 3 boards simultaneously, 8 guesses, shared keyboard | engaging-data.com/tridle |
| **Quordle** | 4 boards simultaneously, 9 guesses, shared keyboard | Quordle/MW (15-30M/mo) |
| **Variable Word Length** | 4, 5, 6, 7, 8-letter puzzles per language | Wekele (4-8), Sanuli (4-7), SUTOM (6-10) |
| **Speed Streak** | Timed back-to-back rounds — solve as many as possible in 5 minutes | No major competitor |
| **Semantic Explorer** | Navigate meaning space with compass + word map + LLM hints. 10 guesses. Novel mode. | Contexto (5-15M/mo), Semantle |
| **Archive** | Play any past daily puzzle | NYT (premium), wordleunlimited |

See `docs/tridle_quordle_gamemodes.md` for multi-board technical analysis.
See `docs/semantic_explorer_mode.md` for Semantic Explorer design.

### User System & Social

| Feature | Description |
|---------|-------------|
| **User Accounts** | Google + Apple OAuth (primary), email/password fallback. Progressive — never required to play. |
| **Stats Sync** | Game results, streaks, settings synced across devices |
| **Badges** | Polyglot (N languages), streak milestones (7/30/100/365), speed records, mode-specific achievements |
| **Leaderboard** | Per-language daily/weekly/all-time. Friends leaderboard. |
| **Custom Word** | Pick a word, share a link. See how many guesses the recipient needs. Works with any board type. |
| **Party Mode** | Create lobby, share link, friends join, everyone plays the same word simultaneously. Live progress indicators (guess dots, no letter spoilers). Results + rematch. Works with any board type. |
| **Friend System** | Add friends, see their results (spoiler-free), compare stats |
| **Comments** | Per-word-of-the-day discussion thread. Visible only after completing the puzzle (spoiler-safe). |

### Platform & Monetization

| Feature | Description |
|---------|-------------|
| **Native App** | iOS + Android via CapacitorJS wrapping the web app |
| **Push Notifications** | Streak-at-risk reminders, daily word ready, friend challenges |
| **Premium (Pro)** | Archive, advanced stats, custom puzzle analytics, pro badge. €2.49/mo or €19.99/yr or €39.99 lifetime. |
| **Ads (free tier)** | Post-game only, one small banner. Removed for Pro subscribers. Never during gameplay. |

---

## Infrastructure Required

The current architecture is stateless (JSON files on disk + localStorage). Most features require new infrastructure layers.

### Tech Stack Decisions

| Layer | Choice | Cost | Why |
|-------|--------|------|-----|
| **Database** | Render Postgres | $7/mo | Already on Render, same network, low latency |
| **ORM** | Prisma | Free | Familiar, mature ecosystem, Prisma 7 is pure TS |
| **Auth** | `nuxt-auth-utils` | Free | By Nuxt creator, 40+ OAuth providers, no vendor lock-in |
| **Notifications + Email** | OneSignal | Free | Web push + mobile push + email in one SDK. Free: 10K emails/mo, 10K web push, unlimited mobile push |
| **Billing** | Polar | 4% + 40¢ | Open source, handles checkout + tax + customer portal |
| **Analytics** | PostHog + GA4 | Free → ~$90/mo | Already set up |
| **Hosting** | Render | Current plan | Already there |
| **Total at current scale** | | **~$7/mo** | |

### Layer 1: Database

**Current:** Word stats are JSON files (`server/utils/word-stats.ts`). Game state and user stats live in localStorage.

**Needed:** Render Postgres ($7/mo starter) with Prisma ORM. Tables: `users`, `game_results`, `streaks`, `leaderboard_entries`, `badges`, `comments`, `challenges`, `friend_links`, `push_subscriptions`, `subscriptions`.

### Layer 2: Authentication

**Current:** Anonymous `client_id` UUIDs for dedup (`utils/storage.ts`).

**Needed:** `nuxt-auth-utils` module with Google OAuth (primary, one-tap sign-in) + Apple Sign-In (required if we ship an iOS app) + email/password fallback. Anonymous → authenticated upgrade (preserve localStorage stats on first login). Built-in session management via encrypted cookies.

### Layer 3: Notifications

**Current:** None.

**Needed:** OneSignal for all notification channels — web push (streak reminders, daily word), mobile push (if native app), transactional email (account verification, streak-at-risk). One SDK, one dashboard. Free tier covers current scale.

### Layer 4: Native App Shell (if/when)

**Current:** PWA via `@vite-pwa/nuxt`.

**Needed:** `capacitor.config.ts` + `ios/` and `android/` platforms. Plugins: `@capacitor/haptics`, `@capacitor/share`. Push notifications handled by OneSignal's Capacitor plugin (not Firebase directly). CI: GitHub Actions + Fastlane.

---

## What Needs Refactoring

### 1. Game Store — Extract BoardState (HIGH, Phase 1)

*Blocks: multi-board, variable word length, unlimited, challenge mode, party mode*

**File:** `stores/game.ts` (1,352 lines)

All state assumes a single 5x6 board — `tiles`, `tileColors`, `activeRow`, `gameOver`, `keyClasses` are single-board refs. The `keyDown()` function (lines 423-599) hardcodes single-board logic throughout.

**Refactor:** Extract `BoardState` interface, make the store an orchestrator over `boards[]`. Classic mode uses `boards[0]`. Design the interface to support future features (party mode state, custom word source, per-board solve timestamps for speed tracking).

```typescript
interface BoardState {
    tiles: string[][];
    tileColors: TileColor[][];
    tileClasses: string[][];
    activeRow: number;
    activeCell: number;
    gameOver: boolean;
    gameWon: boolean;
    targetWord: string;
    keyStates: Record<string, KeyState>;
    solvedAtGuess?: number;      // for multi-board: which guess solved this board
    solvedAtTimestamp?: number;   // for speed streak / party timing
}

type GameMode = 'classic' | 'dordle' | 'tridle' | 'quordle' | 'unlimited' | 'speed' | 'semantic';
type PlayType = 'daily' | 'unlimited' | 'custom';
type SocialMode = 'solo' | 'party';

interface GameConfig {
    mode: GameMode;
    playType: PlayType;
    social: SocialMode;
    language: string;
    wordLength: number;
    boards: number;
    maxGuesses: number;
}

const GAME_MODE_CONFIG: Record<GameMode, { boards: number; maxGuesses: number }> = {
    classic:   { boards: 1, maxGuesses: 6 },
    dordle:    { boards: 2, maxGuesses: 7 },
    tridle:    { boards: 3, maxGuesses: 8 },
    quordle:   { boards: 4, maxGuesses: 9 },
    unlimited: { boards: 1, maxGuesses: 6 },
    speed:     { boards: 1, maxGuesses: 6 },
    semantic:  { boards: 0, maxGuesses: 10 },
};
```

### 2. Constants → Dynamic Config (MEDIUM, Phase 1)

*Blocks: variable word length, multi-board*

**File:** `utils/types.ts`

`WORD_LENGTH = 5` and `MAX_GUESSES = 6` are module-level constants. Must become per-game-mode config. Key call sites: `makeEmptyGrid()`, `GameBoard.vue`, color algorithm, emoji board generation.

### 3. Persistence — localStorage to Server Sync (HIGH, Phase 2)

*Blocks: user accounts, stats sync, leaderboards*

**Files:** `stores/game.ts:886-993`, `stores/stats.ts`, `stores/settings.ts`, `utils/storage.ts`

Everything is localStorage. Phase 1 keeps localStorage but uses compound keys (`{lang}_{mode}_{wordLength}`). Phase 2 adds server sync layer: save locally first (offline-safe), then push to server. Handle anonymous → authenticated migration on first login. Server timestamp wins for multi-device conflicts.

### 4. Word Selection — Multi-Board (MEDIUM, Phase 1)

*Blocks: Dordle/Tridle/Quordle*

**File:** `server/utils/data-loader.ts`

Currently selects one word per language per day. Needs N words for multi-board modes. Use hash offset: `hash(dayIdx + boardIdx * 10000)`. Validate sufficient pool depth (365+ daily-tier words per language). For unlimited mode: random selection from the full daily-tier pool.

### 5. Keyboard — Multi-Board Merge (MEDIUM, Phase 1)

*Blocks: Dordle/Tridle/Quordle*

**File:** `components/game/GameKeyboard.vue`

`keyClasses` is a single `Record<string, KeyState>`. Multi-board needs per-board tracking + merged display. The merged state uses priority: green > yellow > gray > unused. For the visual split-color keys (showing per-board state), store `keyStatesPerBoard: Record<string, KeyState>[]` and compute the gradient CSS from it.

### 6. Layout — Game Screens + Navigation (MEDIUM, Phase 1)

*Blocks: all new game modes (discoverability)*

**Files:** `layouts/game.vue`, `pages/[lang]/index.vue`

Single column, `max-w-lg`. Phase 1: add game header bar + basic mode switching (URL-based routing: `/en/`, `/en/dordle/`, `/en/tridle/`, `/en/quordle/`, `/en/unlimited/`). Full sidebar/homepage-hub redesign deferred to Phase 3.

### 7. Stats Store — Compound Keys (LOW, Phase 1)

*Blocks: per-mode stats*

**File:** `stores/stats.ts`

Stats keyed by language only. Needs compound keys: `{language}_{mode}_{wordLength}`. Backward compat: existing `en` → `en_classic_5`.

---

## Build Order

### Phase 0: Stabilize (now — in progress)

Fix Nuxt migration regressions before building new features. Full list in `docs/TODO.md`. Key items:

- [ ] PWA install rate drop (4.5% → 2.8%)
- [ ] Japanese IME handling broken (16-min median session)
- [ ] Share rate regression (7.6% → 5.2%)
- [ ] Rewrite pregenerate scripts for Nuxt
- [ ] Remove PostHog event skip list (~$90/mo cost, enables per-guess analytics)

### Phase 1: Game Mode Expansion 🎯 NEXT

**Goal:** Ship Unlimited + Dordle + Tridle + Quordle. Refactor the game store architecture to support all future modes.

**Why first:** This is the highest-ROI move. Unlimited mode alone could double traffic (wordleunlimited.org gets 8-15M/mo). Multi-board modes (Quordle: 15-30M/mo TAM) add entirely new audiences. And the BoardState refactor — the hard technical work — unblocks everything else on the roadmap.

**Why all four modes at once:** The architecture work is front-loaded. Once BoardState is extracted and dynamic config works, each additional board count is mostly configuration. Dordle → Tridle → Quordle is a cascade where each incremental mode is cheap to add. Shipping them together creates a bigger "moment" and more reasons for new users to stay.

**Key insight from design exploration:** The 4 game dimensions (board type × play type × social × language) should be independent. Build the BoardState/GameConfig architecture to support this matrix from day 1, even though Party and Custom Word ship later. This avoids a second refactor.

#### Phase 1a: Architecture Refactor (no user-visible changes) ✅ DONE
- [x] Extract `BoardState` interface from `stores/game.ts`
- [x] Create `GameConfig` type with mode, playType, social, language, wordLength
- [x] Make `WORD_LENGTH` and `MAX_GUESSES` dynamic per `GameConfig`
- [x] Update `makeEmptyGrid()`, color algorithm, emoji board generation for dynamic dimensions
- [x] Classic mode uses `boards[0]` — all existing tests pass, zero user-visible change
- [x] Add compound stats keys (`{lang}_{mode}_{wordLength}`)
- [x] Multi-board word selection API (`hash(dayIdx + boardIdx * 10000)`)

#### Phase 1b: Unlimited Mode ✅ DONE
- [x] "Play Again" flow — random word from daily-tier pool, reset board, no waiting
- [x] Separate stats tracking (unlimited games don't count toward daily streaks)
- [x] Route: `/[lang]/unlimited/`
- [x] Minimal UI: game header bar with mode indicator, "New Word" button post-game

#### Phase 1c: Multi-Board Modes (Dordle → Tridle → Quordle) ✅ DONE
- [x] Multi-board game loop — one guess submits to all unsolved boards
- [x] Solved boards freeze (stop accepting input, stay visible)
- [x] Per-board keyboard state tracking + merged display (green > yellow > gray)
- [ ] Split-color keyboard rendering (CSS gradient per key, 2/3/4 way split)
- [x] **Dordle layout:** 2 boards side-by-side, always visible
- [x] **Tridle layout:** Stacked — 1 expanded board + 2 collapsed. Tap to toggle focus.
- [x] **Quordle layout:** 2×2 grid, all 4 boards always visible
- [x] All layouts fit 100vh (flex layout: game bar + boards + keyboard)
- [ ] "N guesses remaining" indicator instead of empty rows
- [x] Multi-board stats + sharing (multi-grid emoji boards)
- [x] Routes: `/[lang]/dordle/`, `/[lang]/tridle/`, `/[lang]/quordle/`
- [ ] Daily + Unlimited play type for all multi-board modes

#### Phase 1d: Speed Streak ✅ DONE
- [x] Countdown timer (start at 5 min, +5s bonus per solve)
- [x] Solve a word → immediately get next random word
- [x] Score = words solved in time limit
- [x] Solved-word ticker showing past words
- [x] Stats: words solved, average guesses, average time per word
- [x] Route: `/[lang]/speed/`

**Phase 1 status:** All game modes shipped. Remaining polish items: split-color keyboard, "N guesses remaining" indicator, daily+unlimited play type for multi-board modes. These are tracked in TODO.md.

**Also completed (was planned for Phase 3):** Full design system, sidebar, homepage hub, game mode picker, editorial typography. Pulled forward because it made sense to ship alongside game modes.

**Architecture decisions to make now (for future-proofing):**
- `GameConfig` includes `social: 'solo' | 'party'` and `playType: 'daily' | 'unlimited' | 'custom'` even though only solo/daily/unlimited ship in Phase 1
- Stats storage uses compound keys from day 1
- Board state includes `solvedAtTimestamp` for future speed/party features
- Word selection API supports custom word input (for future Custom Word feature)

### Phase 2: Accounts + Retention

**Goal:** Server-side state. User accounts with stats sync and badges.

**Why second:** Accounts are the prerequisite for leaderboards, badges, social features, and monetization. Now that users have Unlimited + multi-board modes to play, "Save your Quordle streak across devices" is a compelling account pitch. Badges add a collection/achievement loop that drives daily returns.

- [ ] Set up Render Postgres ($7/mo starter) + Prisma ORM. Define schema: `users`, `game_results`, `streaks`, `badges`.
- [ ] Auth via `nuxt-auth-utils` — Google OAuth (primary, one-tap) + Apple Sign-In + email/password fallback. Session management via encrypted cookies.
- [ ] User accounts — signup/login UI, profile page. Progressive (never required). Anonymous → authenticated migration (upload localStorage stats on first login).
- [ ] Stats sync — save results to DB on completion. Load on login. Offline queue.
- [ ] Settings sync — preferences persisted to user profile.
- [ ] Badges — polyglot (N languages), streak milestones (7/30/100/365), speed records, mode-specific (Quordle Master, etc.). Stored in DB, shown on profile + shareable.
- [ ] Archive mode — play any past daily puzzle. Per-language calendar. Premium feature (see Phase 5).
- [ ] Migrate word-stats from JSON files to database. Keep file-based as fallback.

### Phase 3: Redesign + Social

**Goal:** Ship the visual redesign alongside social features for maximum impact. New look + new capabilities = a "relaunch" moment.

**Why bundled with redesign:** The redesign (homepage hub, config bar, game header, sidebar) creates a new user experience that naturally surfaces the social features. Shipping the redesign alone feels empty; shipping social without the redesign buries the features. Together they're a watershed moment.

**Design system:** ✅ PULLED FORWARD TO V3 (completed March 20, 2026)
- [x] Adopted Direction A (Editorial) — Fraunces + Source Sans 3 + JetBrains Mono
- [x] Implement Lucide icons (`lucide-vue-next`) — all inline SVGs replaced
- [x] Implement Circle Flags for language indicators — 404 SVGs self-hosted
- [x] Homepage Hub — masthead, mode cards, language grid, game mode picker modal
- [x] Board Type Picker — modal on language click showing all modes
- [ ] Config Bar — persistent in-game bar for play type × social × language (deferred to when party/custom ship)
- [x] Game Header Bar — consistent across all modes (menu, info, stats, settings)
- [x] Sidebar navigation — game modes, language, settings, feedback
- [x] Full design token system (`@theme` + editorial utilities + dark mode)
- [x] All pages/components migrated to design tokens (zero old color patterns)
- [x] Endgame screen redesigned (editorial card with word, definition, AI image, distribution)
- See `docs/DESIGN_SYSTEM_DECISIONS.md` for full audit and tradeoffs

**Social features:**
- [ ] Custom Word — pick a word, share link. Works with any board type.
- [ ] Party Mode (lightweight) — create lobby, share link, friends join with nickname, play same word, live progress dots, results + rematch. No accounts required (ephemeral rooms with TTL).
- [ ] Leaderboard — per-language daily/weekly/all-time. Friends-only view.
- [ ] Challenge results — side-by-side comparison when friend completes your custom word.

### Phase 4: Semantic Explorer + Advanced

**Goal:** Ship the novel Semantic Explorer mode and other advanced features.

See `docs/semantic_explorer_mode.md` for full design.

- [ ] Pre-generate embeddings — OpenAI `text-embedding-3-small` for all word lists. One-time (~$12-60).
- [ ] Semantic compass, word map, LLM hints, proximity meter.
- [ ] API endpoint — `POST /api/[lang]/semantic-guess`. All computation server-side.
- [ ] Variable word length (4-8) — filter word lists by length, length selector in config bar.
- [ ] Friend system — add by username/link, spoiler-free daily results.
- [ ] Per-word discussion threads (spoiler-protected).

### Phase 5: Monetization + Native

**Goal:** Sustainable revenue + app store presence.

See `docs/competitor-research/monetization.md` for pricing analysis.

- [ ] Polar integration (web billing) — checkout, customer portal, webhook handler.
- [ ] Premium features: Archive, advanced stats, custom puzzle analytics, pro badge.
- [ ] Pricing: €2.49/mo | €19.99/yr | €39.99 lifetime.
- [ ] One small post-game ad (free tier only). Carbon Ads or single AdSense unit.
- [ ] CapacitorJS setup — iOS + Android wrapper.
- [ ] Push notifications via OneSignal (streak reminders, daily word, friend challenges).
- [ ] App Store optimization — screenshots in top 10 languages.

---

## Feature × Infrastructure Matrix

| Feature | BoardState Refactor | Database | Auth | CapacitorJS | New API Routes |
|---------|:------------------:|:--------:|:----:|:-----------:|:--------------:|
| Unlimited mode | Yes | — | — | — | — |
| Dordle / Tridle / Quordle | Yes | — | — | — | — |
| Speed Streak | Yes | — | — | — | — |
| Variable word length | Yes | — | — | — | Yes |
| Semantic Explorer | — | — | — | — | Yes |
| Archive | — | Yes | Yes | — | Yes |
| User accounts | — | Yes | Yes | — | Yes |
| Stats sync | — | Yes | Yes | — | Yes |
| Badges | — | Yes | Yes | — | Yes |
| Leaderboard | — | Yes | Yes | — | Yes |
| Custom Word | Yes | Optional | — | — | Yes |
| Party mode | Yes | Optional | — | — | Yes |
| Comments | — | Yes | Yes | — | Yes |
| Friend system | — | Yes | Yes | — | Yes |
| Push notifications | — | Yes | Yes | Yes | Yes |
| Native app | — | — | — | Yes | — |
| Ads (free tier) | — | — | — | — | — |
| Premium (Polar) | — | Yes | Yes | — | Yes |

**Two independent critical paths:**
1. **BoardState refactor** → unlocks all game modes (Phase 1) — **doing this first**
2. **Database + Auth** → unlocks social, engagement, monetization (Phases 2-5)

---

## Competitor Gap Analysis

### Features to Adopt

| Feature | Who Has It | Priority | Phase |
|---------|-----------|----------|-------|
| Unlimited mode | wordleunlimited (8-15M/mo), Wekele, Sanuli | **Critical** | 1 |
| Multi-board (Dordle/Quordle) | Quordle/MW (15-30M/mo), Dordle (5-10M) | **Critical** | 1 |
| Speed mode | No major competitor | **High** | 1 |
| Account + stats sync | NYT, La Palabra del Dia | **High** | 2 |
| Badges + achievements | NYT, Duolingo | **High** | 2 |
| Archive (past puzzles) | NYT (premium), wordleunlimited | High | 2 |
| Visual redesign | — | High | 3 |
| Custom puzzle links | NYT, wordly.org | High | 3 |
| Party/multiplayer | No major Wordle competitor | High | 3 |
| Semantic word game | Contexto (5-15M/mo), Semantle | High | 4 |
| Variable word length | Wekele (4-8), Sanuli (4-7), SUTOM (6-10) | Medium | 4 |
| Native app | NYT (42M downloads), Wekele (100K) | Medium | 5 |

### Where We Lead (protect)

| Feature | Nearest Competitor | Our Edge |
|---------|-------------------|----------|
| 80 languages | Wekele (12), wordly.org (~15) | 5-6x more |
| LLM definitions | Nobody | Exclusive |
| DALL-E word images | Nobody | Exclusive |
| RTL support (Arabic, Hebrew, Persian, Kurdish) | Nobody multi-lang | Exclusive |
| Community percentile | Nobody | Exclusive |
| Open source | Sanuli (1 language) | Unique at our scale |

### Where We Can't Win

| Market | Dominant Player | Why |
|--------|----------------|-----|
| English daily | NYT (100M+/mo) | Brand + 12M subscribers |
| French daily | SUTOM (2-5M/mo) | Cultural icon (TV show Motus) |
| Portuguese daily | Termo (2-5M/mo) | National identity |
| Finnish daily | Sanuli (1.5-3M/mo) | Community beloved |

Strategy: coexist as the multilingual alternative, don't compete head-on.

---

## Open Questions

1. ~~Database hosting~~ — **Decided:** Render Postgres ($7/mo), Prisma ORM.
2. ~~Auth provider~~ — **Decided:** `nuxt-auth-utils` (Google + Apple OAuth, email/password fallback).
3. ~~Multi-board mobile UX~~ — **Decided:** Dordle side-by-side, Tridle stacked with expand/collapse toggle, Quordle 2×2 grid always visible. See design explorations.
4. ~~Product navigation architecture~~ — **Decided:** Hybrid (Homepage Hub + Two-Step board picker + Config Bar). See design exploration Option F.
5. ~~Icon system~~ — **Decided:** Lucide (UI icons) + Circle Flags (country flags).
6. **Leaderboard scope:** Per-language only or cross-language? Daily/weekly/all-time?
7. **Comments moderation:** Manual, community-flagging, or AI? 80 languages makes this very hard.
8. **Native app scope:** Full feature parity or stripped-down v1? Which languages get App Store listings first?
9. **Word length availability:** Not all languages have enough 4-letter or 8-letter words. Per-language validation needed.
10. **Challenge words:** Any word or only from the word list? Custom words enable creativity but also abuse.
11. **Stats migration:** On account creation, retroactively credit localStorage history? Handle multi-device conflicts?
12. **Monetization timing:** Introduce premium before or after native app? How does it affect the brand?
13. **Design direction:** Direction A (Editorial) or Direction C (Quiet Craft)? Or a hybrid?
14. **Party mode infrastructure:** Ephemeral rooms (Redis/in-memory with TTL) or persistent (DB)?

---

## Related Documents

| Document | Contents |
|----------|----------|
| `docs/tridle_quordle_gamemodes.md` | Multi-board technical analysis — component readiness, store refactor, architecture sketch |
| `docs/semantic_explorer_mode.md` | Semantic Explorer design — word map, compass, LLM hints, embeddings, rollout plan |
| `docs/competitor-research/competitor-profiles.md` | 12 competitor deep dives — traffic, revenue, features |
| `docs/competitor-research/recommendations.md` | Prioritized feature recommendations with UI mockups |
| `docs/competitor-research/monetization.md` | Pricing strategy, conversion funnel, revenue projections |
| `docs/TODO.md` | Current P0-P3 bug fixes and action items |
| `docs/LANGUAGE_EXPANSION.md` | Adding new languages — pipeline, candidates, checklist |
| `docs/WORD_DATA_ARCHITECTURE.md` | Word pipeline and data format |
| `docs/nuxt-migration.md` | Nuxt 3 migration (completed, historical reference) |
| `../wordle-design-explorations/` | Design exploration prototypes — Direction A (Editorial), Direction C (Quiet Craft), product architecture mockups, party mode screens |
