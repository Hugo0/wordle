# Wordle Global — TODO

## Bugs

- [x] **Hebrew blocklist too large** — 57K blocked→valid (fixed 2026-03-20)
- [x] **Multi-board missing analytics** — added trackGameComplete to dordle/quordle handlers (fixed 2026-03-21)
- [x] **Definitions missing for 57+ languages** — rewritten to DB-backed 2-tier system (LLM + kaikki)
- [x] **Keyboard colors wrong for final-form letters** — Hebrew כ↔ך etc, Greek σ↔ς. normalizeMap now includes final_form_map
- [x] **`/en/speed` 500 error** — useGameShare composable missing, fixed
- [x] **Dordle/quordle pages duplicated** — consolidated into `pages/[lang]/[mode].vue`
- [ ] **Hebrew checkWord() rejects final-form words** — `checkWord()` should normalize final forms before lookup. Low real-world impact (only ~68 obscure words affected)
- [ ] **Hardcoded "6" in community percentile** — `utils/stats.ts`, `server/utils/word-stats.ts` reject attempts > 6. Non-classic modes can't record community stats. Fix: pass `maxGuesses` from GameConfig
- [ ] **English-only strings in speed/multi-board UI** — StatsModal, SpeedResults, MultiBoardLayout, AppSidebar have hardcoded English. Route through `language_config.json`

## Semantic Explorer

- [ ] **#16 Viewport-locked layout** — semantic.vue uses scrollable layout while all other modes use viewport-locked PageShell. Causes double scrollbar, map overflow, input below fold. Proper fix: flex columns, no page-level scroll. Consolidates #21 and #24
- [ ] **#21 Mobile layout reorder** — guesses list at top, compass below, map below that, input pinned to bottom. Prioritizes typing-relevant info over the visual map
- [ ] **#24 Virtual keyboard covers input** — partially fixed with `preventScroll`. Proper fix: `visualViewport` API to offset input by keyboard height. Moot if #16 is done first
- [ ] **#9 Mobile tabbed bottom panel** — Rank / Compass / List tabs instead of vertical stack. Eliminates scroll during gameplay
- [ ] **#17 OG image** — design `public/images/og-semantic.png` (1200x630) with meaning map + editorial aesthetic
- [ ] **#18 Best starting words** — add semantic-specific tips to `/en/best-starting-words`

## Word Pages & Dictionary

- [ ] **Bulk kaikki import** — download kaikki.org JSONL dumps for all 79 languages, extract structured dictionary data (senses, etymology, IPA, forms, translations) into Postgres `definitions` table. Script: modify `scripts/deprecated/build_definitions.py`. Native editions for 13 langs (cs, de, el, es, fr, it, ko, nl, pl, pt, ru, tr, vi), English edition for the rest. ~1.2 GB for all 1.4M words.
- [ ] **Native language definitions** — for the 13 languages with native kaikki editions, import native-language glosses instead of English. Show native as default, English as secondary.
- [ ] **Definition fallback chain** — when LLM fails, fall back to kaikki data before writing negative cache. Never overwrite a kaikki definition with a negative entry.
- [ ] **Multi-length word lists** — expand beyond 5-letter words for semantic explorer in all languages. Enables cross-language translation links for words of any length.
- [ ] **Cross-language word links via translations** — kaikki `translations` field maps words between languages. Currently seeded for test words; bulk import will populate for all words. Translation links auto-expand as word lists grow.

## SEO & Content

- [ ] **Redesign share images** — `scripts/generate_share_images.py` still uses old dark theme. Update to editorial design system colors
- [ ] **Submit new URLs to GSC** — 400+ game mode URLs in sitemap, not yet crawled. Submit sitemap + request indexing for top 50
- [ ] **#19 useGameSeo refactor** — silent 60-char title truncation, hardcoded `| Wordle English` suffix. Add per-mode configurable suffix + length validation

## Stats & Sync

- [ ] **#12 Stats modal redesign** — show daily + unlimited stats per mode in separate sections. Data already split (`en_dordle` vs `en_dordle_daily`)
- [ ] **#14 Sync endpoint: coerce att:0 on losses** — old localStorage stored `attempts: 0` for losses. Coerce to `maxGuesses`. Affects 48 legacy records
- [ ] **#15 Reactive stats store** — make `stats` a `computed` derived from reactive `gameResults` + `currentStatsKey` instead of imperative `calculateStats()`. Eliminates stale-stats bugs

