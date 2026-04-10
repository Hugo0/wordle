#!/usr/bin/env python3
"""Generate PCA 2D projection from existing embeddings.

PCA preserves global distance structure (cosine-close words → visually
close in 2D) at the cost of less dramatic cluster separation compared
to UMAP. Better for gameplay where "closer = higher rank" needs to hold
visually.

Usage:
    uv run python -m scripts.semantic.generate_pca2d

Reads:  data/semantic/embeddings.json
Writes: data/semantic/pca2d.json (same format as umap.json)

The existing umap.json is NOT touched — both files coexist. The server
loads pca2d.json by default (with umap.json as fallback) so switching
projections is just a file rename.
"""

import json
import sys
from pathlib import Path

import numpy as np
from sklearn.decomposition import PCA

DATA_DIR = Path(__file__).parent.parent.parent / "data" / "semantic"


def main() -> int:
    emb_path = DATA_DIR / "embeddings.json"
    if not emb_path.exists():
        print(f"ERROR: {emb_path} not found", file=sys.stderr)
        return 1

    print("Loading embeddings...")
    emb = json.loads(emb_path.read_text())
    words = emb["words"]
    matrix = np.array(emb["vectors"], dtype=np.float32)
    print(f"  {len(words)} words, {matrix.shape[1]} dims")

    print("Running PCA (2 components)...")
    pca = PCA(n_components=2)
    coords = pca.fit_transform(matrix)
    ev = pca.explained_variance_ratio_
    print(f"  PC1: {ev[0]:.1%}, PC2: {ev[1]:.1%}, total: {sum(ev):.1%}")

    # Normalize to [0, 1] — same range as umap.json so the rendering
    # code doesn't need to know which projection it's using.
    mins = coords.min(axis=0)
    maxs = coords.max(axis=0)
    ranges = maxs - mins
    ranges[ranges < 1e-9] = 1.0
    coords_norm = (coords - mins) / ranges

    out = {
        "version": 1,
        "method": "pca",
        "explained_variance_ratio": ev.tolist(),
        "coordinates": {
            word: [round(float(coords_norm[i, 0]), 4), round(float(coords_norm[i, 1]), 4)]
            for i, word in enumerate(words)
        },
    }

    out_path = DATA_DIR / "pca2d.json"
    out_path.write_text(json.dumps(out))
    size_kb = out_path.stat().st_size // 1024
    print(f"\nWrote {out_path} ({size_kb} KB, {len(words)} words)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
