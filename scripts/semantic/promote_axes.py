#!/usr/bin/env python3
"""Promote discovered axes from axis_selected.json into production axes.json.

find_axes.py writes scripts/semantic/axis_selected.json (a ranked + validated
list of anchor pairs) but does not touch production data. This script reads
that file, rebuilds axis vectors from the cached embeddings (fetching any
missing anchors from OpenAI on-demand), recomputes p5/p95 projection ranges
over the full vocab, and overwrites data/semantic/axes.json in the format
the runtime expects.

Does NOT touch embeddings.json, umap.json, targets.json, or clusters.json —
those are unchanged by an axis swap. Takes <5 seconds + any missing anchor
fetches (~$0.0001 each).

Usage:
    uv run python -m scripts.semantic.promote_axes
    uv run python -m scripts.semantic.promote_axes --dry-run
    uv run python -m scripts.semantic.promote_axes --from other_selected.json
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path

import numpy as np
from dotenv import load_dotenv
from openai import OpenAI

SCRIPT_DIR = Path(__file__).parent
REPO_ROOT = SCRIPT_DIR.parent.parent
DATA_DIR = REPO_ROOT / "data" / "semantic"
EMBEDDINGS_FILE = DATA_DIR / "embeddings.json"
AXES_FILE = DATA_DIR / "axes.json"
DEFAULT_SELECTED = SCRIPT_DIR / "axis_selected.json"

EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_DIMS = 512


def load_embeddings() -> tuple[list[str], np.ndarray, dict[str, np.ndarray]]:
    with open(EMBEDDINGS_FILE, encoding="utf-8") as f:
        data = json.load(f)
    words = data["words"]
    matrix = np.asarray(data["vectors"], dtype=np.float32)
    word_to_vec = {w: matrix[i] for i, w in enumerate(words)}
    return words, matrix, word_to_vec


def fetch_missing(
    client: OpenAI, needed: list[str], cache: dict[str, np.ndarray]
) -> dict[str, np.ndarray]:
    """Fetch anchors not already in the embedding cache. L2-normalizes."""
    missing = sorted({w for w in needed if w not in cache})
    if not missing:
        return cache
    print(f"Fetching {len(missing)} missing anchor embeddings...")
    for i in range(0, len(missing), 200):
        batch = missing[i : i + 200]
        for attempt in range(3):
            try:
                resp = client.embeddings.create(
                    model=EMBEDDING_MODEL, input=batch, dimensions=EMBEDDING_DIMS
                )
                break
            except Exception as e:
                if attempt == 2:
                    raise
                print(f"  retry {attempt + 1}: {e}", file=sys.stderr)
                time.sleep(2 * (attempt + 1))
        for item in sorted(resp.data, key=lambda d: d.index):
            vec = np.asarray(item.embedding, dtype=np.float32)
            n = float(np.linalg.norm(vec))
            if n > 0:
                vec /= n
            cache[batch[item.index]] = vec
    return cache


def main() -> int:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument(
        "--from",
        dest="source",
        type=Path,
        default=DEFAULT_SELECTED,
        help="Source selected-axes JSON (default: axis_selected.json)",
    )
    parser.add_argument("--dry-run", action="store_true", help="Print plan, don't write axes.json")
    parser.add_argument(
        "--min-auc",
        type=float,
        default=0.80,
        help="Drop axes whose discovered AUC is below this (default: 0.80 to match runtime filter)",
    )
    args = parser.parse_args()

    load_dotenv(REPO_ROOT / ".env")

    if not args.source.exists():
        print(f"ERROR: {args.source} not found. Run find_axes.py first.", file=sys.stderr)
        return 1

    with open(args.source, encoding="utf-8") as f:
        selected = json.load(f)
    accepted: list[dict] = selected.get("accepted", [])
    if not accepted:
        print("ERROR: no accepted axes in source file", file=sys.stderr)
        return 1

    # AUC floor — matches runtime filter in computeCompass (< 0.80 → excluded)
    filtered = [a for a in accepted if a.get("auc", 0.0) >= args.min_auc]
    dropped = len(accepted) - len(filtered)
    if dropped:
        print(f"Dropping {dropped} axes with AUC < {args.min_auc}")
    accepted = filtered

    print(f"Promoting {len(accepted)} axes from {args.source.name}")
    print(f"  max pairwise |cos|: {selected.get('max_pairwise_cos', '?'):.3f}")
    print(f"  mean pairwise |cos|: {selected.get('mean_pairwise_cos', '?'):.3f}")

    print("\nLoading embeddings...")
    words, matrix, word_to_vec = load_embeddings()
    print(f"  {len(words)} vocab words, dim={matrix.shape[1]}")

    # Collect all anchor words
    anchors_needed: set[str] = set()
    for a in accepted:
        anchors_needed.add(a["low"])
        anchors_needed.add(a["high"])
    missing = sorted(anchors_needed - set(words))
    if missing:
        print(
            f"  {len(missing)} anchor(s) not in embedding cache: {', '.join(missing[:5])}"
            + (" ..." if len(missing) > 5 else "")
        )

    if args.dry_run:
        print("\n[dry run] Would fetch missing anchors + write axes.json")
        for a in accepted:
            print(f"  {a['name']:<20s} {a['low']:>14s} ↔ {a['high']:<14s}  auc={a['auc']:.2f}")
        return 0

    api_key = os.environ.get("OPENAI_API_KEY")
    if missing:
        if not api_key:
            print("ERROR: OPENAI_API_KEY not set and anchors missing", file=sys.stderr)
            return 1
        client = OpenAI(api_key=api_key)
        word_to_vec = fetch_missing(client, sorted(anchors_needed), word_to_vec)

    # Build axis vectors + AUC + ranges
    print("\nComputing axis vectors and projection ranges...")
    axes_out: dict[str, dict] = {}
    coherence_auc: dict[str, float] = {}
    ranges_out: dict[str, dict] = {}
    skipped: list[str] = []

    for a in accepted:
        name = a["name"]
        low = a["low"]
        high = a["high"]
        if low not in word_to_vec or high not in word_to_vec:
            skipped.append(name)
            continue
        direction = word_to_vec[high] - word_to_vec[low]
        norm = float(np.linalg.norm(direction))
        if norm < 1e-9:
            skipped.append(name)
            continue
        axis_vec = direction / norm

        # Project full vocab → p5/p95
        projections = matrix @ axis_vec
        p5 = float(np.percentile(projections, 5))
        p95 = float(np.percentile(projections, 95))

        axes_out[name] = {
            "low_anchor": low,
            "high_anchor": high,
            "vector": axis_vec.astype(np.float32).tolist(),
        }
        coherence_auc[name] = float(a.get("auc", 1.0))
        ranges_out[name] = {"p5": p5, "p95": p95}

    if skipped:
        print(f"  skipped {len(skipped)}: {', '.join(skipped)}")

    print(f"  wrote {len(axes_out)} axes")

    # Backup existing axes.json before overwrite
    if AXES_FILE.exists():
        backup = AXES_FILE.with_suffix(".json.bak")
        backup.write_text(AXES_FILE.read_text())
        print(f"  backed up previous axes.json → {backup.name}")

    with open(AXES_FILE, "w") as f:
        json.dump(
            {
                "version": 2,
                "axes": axes_out,
                "coherence_auc": coherence_auc,
                "ranges": ranges_out,
                "source": args.source.name,
            },
            f,
            indent=2,
        )
    size_kb = AXES_FILE.stat().st_size // 1024
    print(f"\nDone. {AXES_FILE} ({size_kb} KB, {len(axes_out)} axes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
