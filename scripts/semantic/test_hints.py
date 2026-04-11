#!/usr/bin/env python3
"""End-to-end hint sanity test for Semantic Explorer.

Loads the current axes.json + embeddings.json, runs the Gram-Schmidt pair
selector against a set of (target, guess) pairs, and prints the generated
hints so a human can eyeball whether they make sense.

This mirrors the scoring that server/utils/semantic.ts::computeCompass will
use at runtime. Keeping the two implementations in lockstep is what lets us
trust the offline validation.

Scoring (matches server/utils/semantic.ts::computeCompass):
    r = target - guess                       # travel direction in embedding space
    score(a) = (a · r)² / ‖r‖²                # fraction of r this axis captures
    a1 = argmax score
    r' = r - (a1 · r) a1                     # residual after accounting for a1
    a2 = argmax (a_perp · r')²  (over a != a1) # Gram-Schmidt residual pick

Signal floors:
    - ‖r‖² < 0.09            → status='close', no hints (pair too similar)
    - a1.explained < 0.04    → status='close', no hints (no signal)
    - only a1 picked and total < 0.10 → status='close' (one-axis floor)

Only axes with coherence_auc >= 0.80 are eligible (matches runtime filter).

Usage:
    uv run python -m scripts.semantic.test_hints
    uv run python -m scripts.semantic.test_hints --pairs custom_pairs.json
    uv run python -m scripts.semantic.test_hints --out report.md
"""

import argparse
import json
import os
import sys
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from dotenv import load_dotenv
from openai import OpenAI

SCRIPT_DIR = Path(__file__).parent
REPO_ROOT = SCRIPT_DIR.parent.parent
DATA_DIR = REPO_ROOT / "data" / "semantic"
EMBEDDINGS_FILE = DATA_DIR / "embeddings.json"
AXES_FILE = DATA_DIR / "axes.json"
DEFAULT_REPORT = SCRIPT_DIR / "hint_sanity_report.md"

EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_DIMS = 512
MIN_AUC = 0.80

# (target, guess) pairs spanning diverse semantic distances + categories.
# Feel free to edit; the script reads this list if no --pairs file is given.
DEFAULT_PAIRS: list[tuple[str, str]] = [
    # Obvious directions — should pick clean axes
    ("whale", "mouse"),  # size: much bigger
    ("whale", "shark"),  # closer, maybe habitat/predator
    ("fire", "ice"),  # opposite temperature
    ("diamond", "pebble"),  # value + hardness
    ("forest", "desert"),  # wetness + life density
    # Subtler shifts
    ("cathedral", "hut"),  # formality, scale, grandeur
    ("laptop", "abacus"),  # age, complexity
    ("tiger", "kitten"),  # size + danger
    ("hurricane", "breeze"),  # intensity
    ("justice", "freedom"),  # both abstract, both positive — hard case
    # Close neighbours
    ("piano", "guitar"),  # both instruments
    ("doctor", "nurse"),  # both medical
    ("river", "lake"),  # both water
    # Cross-category jumps
    ("velvet", "sandpaper"),  # texture
    ("library", "stadium"),  # loudness, formality
    ("snail", "cheetah"),  # speed
    ("whisper", "scream"),  # loudness
    ("honey", "vinegar"),  # taste
    ("baby", "corpse"),  # alive
    ("mansion", "tent"),  # permanence, luxury
]


@dataclass
class Axis:
    name: str
    low: str
    high: str
    vector: np.ndarray  # unit-length
    auc: float


def load_axes() -> list[Axis]:
    with open(AXES_FILE, encoding="utf-8") as f:
        data = json.load(f)
    axes: list[Axis] = []
    for name, rec in data["axes"].items():
        auc = float(data.get("coherence_auc", {}).get(name, 1.0))
        if auc < MIN_AUC:
            continue
        vec = np.asarray(rec["vector"], dtype=np.float32)
        axes.append(
            Axis(name=name, low=rec["low_anchor"], high=rec["high_anchor"], vector=vec, auc=auc)
        )
    return axes


def load_embeddings() -> dict[str, np.ndarray]:
    with open(EMBEDDINGS_FILE, encoding="utf-8") as f:
        data = json.load(f)
    matrix = np.asarray(data["vectors"], dtype=np.float32)
    return {w: matrix[i] for i, w in enumerate(data["words"])}


