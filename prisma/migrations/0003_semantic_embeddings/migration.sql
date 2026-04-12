-- Phase 2: Semantic embeddings (pgvector)
-- Replaces in-memory Float32Array embedding matrix (~98-230MB per language)

-- Enable pgvector extension (available on Render Postgres paid plans)
CREATE EXTENSION IF NOT EXISTS vector SCHEMA public;

-- Word embedding vectors for semantic similarity search
CREATE TABLE wordle.word_embeddings (
    id        SERIAL PRIMARY KEY,
    lang      TEXT NOT NULL DEFAULT 'en',
    word      TEXT NOT NULL,
    embedding vector(512) NOT NULL,
    umap_x    DOUBLE PRECISION,
    umap_y    DOUBLE PRECISION,
    pca2d_x   DOUBLE PRECISION,
    pca2d_y   DOUBLE PRECISION,
    is_target BOOLEAN NOT NULL DEFAULT FALSE,
    is_vocab  BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE UNIQUE INDEX word_embeddings_lang_word_key ON wordle.word_embeddings(lang, word);
CREATE INDEX word_embeddings_lang_target_idx ON wordle.word_embeddings(lang, is_target);

-- HNSW index for approximate nearest neighbor search (cosine distance)
-- m=16, ef_construction=64 is a good balance for 50k vectors
CREATE INDEX word_embeddings_hnsw_idx
    ON wordle.word_embeddings
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- Named semantic axes with directional vectors for compass hints
CREATE TABLE wordle.semantic_axes (
    id          SERIAL PRIMARY KEY,
    lang        TEXT NOT NULL DEFAULT 'en',
    name        TEXT NOT NULL,
    low_anchor  TEXT NOT NULL,
    high_anchor TEXT NOT NULL,
    vector      vector(512) NOT NULL,
    auc         DOUBLE PRECISION DEFAULT 0,
    range_p5    DOUBLE PRECISION,
    range_p95   DOUBLE PRECISION
);
CREATE UNIQUE INDEX semantic_axes_lang_name_key ON wordle.semantic_axes(lang, name);

-- Precomputed neighbor rankings for fast rank lookup during gameplay.
-- Top 5k neighbors per target word (879 targets × 5k = ~4.4M rows).
-- Replaces the runtime O(N) cosine sort that was cached in _targetCosineCache.
CREATE TABLE wordle.target_neighbors (
    target_word TEXT NOT NULL,
    lang        TEXT NOT NULL DEFAULT 'en',
    word        TEXT NOT NULL,
    rank        INTEGER NOT NULL,
    cosine      REAL NOT NULL,
    PRIMARY KEY (lang, target_word, word)
);
CREATE INDEX target_neighbors_lookup_idx ON wordle.target_neighbors(lang, target_word, rank);