## Infrastructure

- [ ] **#13 Ephemeral Postgres for CI** — E2E tests hit production DB, creating junk accounts. Use GitHub Actions Postgres service container
- [ ] **#22 Image thumbnail optimization** — generate 300px thumbnails alongside 1024px originals. Archive pages load 960KB of images displayed at 200px; thumbnails would be 60KB total

## DB Migration — Remove Disk Fallback Paths

**Status**: Monitoring — disk fallback paths emit console.warn when hit. Target: ~2026-04-26.

### Phase 1: Remove disk fallback code
- [x] `definitions.ts` — disk fallback removed (DB-only)
- [x] `word-stats.ts` — disk fallback removed (DB-only via db-cache.ts)
- [x] `wiktionary.ts` — disk fallback removed (DB-only via db-cache.ts)
- [x] `hint.post.ts` — no disk I/O (LLM with DB session cache)
- [x] `semantic.ts` legacy in-memory loader — endpoints migrated to `_semantic-db.ts`
- [ ] `data-loader.ts` — still exports `WORD_DEFS_DIR`, `WORD_STATS_DIR`
- [ ] Remove `proper-lockfile` from package.json

### Phase 2: Migrate remaining disk-dependent features
- [ ] **Word history** → DB table `(lang, day_idx, word)`. Eliminates 546MB of `.txt` files
- [ ] **Word images** → keep on Render disk ($0.40/mo) or move to Cloudflare R2

### Phase 3: Remove heavy files from git
- [ ] `data/semantic/embeddings.f32` + `embeddings.meta.json` (~99MB) — in pgvector
- [ ] `data/semantic/axes.json` — in `semantic_axes` table
- [ ] `data/semantic/umap.json`, `pca2d.json` — in `word_embeddings` columns
- [ ] `data/semantic/targets.json`, `vocabulary.json` — queryable from DB
- Keep: `valid_words.json` (runtime spellcheck), `data/definitions/` (archive for re-seeding)

## Accounts & Passkeys

- [ ] **Passkey signup flow broken on Apple** — `authenticate()` called first with no credentials triggers confusing "external passkey" OS dialog. After dismissal, error may not match cancel check → falls through to register. No success state after account creation (modal just closes). `authenticate.post.ts` looks up by `email` but passkey users have `null` email, so re-auth never works → loop creates duplicate accounts. Fixes: (1) don't authenticate-first for new users, (2) fix credential lookup, (3) set `authenticatorAttachment: 'platform'`, (4) add welcome/success state, (5) guard against double-registration
- [ ] **Safari→PWA localStorage loss** — iOS gives PWAs a separate localStorage partition. Anonymous users lose all game history when installing. No cookie-based transfer exists. Fix: rework PWA install CTA to prompt sign-in first (so data syncs to server), only show install CTA after account exists. Fallback: cookie hack to serialize localStorage before install

## Community & Comments

- [ ] **Leaderboard discussion** — Add `WordComments` component to `/leaderboard` page with `targetType='leaderboard'` and `targetKey='{lang}-{mode}-{dayIdx}'`. Same component, different target. Consider spoiler gating: only show comments to users who've already played that day.
- [ ] **Leaderboard daily bragging** — Surface comment count / teaser in the post-game panel: "3 players are talking about today's word" linking to leaderboard discussion.
- [ ] **Comment admin tooling** — Simple admin page or Prisma Studio workflow to review reports (type='report'/'feedback') and moderate comments (toggle `hidden` flag). No UI yet.
- [ ] **Resend email setup** — Configure `RESEND_API_KEY` in production `.env` to enable email notifications for bug reports, password reset, and email verification flows.

## Open Design Decisions

- [ ] `/en/unlimited` canonical — add `<link rel="canonical" href="/en?play=unlimited">`?
- [ ] Homepage mode cards redesign — remove standalone "unlimited" card, add daily/unlimited labels, feature Semantic prominently
- [x] Language switcher preserves page — LanguagePickerModal now keeps path suffix when switching
- [ ] Sidebar visual polish — sub-panel dismiss behavior, active border highlight (implemented, unverified)
