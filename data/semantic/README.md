# Semantic Explorer — data directory

Generated data files for the Semantic Explorer game mode (`pages/[lang]/semantic.vue`).

All `.json` files in this directory are gitignored. Regenerate with:

```bash
uv run python -m scripts.semantic.generate --vocab-size 10000
```

Cost: ~$0.02 one-time (OpenAI `text-embedding-3-small` @ 512 dims × ~10k words).

## Files

- `embeddings.json` — vocabulary words + their 512-dim L2-normalized embeddings
- `axes.json` — 20 anchor-defined semantic axis vectors + coherence AUC scores + projection percentile ranges
- `umap.json` — precomputed 2D UMAP coordinates per word, normalized to [0, 1]
- `targets.json` — hand-picked target word pool for daily games
- `vocabulary.json` — flat list of all valid guess words
