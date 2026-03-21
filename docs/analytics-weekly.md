# Wordle Global — Weekly Analytics

*Data source: GA4 (property 299782185). PostHog (project 141403) is currently undercounting by ~70% due to ad blockers + init timing — see Known Issues. Use GA4 for all absolute numbers. PostHog ratios (win rate, frustration %) are still representative.*

*Action items tracked in [TODO.md](TODO.md).*

---

## How to Query Analytics

### Tools Available

**Google Analytics (GA4)** — Use the `mcp__analytics-mcp` MCP tools:
- `run_realtime_report` — Live active users, events in last 30 min. Good for post-deploy monitoring.
- `run_report` — Historical data with date ranges. Good for weekly comparisons.
- Property ID: `299782185`
- Key dimensions: `unifiedScreenName`, `country`, `deviceCategory`
- Key metrics: `activeUsers`, `sessions`, `screenPageViews`, `bounceRate`, `averageSessionDuration`

**PostHog** — Use the `mcp__posthog` MCP tools:
- `query-run` — Run TrendsQuery, FunnelsQuery, PathsQuery, or HogQL
- `list-errors` — Check error tracking (zero errors = good)
- `dashboards-get-all` — List all dashboards
- `insight-create-from-query` — Save insights to dashboards
- Project ID: `141403` (Personal org, "wordle" project). **Not** the Squirrel Labs/Peanut org.
- Switch with: `switch-project` (projectId: 141403)

### Common Queries

**Realtime health check:**
```
run_realtime_report(property_id=299782185, dimensions=["eventName"], metrics=["eventCount"])
```

**Game completions by mode (PostHog):**
```
query-run: TrendsQuery, event="game_complete", breakdown="game_mode"
```

**Game starts by mode (PostHog):**
```
query-run: TrendsQuery, event="game_start", breakdown="game_mode"
```

**New mode pageviews (PostHog):**
```
query-run: TrendsQuery, event="$pageview", property $pathname regex "/(unlimited|dordle|quordle|speed)"
```

**Error check (PostHog):**
```
list-errors(dateFrom="2026-03-21T00:00:00Z", status="active")
```

### Key Events

| Event | Fires From | Has `game_mode` | Notes |
|-------|-----------|-----------------|-------|
| `game_start` | All modes | Yes | Fires from `useGamePage` composable |
| `game_complete` | Classic, Unlimited | Yes | **Not fired for multi-board or speed** (known gap) |
| `game_abandon` | All modes | Yes | Page unload mid-game |
| `guess_submit` | Classic only | No | Per-guess tracking |
| `invalid_word` | All modes | No | Frustration signal |
| `share_click/success/fail` | All modes | Yes | Share flow |
| `streak_milestone` | Classic only | No | 7/14/30/50/100/200/365 |

### PostHog Dashboards

| Dashboard | ID | Purpose |
|-----------|-----|---------|
| V3 Game Modes | 580272 | Post-launch: adoption, completions by mode |
| Real-Time Monitor | 570461 | Live activity + language breakdown |
| Growth Dashboard | 570061 | Funnels, retention, virality |
| Product Health | 570498 | Word difficulty, frustration, quality |

### Known Analytics Gaps

1. **Multi-board `game_complete` not tracked** — `handleMultiBoardWon/Lost` doesn't call `analytics.trackGameComplete()`. Can see `game_start` but not completion for dordle/quordle.
2. **Speed Streak `game_complete` not tracked** — `finishSpeedSession` doesn't fire analytics.
3. **PostHog undercounting ~70%** — ad blockers + init timing. Use GA4 for absolute counts.

---

## V3 Launch — March 20–21, 2026

### What Shipped

5 new game modes (Unlimited, Dordle, Quordle, Speed Streak, Tridle architecture), design system overhaul (Fraunces fonts, Lucide icons, Circle Flags, sidebar, game header), BoardState refactor, page deduplication.

### Launch Metrics (first hour, March 21 00:00–01:00 UTC)

**Game Starts by Mode:**

