# Word Data Architecture

> Status: IMPLEMENTED (words.json per language, pipeline reads/writes JSON directly)
> Date: 2026-03-15
> Context: PR #149 (language expansion), Issue #157 (sub-component tiles), Nuxt migration

## Problem

The current per-language data is spread across up to 9 files with implicit relationships:

```
{lang}_5words.txt           ← main word list (community-contributed source of truth)
{lang}_5words_supplement.txt ← auto-generated additional valid guesses
{lang}_daily_words.txt       ← auto-generated subset for daily selection
{lang}_blocklist.txt         ← words excluded from daily selection
{lang}_curated_schedule.txt  ← hand-picked daily words for specific dates
{lang}_characters.txt        ← derivable from word list
{lang}_keyboard.json         ← keyboard layout(s)
language_config.json         ← UI translations + script normalization + display settings
{lang}_word_history.txt      ← frozen past daily words
```

Problems:
- A word's status is scattered across 4+ files (5words, supplement, daily, blocklist)
- `_characters.txt` is fully derivable — redundant
- `language_config.json` mixes UI text, script config, and game settings
- Naming is hardcoded to 5 letters — can't scale to 4/6/7/8/9/10-letter modes
- No per-word metadata (frequency, difficulty, LLM classification, source)
- Adding a new game mode (phrase-of-the-day, multi-board) requires new file types

## Decision: Single JSON per language

### File structure

```
{lang}/
├── words.json           ← ALL words, all lengths, fully scored + classified (pipeline output)
├── contribute/
│   ├── words.txt        ← community word submissions (plain text, one per line)
│   └── overrides.json   ← community corrections (tier overrides, flags)
├── keyboard.json        ← keyboard layout(s) (manually maintained)
└── language_config.json ← UI translations + script normalization (manually maintained)
```

### Why JSON

- **~50x faster** to parse than YAML (critical for 78 languages, 104MB total)
- **No compile step** needed — `words.json` is both source of truth and runtime format
- **Standard**: no extra dependency (pyyaml removed)
- **Readable**: `indent=2, ensure_ascii=False` for clean diffs
- Pipeline reads and writes `words.json` directly

## words.json schema

```json
{
  "metadata": {
    "language_code": "ko",
    "language_name": "Korean",
    "last_pipeline_run": "2026-03-14T12:00:00Z",
    "sources": [
      {"name": "jmdict", "type": "dictionary", "version": "3.6.2"},
      {"name": "wordfreq", "type": "frequency", "version": "3.1"}
    ]
  },
  "words": [
    {
      "word": "정보",
      "length": 2,
      "tier": "daily",
      "frequency": 4.2,
      "sources": ["jmdict", "wordfreq"],
      "llm": {
        "tier": "daily",
        "confidence": 5,
        "reason": "common noun: information"
      },
      "reviewed": true
    },
    {
      "word": "나쁜말",
      "length": 3,
      "tier": "blocked",
      "frequency": 3.1,
      "sources": ["jmdict"],
      "flags": {"phrase": true},
      "llm": {
        "tier": "reject",
        "confidence": 5,
        "reason": "phrase: for many days"
      }
    }
  ]
}
```

Sparse format: fields with default values (empty lists, false bools, null) are omitted.

### Field definitions

| Field | Type | Required | Description |
|---|---|---|---|
| `word` | string | yes | The word itself |
| `length` | int | yes | Character count (grapheme-aware for Indic scripts) |
| `tier` | enum | yes | `daily` (puzzle answer), `valid` (guess only), `blocked` (excluded from daily) |
| `frequency` | float | yes | Zipf frequency score (0-7). Primary ranking signal. |
| `difficulty` | float | no | 0.0-1.0. Computed from frequency + letter rarity + LLM adjustment. |
| `sources` | list | yes | Which data sources this word came from |
| `flags` | object | no | Boolean properties explaining why a word might not be daily-quality |
| `llm` | object | no | LLM curation results (tier, confidence, reason, definitions) |
| `reviewed` | bool | no | Human review flag. If true, pipeline preserves this word's tier. |

### Tier definitions

| Tier | Can be daily? | Valid guess? | When |
|---|---|---|---|
| `daily` | Yes | Yes | Common, standalone word. Good puzzle answer. |
| `valid` | No | Yes | Real word but not daily-quality (too technical, obscure, compound). |
| `blocked` | No | Yes | Excluded for specific reason (profanity, keyboard limitation, proper noun). |
| `phrase` | Mode-dependent | Mode-dependent | Multi-word entry for phrase-of-the-day mode. |

### How game modes consume this data

