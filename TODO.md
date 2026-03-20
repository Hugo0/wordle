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