| Mode | Starts | Completions | Notes |
|------|--------|-------------|-------|
| classic | 213 | 72 | Normal (v3 code with `game_mode` tag) |
| daily (pre-v3) | 13,184 | 6,460 | Yesterday's events (no `game_mode` tag) |
| unlimited | 14 | 18 | Working! Multiple games per session |
| quordle | 11 | 0* | *Completion not tracked (known gap) |
| dordle | 4 | 0* | *Same |
| speed | 4 | 0* | *Same |

**New Mode Discovery (pageviews):**

| Path | Pageviews |
|------|-----------|
| /en/unlimited | 17 |
| /fi/unlimited | 7 |
| /ar/unlimited | 5 |
| /hu/unlimited | 5 |
| /en/quordle | 4 |
| /hu/speed | 4 |
| /en/dordle | 1 |
| /en/speed | 1 |
| /es/quordle | 1 |
| /es/unlimited | 1 |
| /fi/quordle | 1 |
| /lv/unlimited | 1 |
| /ar/speed | 1 |

All organic discovery via sidebar — no promotion, no announcement, no SEO yet.

**Health:**
- Zero errors in PostHog error tracking
- Zero `page_error` events in GA4
- Classic daily completion rate: 34% (normal for this hour)
- All routes returning HTTP 200

**Regressions:** None detected.

---

## Week of Mar 10–16, 2026