| Mode | Filter | Daily pool | Guesses |
|---|---|---|---|
| Classic 5-letter | `length == 5` | `tier == daily` | `tier in (daily, valid, blocked)` |
| Classic 4-letter | `length == 4` | `tier == daily` | same |
| Classic N-letter | `length == N` | `tier == daily` | same |
| Phrase of the day | `flags.phrase == true` | `tier == phrase` | all phrases |
| Unlimited | any length | random from `tier == daily` | all valid |
| Challenge (URL) | any | word from URL | all valid |
| Multi-board (Quordle) | `length == 5` | N words from `tier == daily` | same as classic |

### Pool depth validation

Not every language can support every mode. Before offering a mode, check:
```
pool = words where length == N and tier == daily
if len(pool) < 365:  # less than a year of daily words
    don't offer this mode for this language
```

Example: Hausa has 435 daily 5-letter words → can support classic-5. Can't support classic-5 + quordle simultaneously (needs 4x words/day).

## config.yaml schema

Replaces `language_config.json`. YAML for readability and comments.

```yaml
# Language identity
language_code: ko
name: Korean
name_native: 한국어
timezone: Asia/Seoul

# Script behavior
right_to_left: false
grapheme_mode: false       # true for Devanagari, Bengali, Gurmukhi
hide_diacritic_hints: true # true when diacritic_map is for encoding, not accents

# Character normalization
diacritic_map:
  ㄱ: [ᄀ, ᆨ]  # Compatibility Jamo → Hangul Jamo
  ㄴ: [ᄂ, ᆫ]
  # ...

# Positional forms (Hebrew sofit, Greek final sigma)
final_form_map:
  כ: ך
  מ: ם

# Physical keyboard bypass (IME languages)
physical_key_map:
  KeyQ: ㅂ
  KeyW: ㅈ
  ShiftKeyQ: ㅃ
  # ...

# UI translations
meta:
  locale: ko
  wordle_native: 워들
  title: 일일 단어 게임
  description: ...
  keywords: ...

text:
  share: 공유
  next_word: 다음 단어
  # ...

help:
  title: 게임 방법
  # ...

ui:
  settings: 설정
  dark_mode: 다크 모드
  # ...
```

## contribute/ directory

### contribute/words.txt

Lowest-friction contribution format. One word per line, no metadata.

```
사랑
행복
우정
```

Pipeline picks these up, scores them, and merges into `words.json` with `sources: [community]`. If a word is already in `words.json`, it's skipped. If it's new, pipeline assigns tier, frequency, etc.

### contribute/overrides.json

For corrections that override pipeline decisions:

```yaml
# This word was wrongly classified as a phrase — it's a real compound noun
- word: 밝다
  tier: blocked
  reason: "compound jongseong, not typeable on default keyboard"
  reviewed: true

# This word should be daily — pipeline ranked it too low
- word: 우정
  tier: daily
  reviewed: true
```

The `reviewed: true` flag tells the pipeline not to override this classification.

## Difficulty scoring

Computed from multiple signals:

```python
difficulty = weighted_average(
    (1 - frequency_percentile) * 0.4,   # rare words harder
    unique_letter_ratio * 0.2,           # repeated letters harder
    character_rarity_score * 0.2,        # unusual characters harder
    consonant_cluster_score * 0.1,       # complex combos harder
    llm_adjustment * 0.1,               # LLM can nudge (false friends, archaic, etc.)
)
```

Use cases:
- Post-game WordleBot-style analysis: "This was a hard word (difficulty: 0.82)"
- Mode difficulty settings: easy mode only picks words with difficulty < 0.4
- Balancing daily words: avoid too many hard words in a row

## LLM curation

### Process

For each language with daily words, spawn an LLM agent (Claude Opus 4.6) that:
1. Self-assesses confidence for that language (1-5)
2. Processes words in batches of 50
3. Classifies each as daily/valid/reject with reasoning
4. Optionally generates native + English definitions in same pass

### Output

Stored in `llm` field per word in `words.json`. The `llm.tier` is a recommendation — the pipeline makes the final `tier` decision based on `llm.tier` + `llm.confidence` + `flags`.

Decision logic:
```python
if word.reviewed:
    tier = word.tier  # human override, don't touch
elif word.llm.confidence >= 3 and word.llm.tier == 'reject':
    tier = 'blocked'
elif word.llm.confidence >= 3 and word.llm.tier == 'valid':
    tier = 'valid'
else:
    tier = pipeline_computed_tier  # fall back to frequency + dictionary gate
```

### Cost

~38 languages × 2,000 words × ~20 tokens/word ≈ 1.5M tokens. ~$20-30 one-time with Opus.

## Pipeline stages

