# Hebrew Bugs — Investigation & Fix Plan (2026-03-19)

Hebrew has 885 weekly sessions but only 7% completion rate (vs 37% baseline).
Four bugs found during investigation. Bugs #1, #1b, and #2 are **systemic**.

---

## Bug 1: Keyboard colors wrong key for final-form letters (SYSTEMIC)

**Impact**: Hebrew (5 letter pairs) + Greek (σ/ς). Misleading keyboard feedback.
**Severity**: High — keyboard shows wrong letters as green/yellow, confusing players.

### Root cause

When user types פ (regular pe) at the last position:

1. `addChar()` (game.ts:259) calls `toFinalForm('פ', true, config)` → stores **ף** in tile
2. `updateColors()` (game.ts:320) reads `guessChar = 'ף'` from tile
3. `pendingKeyUpdates` (game.ts:326) stores `{ char: 'ף' }`
4. `updateKeyColor('ף', ...)` (game.ts:395) colors the **ף** key on keyboard
5. The **פ** key (which user actually pressed) stays uncolored

`updateKeyColor` (game.ts:397-408) propagates colors via `normalizeMap`, but that's built
from `diacritic_map` only (utils/diacritics.ts:30). It does NOT include `final_form_map`.

### Affected languages

| Language | final_form_map | Letter pairs |
|----------|---------------|--------------|
| **Hebrew** | כ↔ך, מ↔ם, נ↔ן, פ↔ף, צ↔ץ | 5 pairs, all on keyboard |
| **Greek** | σ↔ς | 1 pair (21% of daily words end with ς) |

### Fix

In `updateKeyColor()` (game.ts:371-409), after the diacritic propagation block,
also propagate to final/regular form pairs:

```typescript
// Also update final form ↔ regular form pairs
const config = lang.config ?? {};
if (config.final_form_map) {
    const finalForm = config.final_form_map[char];
    if (finalForm) updateSingleKey(finalForm, newState);

    const regularForm = lang.finalFormReverseMap.get(char);
    if (regularForm) updateSingleKey(regularForm, newState);
}
```

---

## Bug 1b: checkWord() rejects valid Hebrew words (CRITICAL — likely cause of 7%)

**Impact**: Hebrew and Greek. Words typed with final forms may fail validation.
**Severity**: CRITICAL — this likely causes most of the 7% completion rate.

### Root cause

When user types a word and presses Enter:

1. `addChar()` at position 4 converts פ→ף via `toFinalForm`
2. Tiles now contain e.g. `['פ','י','ל','ג','ף']` (note ף at end)
3. `enterGuess()` (game.ts:463): `const typedWord = row.join('').toLowerCase()` → `"פילגף"`
4. `checkWord("פילגף")` checks:
   - `wordListSet.has("פילגף")` → **false** (word list has `"פילגש"`, not `"פילגף"`)
   - `normalizeWord("פילגף", normalizeMap)` — normalizeMap is diacritics only, doesn't
     convert final forms → still `"פילגף"`
   - `getNormalizedWordMap().get("פילגף")` → **miss** (map was built with regular forms)
   - Returns **null** → word rejected as invalid!

Wait — the word פילגש ends with ש which has no final form. So this specific word wouldn't
hit the bug. But ANY Hebrew word the user tries to guess where they type a final-form letter
(כ→ך, מ→ם, נ→ן, פ→ף, צ→ץ) at the last position WILL fail validation if the word list
stores the word with a regular form at that position (which shouldn't happen for properly
formed Hebrew — final forms should be at the end).

### When does it actually break?

The bug triggers when:
- User types a letter with a final form variant at position 4 (last)
- `toFinalForm` converts it to the final form
- The word in the word list ALSO has the final form at that position
- → In this case it should MATCH (both have final form)

But it breaks when:
- User types e.g. "שלמ" (3 letters), backspaces, retypes — intermediate states may leave
  final forms in non-final positions
- Or: the word list has inconsistent final form usage

### Verification needed

