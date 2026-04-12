-- Phase 1: Cache tables (replacing disk-based JSON files)
-- No pgvector dependency — these are plain relational tables.

-- LLM-generated word definitions
CREATE TABLE wordle.definitions (
    id                SERIAL PRIMARY KEY,
    lang              TEXT NOT NULL,
    word              TEXT NOT NULL,
    definition        TEXT,
    definition_native TEXT,
    definition_en     TEXT,
    part_of_speech    TEXT,
    confidence        DOUBLE PRECISION,
    source            TEXT,
    url               TEXT,
    is_negative       BOOLEAN NOT NULL DEFAULT FALSE,
    cached_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX definitions_lang_word_key ON wordle.definitions(lang, word);

-- Per-day community stats (atomic increments via SQL, no lockfile needed)
CREATE TABLE wordle.word_stats (
    id      SERIAL PRIMARY KEY,
    lang    TEXT NOT NULL,
    day_idx INTEGER NOT NULL,
    total   INTEGER NOT NULL DEFAULT 0,
    wins    INTEGER NOT NULL DEFAULT 0,
    losses  INTEGER NOT NULL DEFAULT 0,
    dist_1  INTEGER NOT NULL DEFAULT 0,
    dist_2  INTEGER NOT NULL DEFAULT 0,
    dist_3  INTEGER NOT NULL DEFAULT 0,
    dist_4  INTEGER NOT NULL DEFAULT 0,
    dist_5  INTEGER NOT NULL DEFAULT 0,
    dist_6  INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX word_stats_lang_day_idx_key ON wordle.word_stats(lang, day_idx);

-- Wiktionary existence probe cache
CREATE TABLE wordle.wiktionary_cache (
    id         SERIAL PRIMARY KEY,
    lang       TEXT NOT NULL,
    word       TEXT NOT NULL,
    "exists"   BOOLEAN NOT NULL,
    checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX wiktionary_cache_lang_word_key ON wordle.wiktionary_cache(lang, word);

-- LLM-generated semantic game hints
CREATE TABLE wordle.semantic_hints (
    id        SERIAL PRIMARY KEY,
    lang      TEXT NOT NULL DEFAULT 'en',
    word      TEXT NOT NULL,
    hint      TEXT NOT NULL,
    model     TEXT,
    cached_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX semantic_hints_lang_word_key ON wordle.semantic_hints(lang, word);