Nuxt migration deployed (PR #165). 14 new languages added (65 → 79). Word pipeline overhaul. PostHog dashboards built.

### Site-Wide (GA4)

| Metric | Feb 24–Mar 2 | Mar 3–9 | **Mar 10–16** | WoW |
|--------|-------------|---------|--------------|-----|
| Sessions | 39,769 | 48,142 | **50,564** | **+5.0%** |
| Users | 18,844 | 24,289 | **26,093** | +7.4% |
| New Users | 12,756 | 17,910 | **19,051** | +6.4% |
| Bounce Rate | 20.9% | 24.3% | **25.6%** | +1.3pp |
| Avg Duration | 274s | 267s | **264s** | flat |
| Engaged Sessions | 31,456 | 36,455 | **37,606** | +3.2% |
| Page Views | 68,131 | 77,768 | **84,863** | +9.1% |

**Three consecutive weeks of growth.** 40K → 48K → 51K sessions. Bounce rate creeping up partly due to Singapore/China bots (~1,100+300 sessions, 97% bounce).

### Game Funnel (GA4)

| Metric | Feb 24–Mar 2 | Mar 3–9 | **Mar 10–16** | WoW |
|--------|-------------|---------|--------------|-----|
| Game Starts | 53,415 | 59,359 | **66,982** | **+12.8%** |
| Game Completes | 26,902 | 29,560 | **31,948** | +8.1% |
| Completion Rate | 50.4% | 49.8% | **47.7%** | -2.1pp |
| Game Abandons | 2,385 | 2,959 | **3,460** | +16.9% |
| Abandon Rate | 4.5% | 5.0% | **5.2%** | +0.2pp |
| Invalid Words | 106,538 | 131,744 | **99,563** | **-24.4%** |
| Invalid/Start | 2.0 | 2.2 | **1.5** | **-32% improved** |
| Share Clicks | 2,983 | 3,089 | **2,307** | -25.3% |
| Share Successes | 2,202 | 2,250 | **1,661** | -26.2% |
| Share/Complete % | 8.2% | 7.6% | **5.2%** | **-2.4pp regression** |
| Streak Milestones | 1,064 | 1,069 | **803** | -24.9% |
| Page Errors | 987 | 870 | **3,646** | **+319% spike** |
| PWA Installs | 453 | 485 | **319** | **-34.2% regression** |
| PWA Sessions | 5,086 | 5,679 | **5,602** | flat |

**Good:** Invalid words per start improved dramatically (2.2 → 1.5). Word pipeline overhaul is working.

**Bad:** Share rate collapsed (7.6% → 5.2%). Page errors spiked 4x (likely Nuxt migration teething). PWA installs down 34% — install flow partially broken. Completion rate declining despite better word lists — may be influx of new/casual users from SEO growth.

### Traffic Sources (GA4)

| Channel | Mar 3–9 | **Mar 10–16** | WoW |
|---------|---------|--------------|-----|
| Organic Search | 28,833 | **31,772** | **+10.2%** |
| Unassigned (PWA) | 13,534 | **14,402** | +6.4% |
| Direct | 5,180 | **5,014** | flat |
| Referral | 578 | **428** | -25.9% |
| Organic Social | 103 | **119** | +15.5% |

Google organic continues compounding (+10% WoW). Now 63% of all traffic.

### Top Countries (GA4)

| Country | Mar 3–9 | **Mar 10–16** | WoW | Notes |
|---------|---------|--------------|-----|-------|
| Finland | 12,738 | **13,038** | +2% | Stable |
| Spain | 2,468 | **2,977** | **+21%** | |
| Germany | 2,650 | **2,845** | +7% | |
| US | 2,269 | **2,761** | **+22%** | |
| UK | 1,957 | **2,047** | +5% | |
| Sweden | 1,525 | **1,947** | **+28%** | |
| Saudi Arabia | 1,163 | **1,764** | **+52%** | Arabic recovering |
| Turkey | 1,613 | **1,674** | +4% | |
| Singapore | 1,441 | **1,112** | -23% | Bots (97% bounce, 5s duration) |
| Croatia | 1,278 | **1,310** | +3% | |
| Denmark | 788 | **1,213** | **+54%** | |
| Israel | 1,132 | **1,132** | flat | |
| Canada | 1,029 | **1,042** | flat | |
| Bulgaria | 951 | **985** | +4% | |
| Italy | 698 | **831** | **+19%** | |
| China | 762 | **300** | -61% | Bots (same pattern as Singapore) |
| Portugal | 310 | **492** | **+59%** | |

**Standouts:** Saudi Arabia +52% (Arabic recovery after Ramadan?), Denmark +54%, Sweden +28%, Portugal +59%.

### Per-Language Traffic (GA4, full week)

| Lang | Sessions | WoW vs Mar 3–9 | vs 4 Months Ago |
|------|----------|----------------|-----------------|
| **en** | **15,171** | +121% vs 5wk ago | **+277%** |
| fi | 9,729 | -11% | -6% |
| ar | 2,525 | +12% | +40% |
| de | 1,638 | +59% | **+110%** |
| **es** | **1,260** | **+540%** vs 5wk ago | **+434%** |
| hr | 1,135 | -11% | +25% |
| tr | 1,104 | -15% | +39% |
| he | 965 | +49% | +23% |
| bg | 947 | +1% | -8% |
| da | 667 | +99% | **+104%** |
| hu | 665 | -1% | +47% |
| sv | 593 | +15% | +53% |
| **it** | **429** | **+252%** vs 5wk ago | **+342%** |
| et | 394 | +2% | -3% |
| sr | 359 | +1% | +32% |
| **pt** | **252** | +59% | **+193%** |
| ro | 234 | -30% | -16% |
| sk | 228 | +52% | -7% |
| mk | 195 | +41% | +70% |
| **nb** | **179** | **+184%** | **+220%** |
| ca | 174 | +54% | -7% |
| lv | 163 | +22% | +5% |
| **fr** | **161** | **+156%** | **+216%** |
| **cs** | **142** | **+122%** | **+106%** |
| **nl** | **132** | **+106%** | **+181%** |

English is now #1, overtaking Finnish. Western European languages (es, it, fr, pt, nb, nl, cs) all 100-500% growth from near-zero — pure SEO compounding.

### Per-Language Game Quality (PostHog, ~30% sample — ratios reliable, counts ~3x low)

| Lang | Win% | Frustration% | Invalid/Start | Assessment |
|------|------|-------------|---------------|------------|
| fi | 93.7% | 8.1% | 0.6 | Gold standard |
| bg | 93.3% | 7.9% | 0.6 | Excellent |
| ca | 95.2% | 14.5% | 0.9 | Excellent |
| es | 90.6% | 18.9% | 1.3 | Good |
| sv | 86.3% | 10.6% | 0.9 | Good |
| de | 83.0% | 17.6% | 1.9 | OK |
| **en** | **64.4%** | **44.3%** | **3.2** | **Worst — biggest language** |
| **he** | 77.9% | **41.2%** | 1.7 | **Broken — RTL bug (#178), 11% completion** |
| **ro** | 69.4% | 30.6% | **6.6** | **Word list gaps** |
| **ga** | 84.6% | **53.8%** | **8.2** | **Nearly unplayable** |
| **eu** | 64.0% | **64.0%** | 3.8 | **Broken** |

### PWA Health (GA4)

| Metric | This Week | Trend |
|--------|-----------|-------|
| PWA Sessions | 5,602/wk (~800/day) | Stable |
| PWA Installs | 319/wk (~46/day) | **Down 34% — install flow broken** |
| Install Rate | 2.8% (of prompts shown) | Was 4.5% pre-Nuxt |
| Est. Weekly Active PWA Users | ~2,000 | |
| Est. Total Installed Base | ~3,500-4,000 | |
| Platform Split | Android 82%, iOS 9%, Desktop 7% | |

PWA users play almost daily (0.9 days between sessions vs 3.2 for browser), win more (85% vs 79%), and represent ~10% of game completions.

### Bot Traffic

Singapore: ~1,112 sessions (97% bounce, 5s avg, 99% Windows/Chrome, crawling `/{lang}/word/{id}`). China: ~300 sessions, same pattern. Combined ~1,400 sessions inflate totals by ~3% and bounce rate by ~2pp.

### Issues Discovered This Week

- **#178** — Hebrew RTL typing broken (letters appear LTR). Likely cause of 11% completion rate.
- **#177** — Esperanto keyboard can't input diacritics (ĉ, ĝ, etc.). 63.6% frustration.
- **Game state cross-language bleed** — navigating between languages shows previous language's guesses. Pinia store not resetting.
- **PostHog undercounting ~70%** — ad blockers + init timing + `capture_pageview: false`. Fix: proxy through own domain, buffer early events.
- **Page errors spiked 4x** — needs investigation (may be Nuxt migration related or bot-triggered).
- **Share rate collapsed** 7.6% → 5.2% — share UX may have regressed in Nuxt migration.

---

## Week of Mar 3–9, 2026

### Site-Wide (GA4)

| Metric | Feb 24–Mar 2 | **Mar 3–9** | WoW |
|--------|-------------|------------|-----|
| Sessions | 40,434 | **47,011** | **+16.3%** |
| Daily Sessions (avg) | 5,776 | **6,716** | **+16.3%** |
| New Users/wk | 12,756 | **16,313** | **+27.9%** |
| Returning Users/wk | 7,221 | **7,513** | +4.0% |

Biggest single-week growth since the Jan reboot. ~1,500 sessions are Singapore/China bots, putting organic growth at +12-13%.

### Game Funnel (GA4)

| Metric | Feb 24–Mar 2 | **Mar 3–9** | WoW |
|--------|-------------|------------|-----|
| Game Starts | 53,415 | **55,621** | +4.1% |
| Game Completes | 26,902 | **27,942** | +3.9% |
| Completion Rate | 50.4% | **50.3%** | flat |
| Invalid Words | 106,538 | **122,999** | **+15.5%** |
| Invalid/Start | 2.0 | **2.2** | +10% |
| Share/Complete % | 8.2% | **7.8%** | -0.4pp |
| PWA Installs | 453 | **442** | flat |

Invalid words spiked — `guess_submitted` event stopped firing so rate can't be computed. English frustration investigated: top rejected words were SCOR_ and S_ORN pattern variations (players trying to find SCORN). Normal hard-word behavior, not a word list bug.

### Traffic Sources (GA4)

| Source | Feb 24–Mar 2 | **Mar 3–9** | WoW |
|--------|-------------|------------|-----|
| google / organic | 23,712 | **25,834** | **+8.9%** |
| banner (PWA) | 12,539 | **12,566** | flat |
| (direct) | 2,822 | **4,319** | **+53.1%** |
| bing / organic | 117 | **298** | **+155%** |
| studyourway.com | 8 | **233** | NEW |

Bing discovering the site. studyourway.com appeared as new referral (language learning site).

### Language Highlights

- **English +8%** — now ~15.5K/wk, #1 language
- **German +28%** — likely connected to studyourway.com referral
- **Hebrew +32%** — Israel 731 → 1,049 sessions. Genuine organic growth (competitor meduyeket.net dead)
- **Arabic +6%** — first WoW increase after months of decline
- **Finnish flat** — saturated at ~11K/wk

### Bot Traffic First Detected

Singapore 86 → 1,053 (+1,124%), China 62 → 582 (+839%). Systematic crawl of `/*/words` pages, 97% bounce, Windows/Chrome.

---

## Baseline: Feb 24–Mar 2, 2026

First full-week report with game events. Compared to Dec 2–8, 2025 (pre-reboot baseline).

### 3-Month Growth Summary

| Metric | Dec 2–8 | Feb 24–Mar 2 | 3-Month Change |
|--------|---------|-------------|----------------|
| Weekly Sessions | 32,630 | 40,434 | **+23.9%** |
| Bounce Rate | 52.4% | 22.1% | **-30.3pp** |
| Avg Duration | 161s | 270s | **+67.7%** |
| Engaged Sessions | 15,496 | 31,527 | **+103%** |
| Mobile Bounce | 58% | 21% | **-37pp** |

The Jan–Feb feature sprint (PWA, definitions, word art, stats, SEO overhaul) transformed engagement. Bounce rate halved, session duration nearly doubled.

### Traffic Source Mix

| Channel | Dec 2–8 | Feb 24–Mar 2 | Change |
|---------|---------|-------------|--------|
| Organic Search | 23,210 (71%) | 25,049 (61%) | +7.9% |
| Direct + PWA | 8,490 (26%) | 15,451 (38%) | **+82.0%** |
| Referral | 275 (0.9%) | 337 (0.8%) | +22.5% |
| Social | 119 (0.4%) | 117 (0.3%) | flat |

### Language Growth Tiers (3-month)

**Exploding (>+100%):** Portuguese +291%, Dutch +161%, Danish +159%, English +141%, Italian +140%, Spanish +122%, Polish +120%, French +107%, Czech +100%, German +97%

**Growing (+20–80%):** Norwegian +81%, Latin +72%, Romanian +69%, Swedish +51%, Hungarian +39%, Croatian +34%, Macedonian +27%, Slovak +20%, Serbian +21%

**Flat:** Finnish +6%, Hebrew flat, Catalan flat

**Declining:** Arabic -50%, Turkish -17%, Estonian -11%, Bulgarian -8%, Latvian -14%

### Geographic Patterns

**Nordic/Anglosphere surge** (playing English): Sweden +459%, Norway +230%, Denmark +144%, Canada +118%, US +104%, UK +90%

**Middle East decline:** Saudi Arabia -70%, Iran -78%, Iraq -41%, Kuwait -56%. Arabic traffic halved — cause unclear (competitor? ranking loss? Ramadan?).

---

## Known Issues: Analytics Infrastructure

### PostHog Undercounting (~30% of GA4)

Root causes identified in `plugins/analytics.client.ts`:

1. **Ad blockers** block `eu.i.posthog.com` more than GA4's `gtag.js`
2. **Init timing** — GA4 buffers via `window.dataLayer`; PostHog drops events fired before SDK loads
3. **`capture_pageview: false`** — "My App Dashboard" DAU tile uses `$pageview` (2K/wk) instead of `page_view_enhanced` (65K/wk)
4. **PWA install** especially affected (5.6% capture rate) — `appinstalled` fires before PostHog loads

**Fix needed:** Proxy PostHog through own domain, buffer early events, fix DAU dashboard tile. Until then, use GA4 for absolute counts. PostHog ratios are representative.

### Bot Traffic

Singapore + China bots: ~1,400 sessions/week, 97% bounce, 5s duration, 99% Windows/Chrome, crawling `/{lang}/word/{id}` pages. ~25 hits/hour for 18+ hours, rotating fingerprints. Inflates totals by ~3% and bounce rate by ~2pp.

---

*Next report: March 23, 2026*