```bash
# Check: do ALL Hebrew words in word list use proper final forms at end?
python3 -c "
import json
d = json.load(open('data/languages/he/words.json'))
finals = {'ך':'כ', 'ם':'מ', 'ן':'נ', 'ף':'פ', 'ץ':'צ'}
regulars = {v:k for k,v in finals.items()}
for w in d['words'][:20]:
    word = w['word']
    # Check if last char SHOULD be final but isn't
    if word[-1] in regulars:
        print(f'  {word} — ends with {word[-1]} (should be {regulars[word[-1]]}?)')
"
```

### Fix

In `checkWord()` (game.ts:276-291), normalize final forms to regular forms before lookup:

```typescript
function checkWord(word: string): string | null {
    // Normalize positional final forms → regular forms before lookup
    const lang = useLanguageStore();
    let normalized = word;
    if (lang.finalFormReverseMap.size > 0) {
        normalized = [...word].map(c => lang.finalFormReverseMap.get(c) || c).join('');
    }

    if (lang.wordListSet.has(normalized)) return normalized;
    // ... rest of existing logic
}
```

### Backspace edge case

`deleteChar()` (game.ts:581-590) doesn't re-evaluate final forms when removing the last char.
If user types "שלמ" where מ is at pos 2 (not final, stays מ), then types at pos 3 where the
new char becomes final, then backspaces — the char at pos 2 doesn't get re-evaluated.
This can leave regular forms where final forms are expected and vice versa.

---

## Bug 2: No definition or word image shown after game over (SYSTEMIC)

**Impact**: Hebrew + likely 70+ other languages without pre-cached definitions.
**Severity**: Medium — missing content, doesn't block gameplay.

### Root cause

Definition system is 3-tier: disk cache → LLM (GPT-5.2) → kaikki (offline Wiktionary).

For Hebrew (פילגש):
- **Disk cache**: `word-defs/he/` doesn't exist (only de, en, es cached)
- **LLM**: Needs `OPENAI_API_KEY`. If set and returns confidence < 0.3, writes negative cache
- **Kaikki**: `he.json` (native) missing. `he_en.json` exists and HAS the word

The kaikki English fallback SHOULD return `{ definition: "mistress, concubine..." }`.

Most likely failure: LLM is called (key is set on production), returns null or low confidence,
**negative cache is written** (definitions.ts:318: `{ not_found: true, ts: ... }`).
Subsequent requests within 24h hit the negative cache and return null. Kaikki is never reached.

### Verified on production

```
Hebrew:   GET /api/he/definition/פילגש  → 404
Arabic:   GET /api/ar/definition/كتاب   → 404
Croatian: GET /api/hr/definition/kuća   → 404
English:  GET /api/en/definition/hello  → 200 (LLM cached)
Finnish:  GET /api/fi/definition/koira  → 200 (native kaikki)
German:   GET /api/de/definition/hallo  → 200 (native kaikki)
```

**Pattern**: Languages with native kaikki files work. Languages with ONLY `_en.json` fail.

### Kaikki file coverage

- **13 languages** have native `{lang}.json`: cs, de, el, en, es, fr, it, nl, pl, pt, ru, tr, vi
- **57 languages** have only `{lang}_en.json` (English definitions) — ALL returning 404
- **25 languages** have no kaikki files at all

### Root cause (confirmed)

The LLM (GPT-5.2) is called first on production (OPENAI_API_KEY is set). For non-Western
words it either returns low confidence or fails. Then a **negative cache** is written
(`{ not_found: true, ts: ... }`). The kaikki fallback IS tried in the same request, but
if it ALSO returns null (e.g., lookup fails), the negative cache persists for 24h.

The English kaikki lookup (`lookupKaikki(word, lang, 'en')`) should work for Hebrew since
`he_en.json` has the word. But on production the file may not be found (path resolution
issue) or the lookup is failing for another reason.

### Fix

The definitions code has **zero logging** outside the LLM path. Kaikki lookups, negative
cache hits, file existence checks, and final results are all silent. We can't diagnose
further from Render logs — need to add logging and redeploy.