def fetch_embeddings_ondemand(words: list[str]) -> dict[str, np.ndarray]:
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY not set")
    client = OpenAI(api_key=api_key)
    resp = client.embeddings.create(model=EMBEDDING_MODEL, input=words, dimensions=EMBEDDING_DIMS)
    out: dict[str, np.ndarray] = {}
    for item in resp.data:
        vec = np.asarray(item.embedding, dtype=np.float32)
        n = float(np.linalg.norm(vec))
        if n > 0:
            vec /= n
        out[words[item.index]] = vec
    return out


COMPASS_MIN_R_NORM_SQ = 0.09
COMPASS_PER_AXIS_FLOOR = 0.02
COMPASS_PAIR_FLOOR = 0.05


@dataclass
class SelectionResult:
    status: str  # 'ok' | 'close'
    hints: list[tuple[Axis, float, float]]  # (axis, signed delta, explained)
    total_explained: float


def select_hints(
    target_vec: np.ndarray, guess_vec: np.ndarray, axes: list[Axis]
) -> SelectionResult:
    """Iterative Gram-Schmidt matching pursuit with signal floors.

    Mirrors server/utils/semantic.ts::computeCompass exactly so this script
    can act as a ground-truth sanity check for what the game will actually
    show.
    """
    r = target_vec - guess_vec
    r_norm_sq = float(np.dot(r, r))

    if r_norm_sq < COMPASS_MIN_R_NORM_SQ:
        return SelectionResult(status="close", hints=[], total_explained=0.0)

    # Score every axis independently
    scored = []
    for a in axes:
        delta = float(np.dot(a.vector, r))
        explained = (delta * delta) / r_norm_sq
        scored.append((a, delta, explained))

    # Iterative matching pursuit. Keep an orthonormal basis built from
    # Gram-Schmidt'd previously picked axes.
    picked: list[tuple[Axis, float, float]] = []  # (axis, delta, explained)
    basis: list[np.ndarray] = []
    basis_dot_r: list[float] = []
    total_explained = 0.0

    for iteration in range(2):  # top 2 for sanity test
        best = None
        for a, delta, expl in scored:
            if any(p[0].name == a.name for p in picked):
                continue
            # (a · basis_i) dot products
            dots = np.array([float(np.dot(a.vector, b)) for b in basis])
            sum_basis_proj = float(np.dot(dots, np.array(basis_dot_r))) if len(basis) else 0.0
            a_perp_dot_r = delta - sum_basis_proj
            a_perp_norm_sq = 1.0 - float(np.dot(dots, dots)) if len(basis) else 1.0
            if a_perp_norm_sq < 1e-9:
                continue
            orth_explained = (a_perp_dot_r * a_perp_dot_r) / (a_perp_norm_sq * r_norm_sq)
            if best is None or orth_explained > best[3]:
                best = (a, delta, expl, orth_explained, dots, a_perp_dot_r, a_perp_norm_sq)

        if best is None:
            break

        a, delta, expl, orth_explained, dots, a_perp_dot_r, a_perp_norm_sq = best

        # Per-axis floor
        if iteration == 0 and orth_explained < COMPASS_PER_AXIS_FLOOR:
            return SelectionResult(status="close", hints=[], total_explained=0.0)
        if orth_explained < COMPASS_PER_AXIS_FLOOR:
            break

        picked.append((a, delta, expl))
        total_explained += orth_explained

        # Extend the basis with this axis orthogonalized + normalized
        new_basis = a.vector.copy()
        for i, b in enumerate(basis):
            new_basis = new_basis - float(dots[i]) * b
        norm = float(np.linalg.norm(new_basis))
        if norm < 1e-6:
            break
        new_basis = new_basis / norm
        basis.append(new_basis)
        basis_dot_r.append(a_perp_dot_r / np.sqrt(a_perp_norm_sq))

    # Pair-level floor: one axis alone must clear the pair floor
    if len(picked) == 1 and total_explained < COMPASS_PAIR_FLOOR:
        return SelectionResult(status="close", hints=[], total_explained=total_explained)

    if not picked:
        return SelectionResult(status="close", hints=[], total_explained=0.0)

    return SelectionResult(status="ok", hints=picked, total_explained=total_explained)


def magnitude_tier(delta: float, r_norm: float) -> str:
    """Map |delta|/‖r‖ to a prose tier."""
    if r_norm < 1e-6:
        return ""
    ratio = abs(delta) / r_norm
    if ratio < 0.25:
        return "slightly"
    if ratio < 0.45:
        return ""  # plain "more like X"
    return "much"


