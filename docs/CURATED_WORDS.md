# Curated Words Registry

**DO NOT regenerate these word lists from the data pipeline without preserving manual curation.**

This file tracks which languages have been manually curated and should not be overwritten by running `scripts/languages.ipynb`.

## How Curation Works

1. Words are extracted for the next 365 days using the daily word algorithm
2. An LLM or native speaker reviews the words for quality issues
3. Bad words are removed or reordered in the word list
4. The language is marked as "curated" below with the curation date

## Protected Languages

When running the data pipeline, **skip these languages** or merge changes carefully:

| Language | Code | Curated Date | Curator | Notes |
|----------|------|--------------|---------|-------|
| Bulgarian | bg | 2026-01-25 | Claude | Removed 728 proper nouns |
| Turkish | tr | 2026-01-25 | Claude | Removed 21 names/places, blocklist created |
| Hungarian | hu | 2026-01-25 | Claude | Removed 39 names/foreign words, blocklist created |
| Arabic | ar | 2026-02-23 | Script | Char difficulty filter (3%): removed 212 words with rare chars, 1,788 daily words |
| Hebrew | he | 2026-02-23 | Script | Suffix dedup + wordfreq filter: 1,442 blocklist additions, 1,000 daily words (100% wordfreq-verified) |

## Curation Checklist

Before marking a language as curated, verify:

- [ ] Removed proper nouns (names, places, brands)
- [ ] Removed obscure/archaic words
- [ ] Removed offensive words
- [ ] Removed grammatical forms (conjugations, declensions) if not common
- [ ] Removed borrowed words that don't fit the language
- [ ] Verified next 365 words are all reasonable daily words
- [ ] Tests pass: `pytest tests/test_word_lists.py -v -k "{lang}"`

## How to Safely Update a Curated Language

If you need to regenerate a curated language's word list:

1. **Export current curated list**:
   ```bash
   python scripts/curate_words.py backup {lang}
   ```

2. **Run the pipeline** to get new words

3. **Apply blocklist** to remove known bad words:
   ```bash
   python scripts/curate_words.py apply-blocklist {lang}
   ```

4. **Merge carefully**:
   - Keep the curated word order for indices 0 to current_index + 365
   - Append new words that weren't in the old list
   - Remove words that were deliberately deleted

5. **Update this file** with new curation date

## Blocklist Files

Each curated language can have a `{lang}_blocklist.txt` file containing words to automatically exclude.
Format: one word per line, comments start with `#`.

To apply all blocklists after regenerating:
```bash
python scripts/curate_words.py apply-all-blocklists
```

## Word Index Reference

Current word index (Jan 2026): ~1681
- Words 0-1680: Already shown to users
- Words 1681-2046: Next year (must be curated)
- Words 2047+: Future (can be regenerated)