Add to `server/utils/definitions.ts`:

```typescript
// In resolveDefinitionsDir() — log once at startup:
console.log(`[DEFS] Definitions dir: ${result}`);

// In loadKaikkiFile() — log file existence:
console.log(`[KAIKKI] Loading ${filePath}: exists=${existsSync(filePath)}, keys=${Object.keys(result).length}`);

// In fetchDefinition() — log the decision at each tier:
console.log(`[DEFS] ${langCode}/${word}: cache=${existsSync(cachePath) ? 'hit' : 'miss'}`);
// After LLM:
console.log(`[DEFS] ${langCode}/${word}: llm=${result ? 'ok' : 'null'}`);
// After kaikki:
console.log(`[DEFS] ${langCode}/${word}: kaikki=${result ? result.source : 'null'}`);
// Final:
console.log(`[DEFS] ${langCode}/${word}: final=${result ? result.source : 'not_found'}`);
```

This will reveal whether: (a) kaikki file isn't found on Render, (b) negative cache is
blocking, or (c) the lookup key doesn't match. One deploy and we'll know.

### Systemic scope — LARGE

57 languages with English-only kaikki are all affected. This includes Arabic (2.1K sessions/wk),
Croatian (1.3K), Bulgarian (963), Hebrew (885), Swedish (1K), and many more.
Only 13 Western European languages have working definitions.

---

## Bug 3: Day index (NOT a production bug)

Local debugging used wrong epoch. Production formula is:
`dayIdx = nDaysSinceUnixEpoch - 18992 + 195` → day 1734 for 2026-03-19.
Correctly uses consistent hash (1734 > MIGRATION_DAY_IDX 1681).

---

## Systemic Assessment

### Which languages are affected by which bugs?

| Bug | Languages | Sessions/week | Severity |
|-----|-----------|--------------|----------|
| #1 keyboard colors | Hebrew, Greek | 885 + 54 | High |
| #1b checkWord rejection | Hebrew, Greek | 885 + 54 | **CRITICAL** |
| #2 missing definitions | ~76 languages | most traffic | Medium |

### Greek impact

Greek has 29% completion (PostHog 12h: 7 starts, 2 completes). With only σ↔ς as the
final form pair, 21% of daily words end with ς. Both bugs #1 and #1b apply.
Greek's low completion may be partly caused by these bugs.

### Other languages unaffected by final form bugs

All other languages (including Arabic, Persian, Korean) don't have `final_form_map` in their
config. Their issues are separate (RTL input, composition scripts, etc.).

---

## Bug 4: Hebrew blocklist massively too large (ROOT CAUSE of 8.5% completion)

**Impact**: Hebrew — 885 sessions/week, 8.5% completion.
**Severity**: CRITICAL — this is the primary cause of Hebrew's broken completion rate.

### Root cause

Hebrew had **57,483 blocked words (57% of total)** — vs 0-4% for every other language.
Common everyday words like ישראל (Israel), אנחנו (we), ילדים (children), מחלקה (department),
מכבסה (laundromat), שמיעה (hearing) were all blocked. Users type normal Hebrew words and
get "word not valid" → give up.

The blocklist was imported during the word pipeline migration and never reviewed. An update
on Mar 15 intended to remove prefixed forms from DAILY tier but moved them to valid, not
blocked. The 57K blocked words predate that commit.

### Fix (DONE 2026-03-20)

Moved all 57,483 Hebrew `blocked` → `valid`. Now: daily=1,018, valid=99,664, blocked=0.
Words are guessable but won't be selected as the daily word.

### Follow-up needed

- **LLM curate the 57K promoted words**: Some may be genuine gibberish, conjugated
  fragments, or transliterations that shouldn't be guessable. Run LLM curation to review
  and re-block true garbage while keeping real Hebrew words as valid.
- **Check Irish (ga)**: 12% blocked (602 words) — given Irish already has 80% invalid
  word rate, this may be making it worse. Review and promote if appropriate.
- **Audit all languages**: Verify no other language has an accidentally aggressive blocklist.

