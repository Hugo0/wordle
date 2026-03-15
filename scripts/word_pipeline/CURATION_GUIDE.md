# Word Curation Guide

Reference for Claude Code sub-agents curating words.json files.

## What makes a good daily word

A good Wordle daily word is:
- A standalone, common word that native speakers would recognize
- Not a proper noun, abbreviation, or loanword from another language
- Not offensive, vulgar, or controversial
- Not a phrase, expression, or multi-word compound
- Not overly technical or domain-specific
- In its base/dictionary form (not an obscure conjugation)

## Tiers

- **daily**: Good puzzle answer — common, standalone, recognizable. Target: 1500-2000 per language.
- **valid**: Real word but not daily-quality (too obscure, technical, archaic, compound). Players can guess these but they won't be daily answers.
- **blocked**: Not a real standalone word (phrase fragment, expression, foreign word, proper noun, profanity).

## How to curate a language

1. Read `data/languages/{lang}/words.json`
2. Check tier distribution: `daily`, `valid`, `blocked` counts
3. If daily < 1500: review `valid` words and promote the best to `daily`
4. If daily > 4000: review `daily` words and demote obscure ones to `valid`
5. Review `daily` words for quality — block profanity, proper nouns, phrases
6. Write back the modified words.json

## words.json format

```json
{
  "metadata": { "language_code": "fr", "language_name": "French", ... },
  "words": [
    { "word": "amour", "length": 5, "tier": "daily", "frequency": 5.2, ... },
    ...
  ]
}
```

To change a word's tier, just update the `"tier"` field. Fields with default values (empty lists, false bools, null) should be omitted.

## Frequency as a guide

The `frequency` field is a Zipf score (0-7):
- 5-7: Very common ("the", "have") — always daily
- 3.5-5: Common — good daily candidates
- 2-3.5: Less common — borderline, use judgment
- 0-2: Rare — usually valid, not daily

Words with no frequency score (0) are from dictionaries only. Use your language knowledge to judge.

## Script types by language

| Script | Languages |
|---|---|
| Arabic | ar, fa, ur, ckb |
| Hebrew | he |
| Devanagari | hi, mr, ne |
| Bengali | bn |
| Gurmukhi | pa |
| Hiragana | ja |
| Hangul | ko |
| Greek | el |
| Georgian | ka |
| Armenian | hy, hyw |
| Cyrillic | bg, mk, mn, ru, sr, uk |
| Latin | all others |