```
┌─────────────────────────────────────────────────────────┐
│ Stage 1: SOURCE                                         │
│   Inputs: JMdict, kaikki, Leipzig, FrequencyWords,      │
│           wordfreq, Hunspell, community words.txt       │
│   Output: raw word pool per language (all lengths)       │
└──────────────────────┬──────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────┐
│ Stage 2: NORMALIZE                                      │
│   Character normalization, grapheme-aware length calc,   │
│   dedup, lowercase, encoding fixes                       │
│   Output: clean word pool with length field              │
└──────────────────────┬──────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────┐
│ Stage 3: SCORE                                          │
│   wordfreq (primary) + FrequencyWords (secondary)       │
│   Dictionary verification gate (kaikki/Leipzig/Hunspell) │
│   Output: words with frequency + sources                 │
└──────────────────────┬──────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────┐
│ Stage 4: CURATE                                         │
│   LLM classification (tier + confidence + definitions)   │
│   Profanity/name/foreign detection                       │
│   Apply community overrides                              │
│   Output: words with tier + flags + llm fields           │
└──────────────────────┬──────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────┐
│ Stage 5: FREEZE                                         │
│   Update word_history.jsonl with past daily words        │
│   Lock selections — past words never change              │
└─────────────────────────────────────────────────────────┘
```

## Migration strategy

### Phase 1: Ship PR #149 as-is (NOW)
- Current file structure works
- LLM curation as `_word_scores.jsonl` sidecar (forward-compatible)
- Use scores to filter existing `daily_words.txt`

### Phase 2: YAML migration (with Nuxt refactor)
- Write migration script: existing files + word_scores → words.json
- New pipeline reads/writes YAML
- Nuxt build step compiles YAML → JSON
- One PR per language batch (or big-bang with verification)
- Backward compatibility: if words.json doesn't exist, fall back to old files

### Phase 3: Multi-mode support (after Nuxt)
- Pipeline generates all-length word pools
- Frontend parameterizes word length
- Daily algorithm supports mode + length dimensions
- Only offer modes where pool depth is sufficient

## Languages with special considerations

| Language | Issue | How words.json handles it |
|---|---|---|
| Korean (ko) | Jamo encoding mismatch, compound jongseong keyboard gap | `diacritic_map` in config.yaml, `flags.keyboard_gap: true` on blocked words |
| Hindi (hi) | Grapheme mode, only 15 daily words from pipeline | LLM curation bypasses broken dictionary gate, scores full word list directly |
| Bengali (bn) | Grapheme mode, particle noise (~6%) | LLM classifies particle expressions as `tier: blocked` |
| Japanese (ja) | Hiragana-only, phrase fragments (~7%), needs JMdict source | LLM filters expressions, `sources: [jmdict]` tracks provenance |
| German (de) | ß diacritic, broken multi-char mapping fixed | `diacritic_map: {s: [ß]}` in config.yaml |
| French (fr) | œ/æ diacritic, same multi-char fix | `diacritic_map: {o: [ô, œ], a: [à, â, æ]}` |
| Hausa (ha) | Small dictionary (435 daily words) | Pool depth check prevents offering modes it can't support |
| Yoruba (yo) | Small dictionary (896 daily words), tone marks | Same pool depth check |
| Hebrew (he) | RTL, sofit final forms, large word list (64K) | `final_form_map` in config.yaml |
| Arabic (ar) | RTL, character difficulty filtering | Rare char filter encoded as `flags` |
| Finnish (fi) | Pre-curated, excluded from pipeline | `reviewed: true` on all words, pipeline skips |
| English (en) | Pre-curated, high quality baseline | Same as Finnish |

## Sub-component tile coloring (Issue #157)

The words.json schema is forward-compatible with the future sub-component tile system:

```yaml
- word: 한
  length: 1              # 1 syllable block
  components: [ㅎ, ㅏ, ㄴ]  # sub-components for per-jamo coloring
```

The `components` field would only be populated for composition-based scripts (Korean syllable blocks, Tamil aksharas, Hindi aksharas). Latin/Cyrillic/Arabic words would have `components: null` (each character is its own component).

This is a future addition — not needed for the initial YAML migration.

## Open questions

1. **Word history format**: Keep as flat text files (simple) or migrate to JSONL (supports mode + length dimensions)?
2. **Curated schedule**: Keep as a separate concept or fold into words.json with a `scheduled_day` field?
3. **Definition caching**: Currently a separate disk cache system. Should definitions live in words.json or stay separate? (words.json would get very large with definitions for 50K+ words)
4. **Keyboard config**: Keep as JSON or migrate to YAML? JSON is what the frontend expects directly.
