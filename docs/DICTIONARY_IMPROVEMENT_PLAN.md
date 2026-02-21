# Dictionary, Localization & Keyboard Improvement Plan

*Created: 2026-02-21 | Status: Research & Planning*

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Current State: Data Quality by Language](#current-state)
3. [Analytics: Where Dictionaries Are Failing Users](#analytics)
4. [How Other Wordle Apps Do It](#industry-best-practices)
5. [Priority Languages](#priority-languages)
6. [Architecture: The Two-List System](#architecture)
7. [Action Plan](#action-plan)

---

## 1. Executive Summary <a name="executive-summary"></a>

Our biggest user experience problem is **dictionary frustration**. Across all languages, 53% of all guess submissions are rejected as invalid words. The best-performing language (Bulgarian) rejects 30% — the worst (Italian) rejects 120% (more rejections than valid guesses due to retries).

The root cause: most of our word lists come from raw dictionary dumps (wooorm/dictionaries) without the **two-list split** that every successful Wordle uses. NYT Wordle has 2,309 curated daily words but accepts 12,947 valid guesses. We have the opposite problem — huge unsplit lists where every word is both a potential daily answer AND the only words players can guess.

**The fix**: For each high-traffic language, split into a curated daily-word list (~2,000-4,000 common words) and a large supplement list (all remaining valid 5-letter words). This is the single highest-impact improvement we can make.

---

## 2. Current State: Data Quality by Language <a name="current-state"></a>

### Data Sources
| Source | Languages | Quality |
|--------|-----------|---------|
| NYT Wordle | English | Gold standard — hand-curated two-list system |
| kaino.kotus.fi | Finnish | High quality academic source |
| wooorm/dictionaries (GitHub) | ~50 languages | Raw Hunspell dictionaries — includes every inflected form, no frequency filtering |
| Community PRs | Polish, Bulgarian, others | Variable — some excellent, some minimal |
| Unknown/custom | Klingon, Quenya, Palauan | Niche, small lists |

### Per-Language Inventory

**Languages with supplement lists (two-list system):**
| Lang | Main Words | Supplement | Total | Quality |
|------|-----------|------------|-------|---------|
| en | 2,309 | 10,638 | 12,947 | Excellent — NYT-sourced |
| pl | 1,712 | 34,150 | 35,862 | Good — recently improved (PR #115) |
| az | 1,469 | 3,404 | 4,873 | OK |
| ckb | 1,454 | 13,358 | 14,812 | Fair — supplement has length issues |

**Languages WITHOUT supplement lists (single list = daily words AND only valid guesses):**

Oversized lists (likely raw dictionary dumps — include obscure/inflected forms as daily words):
| Lang | Words | Sessions/28d | Problem |
|------|-------|-------------|---------|
| he | 64,539 | 2,957 | 177 years of daily words — includes every Hebrew inflection |
| sr | 17,967 | 1,848 | 49 years — likely unfiltered |
| sl | 11,730 | 343 | 32 years |
| fa | 11,252 | 344 | 31 years |
| nn | 10,522 | 172 | 29 years |
| sk | 10,443 | 839 | 29 years |
| el | 10,208 | 109 | 28 years |
| ar | 10,164 | 12,014 | 28 years — 3rd most popular language! |

Reasonably sized lists (but still no supplement → frustrating rejections):
| Lang | Words | Sessions/28d |
|------|-------|-------------|
| fi | 3,271 | 48,078 | ← #1 language, 34% invalid rate (best!) |
| fr | 4,482 | 911 |
| es | 3,602 | 2,217 |
| de | 2,277 | 5,425 |
| it | 2,783 | 1,089 |
| ru | 4,688 | 3,789 |
| tr | 9,224 | 5,748 |
| hr | 3,591 | 5,841 |
| hu | 6,047 | 2,825 |
| sv | 5,968 | 3,541 |
| bg | 4,953 | 4,289 |

Tiny lists (will repeat daily words quickly):
| Lang | Words | Sessions/28d | Repeats after |
|------|-------|-------------|---------------|
| rw | 20 | 9 | 20 days |
| tlh | 269 | 13 | 9 months |
| ltg | 387 | 5 | 1 year |
| mi | 128 | 193 | 4 months |
| vi | 739 | 413 | 2 years |

### Keyboard Coverage
- **33 languages** have custom keyboard files (51%)
- **32 languages** use auto-generated keyboards from character sets
- Known keyboard gaps (xfail in tests): vi, ko, el, pt, pau

### UI Translations
- **~30 languages** have fully translated UI (all 60-80 strings)
- **~35 languages** use partial translations with English defaults
- Template has ~60-80 translatable strings across: text (6), help (11), ui (27), meta (4)

### Known Data Quality Issues (pytest xfail)
| Language | Issues |
|----------|--------|
| pau | Uppercase words, duplicates, character mismatch, keyboard gaps |
| pt | Uppercase words, whitespace, character mismatch |
| ckb | Supplement word length issues |
| az | Character set mismatch |

---

## 3. Analytics: Where Dictionaries Are Failing Users <a name="analytics"></a>

### Invalid Word Rate by Language (28 days, sorted worst → best)

The "invalid word rate" measures what % of guess submissions are rejected. This is the **primary signal of dictionary quality** — a high rate means players keep trying real words that our dictionary doesn't accept.

**Critical (>70% invalid rate — most guesses rejected):**
| Lang | Sessions | Invalid Rate | Problem |
|------|----------|-------------|---------|
| it (Italian) | 1,089 | **120.5%** | More rejections than guesses — catastrophically bad dictionary |
| eo (Esperanto) | 59 | 96.7% | Nearly every guess rejected |
| nds (Low German) | 29 | 91.5% | Tiny list, no supplement |
| el (Greek) | 109 | 88.6% | Large word list but keyboard/character issues |
| nn (Nynorsk) | 172 | 83.0% | Players trying Bokmal words? |
| la (Latin) | 710 | 82.8% | Dead language — hard to know valid words |
| mk (Macedonian) | 601 | 77.6% | |
| fr (French) | 911 | 74.9% | Major language! Only 4,482 words, no supplement |
| lb (Luxembourgish) | 137 | 75.6% | |

**High (55-70% — frustrating experience):**
| Lang | Sessions | Invalid Rate | Problem |
|------|----------|-------------|---------|
| ro (Romanian) | 1,492 | 72.3% | |
| ca (Catalan) | 924 | 69.8% | |
| nl (Dutch) | 502 | 69.6% | |
| pt (Portuguese) | 710 | 67.6% | Data quality issues too |
| es (Spanish) | 2,217 | 67.1% | High traffic! Only 3,602 words |
| da (Danish) | 1,712 | 67.0% | |
| ar (Arabic) | 12,014 | 66.7% | 3rd most popular! |
| sk (Slovak) | 839 | 66.0% | |
| nb (Bokmal) | 460 | 65.0% | |
| ru (Russian) | 3,789 | 62.5% | |
| sv (Swedish) | 3,541 | 60.2% | |

**Moderate (45-55% — acceptable but improvable):**
| Lang | Sessions | Invalid Rate |
|------|----------|-------------|
| hu (Hungarian) | 2,825 | 57.2% |
| hr (Croatian) | 5,841 | 56.1% |
| he (Hebrew) | 2,957 | 49.4% |
| en (English) | 38,220 | 48.2% |
| de (German) | 5,425 | 47.8% |
| et (Estonian) | 1,841 | 48.8% |

**Good (<45% — healthy dictionary):**
| Lang | Sessions | Invalid Rate |
|------|----------|-------------|
| tr (Turkish) | 5,748 | 42.9% |
| fi (Finnish) | 48,078 | 34.3% |
| sr (Serbian) | 1,848 | 32.2% |
| bg (Bulgarian) | 4,289 | 30.0% |

### Key Insight: English baseline
NYT Wordle (English) has a 48% invalid rate even with 12,947 total accepted words. This suggests ~45-50% is a natural floor — players will always try some non-words. Languages significantly above 50% have genuine dictionary problems.

### Impact Estimate
If we reduced invalid rates for the top 10 languages to ~45% (English baseline):
- **~150,000 fewer frustrating rejections per month** across ar, es, fr, it, hr, ru, sv, da, ro, de
- Likely improvement in session duration and return rates

---

## 4. How Other Wordle Apps Do It <a name="industry-best-practices"></a>

### The NYT Gold Standard
- **2,309 curated daily words** — hand-picked by a human curator to be common, recognizable, fun
- **10,638 additional valid guesses** — broader Scrabble-like dictionary
- No obscure words, minimal plurals of 4-letter nouns, minimal past tenses ending in -ED
- **Key insight**: No amount of automated filtering replaces human curation

### Two-List System (Universal Pattern)
Every successful Wordle implementation uses two lists:
1. **Solutions list** (2,000-4,000 words): Curated common words that feel "fair" as daily answers
2. **Valid guesses list** (8,000-15,000 words): Broad dictionary so players' real-word guesses are accepted

The ratio is roughly **1:3 to 1:5** (solutions : total valid words).

### Diacritics Handling (Three Strategies)

| Strategy | When to use | Examples |
|----------|-------------|---------|
| **Diacritics are distinct letters** | The character is a fundamentally different letter | Norwegian å/æ/ø, Turkish ı/İ, Polish ą/ę/ł |
| **Diacritics normalize to base** | Accent is a spelling variation | French é→e, German ü→u, Portuguese ã→a |
| **Hybrid** | Mixed per character | Spanish: á→a (same letter) but ñ ≠ n (distinct) |

Our `diacritic_map` system in `language_config.json` already supports all three — this is a strength.

### Language-Specific Learnings

**Arabic (AlWird)**: Gives 8 attempts instead of 6 due to morphological complexity. Uses MSA (Modern Standard Arabic) words only. Arabic letter forms change by position (initial/medial/final/isolated).

**Hebrew (Meduyeket)**: Initially included final letter forms (sofit) as distinct but **removed them after user complaints**. Our `positional.ts` system handles this correctly.

**German (wordle-de)**: Sources from Wikipedia + OpenThesaurus. Treats umlauts as distinct characters. Clean two-list system with `target-words.json` + `other-words.json`.

**French (Le Mot)**: Curated dictionary, one daily word, accepts broad guess dictionary.

---

## 5. Priority Languages <a name="priority-languages"></a>

Ranking by **impact = sessions × dictionary-fixability**:

### Tier 1: High Traffic + Bad Dictionary (fix ASAP)
| Rank | Lang | Sessions/28d | Invalid Rate | Action |
|------|------|-------------|-------------|--------|
| 1 | **it** (Italian) | 1,089 | 120.5% | EMERGENCY — dictionary is broken. Add supplement list. |
| 2 | **ar** (Arabic) | 12,014 | 66.7% | Split 10K list → 2K daily + 8K supplement |
| 3 | **es** (Spanish) | 2,217 | 67.1% | Only 3,602 words. Need supplement from Spanish Scrabble dict |
| 4 | **fr** (French) | 911 | 74.9% | Only 4,482 words. Need French supplement |
| 5 | **ru** (Russian) | 3,789 | 62.5% | Split 4,688 list or add supplement |
| 6 | **sv** (Swedish) | 3,541 | 60.2% | 5,968 words. Add supplement |
| 7 | **da** (Danish) | 1,712 | 67.0% | 9,516 words. Split + supplement |
| 8 | **ro** (Romanian) | 1,492 | 72.3% | 8,618 words. Split + supplement |

### Tier 2: High Traffic + OK Dictionary (improve when possible)
| Rank | Lang | Sessions/28d | Invalid Rate | Action |
|------|------|-------------|-------------|--------|
| 9 | **de** (German) | 5,425 | 47.8% | Only 2,277 words. Add supplement (umlauts covered) |
| 10 | **hr** (Croatian) | 5,841 | 56.1% | 3,591 words. Add supplement |
| 11 | **hu** (Hungarian) | 2,825 | 57.2% | 6,047 words. Add supplement |
| 12 | **he** (Hebrew) | 2,957 | 49.4% | 64K words — needs aggressive curation down to ~3K daily |
| 13 | **tr** (Turkish) | 5,748 | 42.9% | 9,224 words. Already OK but could split |

### Tier 3: Fix Data Quality Issues
| Lang | Issue | Action |
|------|-------|--------|
| **pt** (Portuguese) | Uppercase, whitespace, character mismatch | Clean up word list |
| **pau** (Palauan) | Multiple data quality issues | Clean up |
| **el** (Greek) | 88.6% invalid rate despite 10K words — keyboard/character issue | Fix keyboard |

### Tier 4: Low Traffic (community-driven)
Everything else — accept PRs, but don't prioritize active work.

---

## 6. Architecture: The Two-List System <a name="architecture"></a>

### Current Architecture
```
{lang}_5words.txt           → Daily words AND the only accepted guesses
{lang}_5words_supplement.txt → Extra accepted guesses (only en, pl, az, ckb have this)
```

### Target Architecture
```
{lang}_5words.txt           → Curated daily words (2,000-4,000 common words)
{lang}_5words_supplement.txt → All other valid 5-letter words (5,000-15,000)
{lang}_blocklist.txt        → Words to skip as daily answers (already exists)
```

### How to Split a Word List

For each language, the process would be:

1. **Get a word frequency list** for the language (sources below)
2. **Score each word** by frequency — common words go to main list, rare to supplement
3. **Human review** — native speaker checks the daily word list for:
   - Offensive words
   - Too-obscure words
   - Overly technical/medical/legal terms
   - Proper nouns that slipped in
   - Regional words not widely known
4. **Size targets**: ~2,000-4,000 daily words, remainder to supplement

### Word Frequency Sources

| Source | Coverage | Quality | URL |
|--------|----------|---------|-----|
| **Wiktionary frequency lists** | 40+ languages | Good | dumps.wikimedia.org |
| **OpenSubtitles** | 60+ languages | Spoken language (good for "common" words) | opus.nlpl.eu |
| **Leipzig Corpora** | 200+ languages | Academic | wortschatz.uni-leipzig.de |
| **Google Books Ngrams** | 8 languages | Historical, formal | books.google.com/ngrams |
| **Hunspell dictionaries** | 80+ languages | Complete but unranked | Already our source via wooorm |

### No-Code Changes Needed
The app already supports the two-list system — `app.py` loads both `_5words.txt` and `_5words_supplement.txt`. Supplement words are valid guesses but never daily answers. We just need to create/populate the supplement files.

### Keyboard Improvements
For auto-generated keyboards (32 languages), the current system uses the character set file. Improvements:
1. Sort characters by frequency in the word list (most common letters in home row)
2. Match the standard physical keyboard layout for that language/script
3. Add alternative layouts where relevant (QWERTZ for German, AZERTY for French)

---

## 7. Action Plan <a name="action-plan"></a>

### Phase 1: Emergency Fixes (1-2 days)
- [ ] **Italian**: Investigate why invalid rate is 120% — likely a bug or severely broken dictionary
- [ ] **Portuguese**: Fix uppercase/whitespace data quality issues
- [ ] **Greek**: Fix keyboard/character issues causing 88% rejection rate

### Phase 2: High-Impact Supplement Lists (1-2 weeks)
For each Tier 1 language, create a supplement word list:

- [ ] **Arabic** (ar): Download Arabic word frequency list → split 10K into ~2.5K daily + 7.5K supplement
- [ ] **Spanish** (es): Source Spanish Scrabble dictionary or Wiktionary → create ~8K supplement
- [ ] **French** (fr): Source French Wiktionary/Lexique → create ~8K supplement
- [ ] **Russian** (ru): Source Russian word frequency list → create supplement
- [ ] **Swedish** (sv): Create supplement from Swedish dictionary
- [ ] **Danish** (da): Split 9.5K list → ~3K daily + 6.5K supplement
- [ ] **Romanian** (ro): Split 8.6K list → ~3K daily + 5.6K supplement
- [ ] **Italian** (it): Fix dictionary + add supplement

### Phase 3: Dictionary Curation (ongoing)
- [ ] **Hebrew**: Curate 64K → ~3K daily + 61K supplement (biggest single improvement possible)
- [ ] **German**: Add supplement list (only 2,277 words — too small for guesses)
- [ ] **Croatian**: Add supplement
- [ ] **Hungarian**: Add supplement
- [ ] **Turkish**: Split 9.2K → ~3K daily + 6K supplement

### Phase 4: Keyboard & Localization Polish
- [ ] Add AZERTY keyboard layout for French
- [ ] Add QWERTZ keyboard layout for German
- [ ] Fix Vietnamese keyboard coverage gaps
- [ ] Fix Korean keyboard coverage gaps
- [ ] Complete UI translations for top 20 languages

### Phase 5: Tooling (support ongoing curation)
- [ ] Build a script (`scripts/split_wordlist.py`) that takes a word frequency source and splits a word list into daily + supplement
- [ ] Build a script to validate word list quality (no uppercase, no whitespace, correct character set, no duplicates)
- [ ] Add a "suggest a word" feature so native speakers can report missing words
- [ ] Consider "easy mode" toggle that accepts any 5-letter string (already have the UI key)

### Open Research Questions
- [ ] Should Arabic get 8 attempts like AlWird? (morphological complexity)
- [ ] Should we add more diacritic maps? (currently only Arabic has one)
- [ ] Can we use LLMs to help curate word lists? (filter obscure words)
- [ ] What's our strategy for Chinese/Japanese/Thai? (non-alphabetic scripts)

---

## Appendix: Full Analytics Data

### Invalid Word Rate by Language (28 days, ≥100 guesses)

| Lang | Sessions | Guesses | Invalid | Invalid % | Completes | Starts | Complete % |
|------|----------|---------|---------|-----------|-----------|--------|------------|
| it | 1,089 | 11,801 | 14,222 | 120.5 | 452 | 211 | 214.2 |
| eo | 59 | 3,029 | 2,928 | 96.7 | 21 | 41 | 51.2 |
| nds | 29 | 401 | 367 | 91.5 | 6 | 17 | 35.3 |
| ne | 18 | 168 | 151 | 89.9 | 2 | 2 | 100.0 |
| el | 109 | 534 | 473 | 88.6 | 9 | 37 | 24.3 |
| nn | 172 | 2,863 | 2,376 | 83.0 | 85 | 64 | 132.8 |
| la | 710 | 11,525 | 9,543 | 82.8 | 369 | 211 | 174.9 |
| mk | 601 | 6,946 | 5,389 | 77.6 | 261 | 133 | 196.2 |
| mn | 83 | 835 | 632 | 75.7 | 38 | 15 | 253.3 |
| lb | 137 | 1,473 | 1,114 | 75.6 | 63 | 20 | 315.0 |
| fr | 911 | 10,638 | 7,965 | 74.9 | 456 | 214 | 213.1 |
| ro | 1,492 | 13,809 | 9,990 | 72.3 | 615 | 523 | 117.6 |
| ga | 210 | 1,784 | 1,279 | 71.7 | 85 | 56 | 151.8 |
| mi | 193 | 1,391 | 997 | 71.7 | 81 | 64 | 126.6 |
| gd | 163 | 1,251 | 880 | 70.3 | 77 | 36 | 213.9 |
| ca | 924 | 6,480 | 4,526 | 69.8 | 325 | 138 | 235.5 |
| nl | 502 | 4,662 | 3,246 | 69.6 | 230 | 153 | 150.3 |
| pt | 710 | 6,221 | 4,204 | 67.6 | 393 | 175 | 224.6 |
| es | 2,217 | 19,073 | 12,806 | 67.1 | 1,143 | 552 | 207.1 |
| da | 1,712 | 14,577 | 9,770 | 67.0 | 789 | 501 | 157.5 |
| ar | 12,014 | 93,031 | 62,034 | 66.7 | 4,832 | 2,292 | 210.8 |
| sk | 839 | 6,912 | 4,559 | 66.0 | 391 | 203 | 192.6 |
| nb | 460 | 3,387 | 2,201 | 65.0 | 199 | 83 | 239.8 |
| ru | 3,789 | 26,392 | 16,501 | 62.5 | 1,475 | 933 | 158.1 |
| pl | 524 | 3,451 | 2,090 | 60.6 | 230 | 126 | 182.5 |
| sv | 3,541 | 27,215 | 16,382 | 60.2 | 2,014 | 858 | 234.7 |
| pau | 91 | 512 | 296 | 57.8 | 42 | 22 | 190.9 |
| hu | 2,825 | 19,899 | 11,373 | 57.2 | 1,499 | 826 | 181.5 |
| uk | 486 | 3,353 | 1,892 | 56.4 | 226 | 155 | 145.8 |
| hr | 5,841 | 39,246 | 21,998 | 56.1 | 3,208 | 1,448 | 221.5 |
| hyw | 491 | 2,831 | 1,544 | 54.5 | 222 | 122 | 182.0 |
| gl | 557 | 2,950 | 1,531 | 51.9 | 296 | 98 | 302.0 |
| hy | 479 | 3,049 | 1,547 | 50.7 | 258 | 121 | 213.2 |
| he | 2,957 | 17,109 | 8,446 | 49.4 | 1,405 | 670 | 209.7 |
| lv | 635 | 3,887 | 1,898 | 48.8 | 394 | 156 | 252.6 |
| et | 1,841 | 12,718 | 6,210 | 48.8 | 1,192 | 400 | 298.0 |
| en | 38,220 | 208,926 | 100,804 | 48.2 | 20,381 | 9,947 | 204.9 |
| de | 5,425 | 26,889 | 12,866 | 47.8 | 2,995 | 1,456 | 205.7 |
| az | 487 | 2,855 | 1,305 | 45.7 | 286 | 114 | 250.9 |
| tr | 5,748 | 31,422 | 13,490 | 42.9 | 3,218 | 1,229 | 261.8 |
| fi | 48,078 | 217,277 | 74,618 | 34.3 | 31,077 | 11,211 | 277.2 |
| sr | 1,848 | 8,875 | 2,857 | 32.2 | 1,094 | 473 | 231.3 |
| bg | 4,289 | 17,581 | 5,275 | 30.0 | 2,614 | 878 | 297.7 |