def format_hint(axis: Axis, delta: float, r_norm: float) -> str:
    """Produce the user-facing prose for one hint row."""
    tier = magnitude_tier(delta, r_norm)
    if delta >= 0:
        anchor_word = axis.high
        other = axis.low
    else:
        anchor_word = axis.low
        other = axis.high
    qualifier = f"{tier} " if tier else ""
    return f"Target is {qualifier}more like *{anchor_word}* than *{other}*  ({axis.name})"


def explained_fraction(r: np.ndarray, a1: Axis, a2: Axis) -> float:
    """Fraction of ‖r‖² captured by the 2D subspace span(a1, a2)."""
    r_norm_sq = float(np.dot(r, r))
    if r_norm_sq < 1e-12:
        return 0.0
    # Gram-Schmidt orthogonalize a2 against a1, then sum squared projections
    c = float(np.dot(a1.vector, a2.vector))
    b_perp = a2.vector - c * a1.vector
    b_norm = float(np.linalg.norm(b_perp))
    if b_norm < 1e-9:
        # a2 is parallel to a1 — only one direction of info
        return (float(np.dot(a1.vector, r)) ** 2) / r_norm_sq
    b_perp_unit = b_perp / b_norm
    proj1 = float(np.dot(a1.vector, r))
    proj2 = float(np.dot(b_perp_unit, r))
    return (proj1 * proj1 + proj2 * proj2) / r_norm_sq


def main() -> int:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument(
        "--pairs", type=Path, help="JSON file with custom [[target,guess], ...] pairs"
    )
    parser.add_argument("--out", type=Path, default=DEFAULT_REPORT, help="Markdown report output")
    args = parser.parse_args()

    load_dotenv(REPO_ROOT / ".env")

    print("Loading axes...")
    axes = load_axes()
    print(f"  {len(axes)} axes with AUC >= {MIN_AUC}")
    if len(axes) < 2:
        print("ERROR: fewer than 2 usable axes", file=sys.stderr)
        return 1

    print("Loading embeddings...")
    word_to_vec = load_embeddings()

    pairs = [tuple(p) for p in json.loads(args.pairs.read_text())] if args.pairs else DEFAULT_PAIRS

    # Fetch any missing word embeddings on demand
    needed = sorted({w for pair in pairs for w in pair})
    missing = [w for w in needed if w not in word_to_vec]
    if missing:
        print(f"Fetching {len(missing)} missing word embeddings...")
        word_to_vec.update(fetch_embeddings_ondemand(missing))

    lines: list[str] = []
    lines.append("# Semantic Explorer — Hint Sanity Report\n")
    lines.append(f"Axes available: **{len(axes)}** (AUC filter >= {MIN_AUC})  ")
    lines.append("Selector: Gram-Schmidt residual, (a·r)² scoring in raw embedding space  \n")
    lines.append(
        "For each (target, guess) pair: the 2 axes chosen + the prose that would be shown. "
    )
    lines.append(
        "`explained` = fraction of `target − guess` captured by the 2D subspace (higher = more informative pair).\n\n"
    )
    lines.append("---\n\n")

    ok_count = 0
    close_count = 0
    for target, guess in pairs:
        tv = word_to_vec.get(target)
        gv = word_to_vec.get(guess)
        if tv is None or gv is None:
            lines.append(f"## {target} ← {guess}\n\n*missing embedding, skipped*\n\n")
            continue
        r = tv - gv
        r_norm = float(np.linalg.norm(r))
        result = select_hints(tv, gv, axes)

        lines.append(f"## Target: **{target}** · Guess: *{guess}*\n\n")

        if result.status == "close":
            close_count += 1
            lines.append(
                f"- `‖target − guess‖ = {r_norm:.3f}`  ·  **status: close** "
                f"(total explained = {result.total_explained * 100:.1f}%)\n"
            )
            lines.append('- *fallback: "you\'re in the neighbourhood"*\n\n')
            continue

        ok_count += 1
        lines.append(
            f"- `‖target − guess‖ = {r_norm:.3f}`  ·  "
            f"`explained = {result.total_explained * 100:.1f}%`\n"
        )
        for axis, delta, _expl in result.hints:
            lines.append(f"- {format_hint(axis, delta, r_norm)}\n")
        lines.append("\n")

    lines.insert(
        5,
        f"\n**{ok_count} pairs got hints, {close_count} fell back to 'close'**\n\n",
    )

    report = "".join(lines)
    args.out.write_text(report)
    print(f"\nWrote {args.out} ({len(pairs)} pairs)")
    print("\n" + "=" * 60)
    print(report)
    return 0


if __name__ == "__main__":
    sys.exit(main())