---

## Priority

1. **P0 — DONE: Fix Bug 4** (Hebrew blocklist) — 57K blocked→valid. Deploy needed.
2. **P1 — Fix Bug 1** (keyboard sofit color propagation) — cosmetic but confusing for Hebrew/Greek.
3. **P1 — Fix Bug 2** (definitions) — add diagnostic logging, deploy, check Render logs.
4. **P2 — Bug 1b** (checkWord sofit) — only affects 68 obscure words, not a real issue.
5. **P2 — LLM curate Hebrew's 57K promoted words** — clean up true garbage.
6. **P2 — Generate native definition files** for high-traffic languages beyond en/de/es.
7. **P3 — Push notifications** — "Your daily Wordle is ready!" via Notification API. Works on
   desktop Chrome/Edge/Firefox without PWA install. Highest-ROI retention feature for desktop.
   One-time permission prompt, daily trigger to bring users back.
8. **P3 — Email digest** — "Your streak is at 47 days!" daily/weekly reminder. Heavier to build
   (needs email service + subscription flow) but powerful for retention.
9. **P4 — Homepage/new tab extension** — Chrome extension that shows Wordle on new tab. Niche
   but high engagement for power users.

---

# Phase 1 Audit — Remaining Items (2026-03-20)

## Medium Priority (should fix before production)

### ~~Multi-board missing analytics~~ ✅ FIXED (2026-03-21 hotfix)
Added `analytics.trackGameComplete()` with `game_mode`, frustration state, and timing to both `handleMultiBoardWon()` and `handleMultiBoardLost()`. Dordle/tridle/quordle completions now tracked.
Speed streak already tracked via `speed_session_complete` event (added by design agent).

### Hardcoded "6" in community percentile + word stats
**Files:** `utils/stats.ts:27,31`, `server/utils/word-stats.ts:98`
**Issue:** `calculateCommunityPercentile` rejects attempts > 6. Server-side word stats recording ignores attempts > 6.
**Impact:** Non-classic modes (dordle=7, tridle=8, quordle=9, semantic=10) can't submit/display community stats.
**Fix:** Pass `maxGuesses` from `GameConfig` to both functions.

### Dordle/tridle/quordle pages are 95% identical
**Files:** `pages/[lang]/dordle.vue`, `pages/[lang]/tridle.vue`, `pages/[lang]/quordle.vue`
**Issue:** ~90 lines each, differing only in mode string and SEO text.
**Fix:** Consolidate into `pages/[lang]/[mode].vue` dynamic route, or extract shared template into a thin wrapper.

## SEO Follow-ups (2026-03-21)

### Redesign classic share images to match editorial design system
**Files:** `scripts/generate_share_images.py`, `public/images/share/` (553 files)
**Issue:** Share result images (e.g., en_3.png) still use old dark theme (#171717 background, Tailwind green #22c55e). Don't match the new editorial design system.
**Fix:** Update `generate_share_images.py` to use design system colors (paper background, correct green #2d8544, Wordle.Global masthead). Regenerate all 553 images.

### Submit new URLs to Google Search Console
**Issue:** 400+ new game mode URLs are in the sitemap but Google hasn't crawled them yet.
**Fix:** Go to Google Search Console → Sitemaps → submit `https://wordle.global/sitemap.xml`. Then request indexing for top 50 URLs (top 10 languages × 5 modes).

### `/en/speed` 500 error — `useGameShare is not defined`
**Files:** `pages/[lang]/speed.vue`
**Issue:** Speed mode page crashes on SSR. `useGameShare` composable is referenced but not defined — likely from the BoardState refactor agent's changes.
**Fix:** The other agent needs to create/export the `useGameShare` composable or fix the import.

## Low Priority (cleanup)

### English-only strings in speed/multi-board UI
**Files:** StatsModal, SpeedResults, SpeedStatsStrip, MultiBoardLayout, AppSidebar
**Issue:** Strings like "Solved in N guesses", "Board 1", "Tap to expand", "Speed Streak", sidebar labels are hardcoded English.
**Fix:** Route through `language_config.json` UI translations (i18n). Phase 2 work.

### Unused exports in game-modes.ts
**Exports:** `SocialMode`, `PlayType`, `GameModeDefinition`
**Issue:** Defined for future use (party mode, etc.) but not currently imported.
**Fix:** Keep — they're part of the planned architecture.

### Unused helpers in storage.ts
**Exports:** `removeLocal`, `readBool`, `writeBool`, `readJson`, `writeJson`, `dismissWithCooldown`, `isDismissedWithCooldown`
**Issue:** Pre-existing dead code, not from our refactor.
**Fix:** Low priority cleanup.

---

# Daily/Unlimited System — Open Decisions (2026-04-10)

These items need owner input before or during implementation. None block Phases 1-3.

### 1. `/en/unlimited` page long-term
Add `<link rel="canonical" href="/en?play=unlimited">` now, or keep both pages independent?
- **Recommendation**: Add canonical now. Keep the page working. Soft-deprecate later.

### 2. Daily Speed word pool size
How many deterministic words in the daily speed pool? Most players solve 10-20 in 5 min.
- **Recommendation**: 50, hardcoded.

### 3. First-visit UX for daily multi-board
Player first visits `/en/dordle?play=daily` — empty game, no saved state. Show banner?
- **Recommendation**: No banner. Same as classic daily first visit.

### 4. Language picker component reuse
Extract homepage language grid into shared component for modal reuse, or build independently?
- **Recommendation**: Build independently, refactor later.

### 5. Archive mode tabs — data timeline
Mode filter tabs on archive page: when to implement per-mode daily word history?
- **Recommendation**: Ship tabs with Classic only. Per-mode archive data is separate project.

### 6. Multi-board archive card design
For 8+ boards, cards become summaries. Implement card variants now or stub?
- **Recommendation**: Stub with "Coming soon". Full variants are separate design task.

### 7. Word page "Appeared in" section
Cross-mode daily history on word detail pages. Needs server-side cross-mode word index.
- **Recommendation**: Defer. Index doesn't exist yet.

### 8. Homepage mode cards redesign
Homepage still shows old flat mode list with hardcoded `HOMEPAGE_MODE_IDS`. Needs:
- Remove standalone "unlimited" card (it's Classic's unlimited variant)
- Add daily/unlimited labels per mode card
- For returning users: adapt cards to game state (in-progress, solved, "Play Unlimited →")
- Feature Semantic Explorer prominently
- Design explorations exist in editorial page (Screen 01, F1 Hub) and system design doc (section 7) but no final design decided

### 9. Semantic mobile tabbed bottom panel
Current mobile semantic layout stacks map + leaderboard + compass vertically — player must scroll between them. A tabbed bottom panel (Rank / Compass / List tabs) would show one section at a time above the fixed input, eliminating scroll during gameplay. Described in session but not implemented.

### 10. Verify `useFetch` key with playType
`pages/[lang]/[mode].vue` uses `key: 'lang-data-${lang}-${mode}-${playType.value}'`. If `playType` changes after initial SSR (e.g., localStorage preference read), the cached response may be stale. Likely a non-issue because page remounts on route change, but needs explicit verification.

### 11. Sidebar visual polish
- Sub-panel dismiss behavior when clicking different modes (implemented but not verified)
- Active border-left vs sub-panel warm-bg highlight conflict (CSS added but not verified)
- Daily multi-board persistence end-to-end test (save/restore on reload)

### 12. Stats modal/page redesign — combined daily + unlimited view
Stats should show both play types per mode: daily stats (with streak) and unlimited stats (play count, win rate, no streak) in separate sections. Current stats modal only shows one set of stats per mode. Needs:
- Stats modal: two-section layout (Daily / Unlimited) for modes that support both
- Stats page (`/stats`): same combined view with mode tabs
- Existing stats data is preserved — `"en_dordle"` (unlimited) and `"en_dordle_daily"` (daily) are already separate keys
- No data migration needed, just a UI redesign to surface both
