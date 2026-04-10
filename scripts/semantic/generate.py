#!/usr/bin/env python3
"""Generate embeddings + axes + UMAP coords for the Semantic Explorer game mode.

Usage:
    uv run python -m scripts.semantic.generate
    uv run python -m scripts.semantic.generate --vocab-size 10000 --dry-run
    uv run python -m scripts.semantic.generate --force  # overwrite existing files

Requires OPENAI_API_KEY in .env. One-time cost ~$0.02 for 10000 words at 512 dims.
Outputs JSON files to data/semantic/.
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
from sklearn.metrics import roc_auc_score

SCRIPT_DIR = Path(__file__).parent
REPO_ROOT = SCRIPT_DIR.parent.parent
DATA_DIR = REPO_ROOT / "data" / "semantic"

EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_DIMS = 512
BATCH_SIZE = 256

# Semantic axes — anchor pairs (low → high). Keep anchor words single-token
# common English. Bidirectional names reflect the "high" side. Each axis is
# validated at generation time via an AUC coherence check; if an axis fails,
# it's effectively disabled at runtime (AUC < 0.80 → excluded from compass).
SEMANTIC_AXES: dict[str, dict[str, str]] = {
    # 74 axes selected by scripts/semantic/find_axes.py — greedy orthogonal
    # subset from ~600 candidates (hand-picked + LLM-generated), validated
    # via k-NN bootstrap AUC + LLM-as-judge polysemy check.
    # Max pairwise |cos| = 0.236, mean = 0.073.
    "alertness": {"low": "drowsy", "high": "alert"},
    "alignment": {"low": "askew", "high": "aligned"},
    "authority": {"low": "subordinate", "high": "dominant"},
    "beginning": {"low": "ending", "high": "beginning"},
    "bitterness": {"low": "mild", "high": "bitter"},
    "bravery": {"low": "cowardly", "high": "brave"},
    "certainty": {"low": "doubtful", "high": "certain"},
    "charity": {"low": "selfish", "high": "charitable"},
    "clarity_mind": {"low": "confused", "high": "lucid"},
    "composure": {"low": "shattered", "high": "unbroken"},
    "concreteness": {"low": "abstract", "high": "concrete"},
    "confidence": {"low": "insecure", "high": "confident"},
    "conflict": {"low": "harmony", "high": "conflict"},
    "contact": {"low": "separated", "high": "touching"},
    "cook_level": {"low": "raw", "high": "cooked"},
    "count": {"low": "single", "high": "multiple"},
    "coverage": {"low": "patchy", "high": "complete"},
    "crime": {"low": "lawful", "high": "criminal"},
    "crystal": {"low": "amorphous", "high": "crystalline"},
    "curvature": {"low": "straight", "high": "curved"},
    "dullness": {"low": "razor", "high": "dull"},
    "exposure": {"low": "shielded", "high": "exposed"},
    "fatigue": {"low": "rested", "high": "fatigued"},
    "fear": {"low": "comforting", "high": "scary"},
    "flexibility_mind": {"low": "dogmatic", "high": "flexible"},
    "flow": {"low": "still", "high": "flowing"},
    "followership": {"low": "leader", "high": "follower"},
    "fragrance": {"low": "stinky", "high": "fragrant"},
    "function": {"low": "broken", "high": "working"},
    "gasiness": {"low": "liquid", "high": "gaseous"},
    "glare": {"low": "dusky", "high": "dazzling"},
    "growth": {"low": "stunted", "high": "grown"},
    "handmade": {"low": "manufactured", "high": "handmade"},
    "height": {"low": "short", "high": "tall"},
    "honesty_tone": {"low": "deceptive", "high": "candid"},
    "junkiness": {"low": "healthy", "high": "junk"},
    "lethality": {"low": "benign", "high": "lethal"},
    "locality": {"low": "global", "high": "local"},
    "lock": {"low": "unlocked", "high": "locked"},
    "metallicity": {"low": "wooden", "high": "metallic"},
    "modernity": {"low": "antique", "high": "modern"},
    "morality": {"low": "evil", "high": "good"},
    "mystery": {"low": "obvious", "high": "mysterious"},
    "neatness": {"low": "slovenly", "high": "neat"},
    "neglect": {"low": "maintained", "high": "neglected"},
    "newness": {"low": "old", "high": "new"},
    "openness": {"low": "sealed", "high": "open"},
    "particle": {"low": "fine", "high": "coarse"},
    "pattern": {"low": "random", "high": "patterned"},
    "periodicity": {"low": "irregular", "high": "periodic"},
    "portable": {"low": "immovable", "high": "portable"},
    "pride": {"low": "humble", "high": "proud"},
    "resonant": {"low": "dead", "high": "ringing"},
    "rust": {"low": "pristine", "high": "rusty"},
    "sadness": {"low": "joyful", "high": "mournful"},
    "seniority": {"low": "senior", "high": "junior"},
    "sharpness_point": {"low": "blunt", "high": "spiky"},
    "silence": {"low": "talkative", "high": "silent"},
    "similarity": {"low": "different", "high": "similar"},
    "softness": {"low": "squishy", "high": "rigid"},
    "speed_motion": {"low": "crawling", "high": "racing"},
    "teamwork": {"low": "solo", "high": "team"},
    "temperature_food": {"low": "chilled", "high": "steaming"},
    "tempo": {"low": "leisurely", "high": "hurried"},
    "tenderness": {"low": "tough", "high": "tender"},
    "terrain": {"low": "level", "high": "mountainous"},
    "tone": {"low": "monotone", "high": "sonorous"},
    "turbulence": {"low": "laminar", "high": "turbulent"},
    "urbanity": {"low": "rural", "high": "urban"},
    "value": {"low": "cheap", "high": "precious"},
    "volume_sound": {"low": "whispering", "high": "shouting"},
    "waterness": {"low": "desert", "high": "ocean"},
    "weather": {"low": "sunny", "high": "stormy"},
    "wetness": {"low": "dry", "high": "wet"},
}

# Hand-picked diverse targets across semantic categories. Used as the "daily" pool for PoC.
HAND_PICKED_TARGETS: list[str] = [
    # Everyday objects
    "candle", "lamp", "chair", "mirror", "clock", "pillow", "umbrella", "basket",
    # Food
    "apple", "bread", "honey", "cheese", "pepper", "coffee", "lemon", "chocolate",
    # Nature
    "ocean", "mountain", "forest", "river", "desert", "cloud", "storm", "meadow",
    # Animals
    "tiger", "eagle", "dolphin", "rabbit", "butterfly", "whale", "spider", "horse",
    # Tools/tech
    "hammer", "needle", "camera", "computer", "bicycle", "telescope", "anchor", "compass",
    # Body/emotion
    "heart", "laughter", "sleep", "dream", "anger", "patience", "courage", "fear",
    # Abstract
    "freedom", "justice", "chaos", "silence", "memory", "time",
]


# Coherence tests are no longer hand-curated here. The find_axes.py script
# uses k-NN bootstrap + LLM-as-judge to validate each axis before selection.
# For backward compat with compute_coherence_auc(), we generate test words
# at runtime from the embeddings via the same k-NN approach.
COHERENCE_TESTS: dict[str, dict[str, list[str]]] = {}


# English stopwords + function words to exclude from the PoC vocabulary.
# These words aren't fun game guesses (no semantic content).
STOPWORDS = {
    "the", "to", "and", "of", "a", "in", "i", "is", "for", "that", "you", "it",
    "on", "with", "this", "was", "be", "as", "are", "have", "not", "but", "or",
    "at", "by", "from", "they", "we", "he", "she", "his", "her", "their", "my",
    "your", "our", "its", "them", "me", "us", "an", "had", "has", "were", "been",
    "being", "do", "does", "did", "doing", "will", "would", "should", "could",
    "may", "might", "must", "can", "shall", "what", "which", "who", "whom",
    "whose", "when", "where", "why", "how", "all", "each", "every", "both",
    "few", "more", "most", "other", "some", "such", "no", "nor", "only", "own",
    "same", "so", "than", "too", "very", "just", "also", "out", "up", "down",
    "into", "off", "over", "under", "again", "then", "once", "here", "there",
    "if", "because", "while", "through", "during", "before", "after", "above",
    "below", "between", "about", "against", "any", "one", "two", "three",
    "first", "last", "next", "new", "old", "much", "many", "lot", "back",
    "get", "got", "go", "going", "come", "came", "see", "saw", "know", "knew",
    "think", "thought", "take", "took", "make", "made", "give", "gave", "put",
    "use", "used", "find", "found", "say", "said", "tell", "told", "ask", "asked",
    "mr", "mrs", "ms", "dr", "st", "etc", "ie", "eg", "vs",
    # Generic vague nouns with no distinguishing semantics
    "thing", "things", "way", "ways", "time", "times", "people", "person",
    "something", "someone", "anything", "anyone", "everything", "everyone",
    "nothing", "nobody", "somewhere", "anywhere", "everywhere", "nowhere",
}


def load_vocabulary(vocab_size: int) -> list[str]:
    """Load top English words by frequency via the wordfreq library.

    Filters out stopwords, function words, and very short words. We pull a large
    oversample so that after filtering we still have `vocab_size` real words.
    """
    from wordfreq import top_n_list

    oversample = max(vocab_size * 3, 10000)
    raw = top_n_list("en", oversample, wordlist="best")

    filtered: list[str] = []
    seen: set[str] = set()
    for word in raw:
        w = word.lower().strip()
        if len(w) < 3:
            continue
        if not w.isalpha():
            continue
        if w in STOPWORDS:
            continue
        if w in seen:
            continue
        seen.add(w)
        filtered.append(w)
        if len(filtered) >= vocab_size:
            break
    return filtered


def collect_all_words(vocab_size: int) -> list[str]:
    """Assemble the full word list: vocab + anchors + targets + coherence test words."""
    words = set(load_vocabulary(vocab_size))
    for axis in SEMANTIC_AXES.values():
        words.add(axis["low"])
        words.add(axis["high"])
    words.update(HAND_PICKED_TARGETS)
    for axis_tests in COHERENCE_TESTS.values():
        words.update(axis_tests["low"])
        words.update(axis_tests["high"])
    return sorted(words)


def fetch_embeddings(client: OpenAI, words: list[str]) -> np.ndarray:
    """Batch-fetch embeddings from OpenAI. Returns (N, 512) float32 array."""
    all_vecs: list[list[float]] = []
    for i in range(0, len(words), BATCH_SIZE):
        batch = words[i : i + BATCH_SIZE]
        for attempt in range(3):
            try:
                resp = client.embeddings.create(
                    model=EMBEDDING_MODEL,
                    input=batch,
                    dimensions=EMBEDDING_DIMS,
                )
                break
            except Exception as e:
                if attempt == 2:
                    raise
                print(f"  retry {attempt + 1} after error: {e}", file=sys.stderr)
                time.sleep(2 * (attempt + 1))
        for item in sorted(resp.data, key=lambda d: d.index):
            all_vecs.append(item.embedding)
        print(
            f"  batch {i // BATCH_SIZE + 1}/"
            f"{(len(words) + BATCH_SIZE - 1) // BATCH_SIZE}"
            f" ({len(all_vecs)}/{len(words)} words)"
        )
    return np.asarray(all_vecs, dtype=np.float32)


def normalize_rows(mat: np.ndarray) -> np.ndarray:
    norms = np.linalg.norm(mat, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    return mat / norms


def compute_axes(embeddings: dict[str, np.ndarray]) -> dict[str, dict]:
    """For each axis, compute normalized direction = (v_high - v_low) / |.|"""
    axes_out: dict[str, dict] = {}
    for name, anchors in SEMANTIC_AXES.items():
        low = embeddings[anchors["low"]]
        high = embeddings[anchors["high"]]
        direction = high - low
        norm = float(np.linalg.norm(direction))
        if norm == 0:
            print(f"  WARNING: axis {name} has zero-length direction")
            continue
        direction = direction / norm
        axes_out[name] = {
            "low_anchor": anchors["low"],
            "high_anchor": anchors["high"],
            "vector": direction.astype(np.float32).tolist(),
        }
    return axes_out


def compute_coherence_auc(
    embeddings: dict[str, np.ndarray],
    axes: dict[str, dict],
) -> dict[str, float]:
    """For each axis, compute AUC of known-low vs known-high words projected onto it.

    AUC 1.0 = perfect separation, 0.5 = random, <0.5 = inverted.
    """
    scores: dict[str, float] = {}
    for axis_name, tests in COHERENCE_TESTS.items():
        if axis_name not in axes:
            continue
        direction = np.asarray(axes[axis_name]["vector"], dtype=np.float32)
        low_vecs = [embeddings[w] for w in tests["low"] if w in embeddings]
        high_vecs = [embeddings[w] for w in tests["high"] if w in embeddings]
        if not low_vecs or not high_vecs:
            continue
        low_proj = np.array([float(np.dot(v, direction)) for v in low_vecs])
        high_proj = np.array([float(np.dot(v, direction)) for v in high_vecs])
        y_true = np.concatenate([np.zeros(len(low_proj)), np.ones(len(high_proj))])
        y_score = np.concatenate([low_proj, high_proj])
        scores[axis_name] = float(roc_auc_score(y_true, y_score))
    return scores


def compute_projection_ranges(
    embeddings: dict[str, np.ndarray],
    axes: dict[str, dict],
) -> dict[str, tuple[float, float]]:
    """Per axis, return (5th, 95th) percentile of projections over all vocab words."""
    ranges: dict[str, tuple[float, float]] = {}
    all_vecs = np.stack(list(embeddings.values()))
    for axis_name, axis_data in axes.items():
        direction = np.asarray(axis_data["vector"], dtype=np.float32)
        projections = all_vecs @ direction
        p5, p95 = float(np.percentile(projections, 5)), float(np.percentile(projections, 95))
        ranges[axis_name] = (p5, p95)
    return ranges


def curate_targets_with_llm(
    client: OpenAI,
    candidates: list[str],
    desired_count: int = 1000,
    batch_size: int = 100,
) -> list[str]:
    """Filter a vocab list down to good semantic-game targets via LLM judgment.

    Classic word_pipeline uses the same wordfreq → LLM judge pattern. We ask
    the model to keep words that a casual player could plausibly guess by
    thinking about meaning, and reject proper names, brands, jargon, slurs,
    and generic/empty words like "thing" or "stuff".
    """
    kept: list[str] = []
    system = (
        "You are curating target words for a word-guessing game. Players find "
        "a hidden word by thinking about its meaning — the compass hints the "
        "game gives them reference PHYSICAL properties (size, hardness, "
        "temperature, etc.), so targets MUST be concrete things that can be "
        "described physically. Abstract concepts like 'movement', 'idea', "
        "'freedom' don't work because the compass can't describe them. "
        "Return valid JSON only."
    )
    instructions = (
        "For each word, decide KEEP or REJECT.\n\n"
        "KEEP — concrete, imageable, physically-describable things:\n"
        "- Concrete objects: hammer, bicycle, mirror, candle, chair\n"
        "- Animals: tiger, raven, dolphin, butterfly, cat\n"
        "- Food/drink: honey, pepper, coffee, bread, apple\n"
        "- Nature: ocean, forest, volcano, storm, meadow, mountain\n"
        "- Body parts: heart, eye, bone, finger\n"
        "- Tools, instruments, vehicles: piano, sword, train, plane\n"
        "- Buildings & places: castle, bridge, church, library\n"
        "- Materials: wood, stone, glass, steel, silk\n"
        "- Weather & sky: cloud, rain, snow, star, sun\n\n"
        "REJECT — anything abstract, conceptual, or non-physical:\n"
        "- Abstract concepts: movement, action, process, change, event\n"
        "- Abstract nouns: freedom, justice, memory, silence, courage\n"
        "- Emotions & mental states: love, fear, hope, joy, anger\n"
        "- Verbs & activities: work, run, sing, think, teach, learn\n"
        "- Generic/empty: thing, stuff, way, kind, type, part, side\n"
        "- Function words, prepositions, conjunctions\n"
        "- Grammar words: good, bad, big, new, own, other, only\n"
        "- Adverbs: really, very, actually\n"
        "- Proper names: Paris, Mary, Johnson, America\n"
        "- Brands: google, iphone, facebook\n"
        "- Time/number words: year, month, hour, million\n"
        "- Institutional: government, business, company\n"
        "- Technical/medical/legal jargon\n"
        "- Slurs, offensive, sexual, violent content\n"
        "- Compound or multi-word entries\n"
        "- Plural/inflection of a simpler word (cats if cat would work)\n\n"
        "KEY TEST: can you describe the word with physical properties — "
        "is it big or small? hard or soft? warm or cold? heavy or light? "
        "If YES, keep. If the word can't be described physically (it's an "
        "action, state, concept, or abstraction), REJECT.\n\n"
        'Return JSON: {"keep": ["word1", "word2", ...]}. Be STRICT.'
    )
    for i in range(0, len(candidates), batch_size):
        batch = candidates[i : i + batch_size]
        prompt = (
            f"{instructions}\n\nCandidates (batch {i // batch_size + 1}):\n"
            + ", ".join(batch)
        )
        for attempt in range(3):
            try:
                resp = client.chat.completions.create(
                    model="gpt-5.2",
                    messages=[
                        {"role": "system", "content": system},
                        {"role": "user", "content": prompt},
                    ],
                    response_format={"type": "json_object"},
                    max_completion_tokens=2000,
                )
                content = resp.choices[0].message.content
                payload = json.loads(content) if content else {}
                keeps = payload.get("keep", [])
                if isinstance(keeps, list):
                    # Only keep words actually from the batch (in case the LLM
                    # hallucinates or re-inflects). Normalize to lowercase.
                    batch_set = {b.lower() for b in batch}
                    for w in keeps:
                        if isinstance(w, str) and w.lower() in batch_set:
                            kept.append(w.lower())
                break
            except Exception as e:
                if attempt == 2:
                    print(f"  batch {i // batch_size + 1} failed: {e}", file=sys.stderr)
                else:
                    print(f"  batch retry {attempt + 1}: {e}", file=sys.stderr)
                    time.sleep(2 * (attempt + 1))
        print(
            f"  batch {i // batch_size + 1}/"
            f"{(len(candidates) + batch_size - 1) // batch_size} "
            f"({len(kept)} kept so far)"
        )
        if len(kept) >= desired_count:
            break
    # Dedup preserving order
    seen: set[str] = set()
    uniq: list[str] = []
    for w in kept:
        if w not in seen:
            seen.add(w)
            uniq.append(w)
    return uniq[:desired_count]


def compute_target_percentiles(
    embeddings: dict[str, np.ndarray],
    targets: list[str],
    bins: int = 100,
) -> dict[str, list[float]]:
    """For each target, compute cos(target, w) for every vocab word, sort
    ascending, and store `bins` quantile values.

    The quantile array is what the server uses at guess time to map a raw
    cosine similarity to a display percentile — per-target, so dense and
    sparse neighborhoods both feel like a full 0-100% range.
    """
    vocab_words = list(embeddings.keys())
    matrix = np.stack([embeddings[w] for w in vocab_words])  # (N, D)
    # All rows are unit-length, so cos = dot.
    result: dict[str, list[float]] = {}
    # Quantile positions [0/bins, 1/bins, ..., (bins-1)/bins]
    qs = np.linspace(0.0, 1.0, bins, endpoint=False) + (0.5 / bins)
    for t in targets:
        if t not in embeddings:
            continue
        tv = embeddings[t]
        cosines = matrix @ tv  # (N,)
        cosines.sort()
        quantiles = np.quantile(cosines, qs)
        result[t] = [round(float(x), 5) for x in quantiles]
    return result


def run_umap(embeddings_matrix: np.ndarray, n_neighbors: int = 15) -> np.ndarray:
    """Run UMAP to get 2D coords. Returns (N, 2) array normalized to [0,1]."""
    import umap

    reducer = umap.UMAP(
        n_components=2,
        n_neighbors=n_neighbors,
        min_dist=0.3,
        metric="cosine",
        random_state=42,
    )
    coords = reducer.fit_transform(embeddings_matrix)
    # Normalize to [0, 1]
    mins = coords.min(axis=0)
    maxs = coords.max(axis=0)
    ranges = maxs - mins
    ranges[ranges == 0] = 1.0
    return (coords - mins) / ranges


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--vocab-size", type=int, default=10000, help="Top N words by frequency to include")
    parser.add_argument("--target-pool", type=int, default=1000, help="Number of LLM-curated target words")
    parser.add_argument("--target-candidates", type=int, default=5000, help="Top-N candidates sent to LLM for curation")
    parser.add_argument("--dry-run", action="store_true", help="Skip OpenAI API call and UMAP, print plan only")
    parser.add_argument("--force", action="store_true", help="Overwrite existing output files")
    parser.add_argument("--skip-targets", action="store_true", help="Reuse existing targets.json (skip LLM curation)")
    parser.add_argument(
        "--reuse-embeddings",
        action="store_true",
        help="Load existing embeddings.json instead of re-calling OpenAI. Useful for regenerating targets/percentiles cheaply.",
    )
    args = parser.parse_args()

    load_dotenv(REPO_ROOT / ".env")
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key and not args.dry_run:
        print("ERROR: OPENAI_API_KEY not set in environment or .env", file=sys.stderr)
        return 1

    DATA_DIR.mkdir(parents=True, exist_ok=True)

    output_files = {
        "embeddings": DATA_DIR / "embeddings.json",
        "embeddings_meta": DATA_DIR / "embeddings.meta.json",
        "embeddings_f32": DATA_DIR / "embeddings.f32",
        "axes": DATA_DIR / "axes.json",
        "umap": DATA_DIR / "umap.json",
        "targets": DATA_DIR / "targets.json",
        "vocab": DATA_DIR / "vocabulary.json",
        "percentiles": DATA_DIR / "percentiles.json",
    }
    if not args.force and not args.reuse_embeddings and all(
        p.exists() for p in output_files.values()
    ):
        print("All output files already exist. Use --force to regenerate or --reuse-embeddings to only refresh targets/percentiles.")
        return 0

    # api_key is guaranteed non-None here because the earlier guard returns
    # on missing key (dry_run mode exits before reaching the client).
    client = OpenAI(api_key=api_key)

    if args.reuse_embeddings and output_files["embeddings"].exists():
        print("Reusing existing embeddings.json (skipping OpenAI API call)")
        raw = json.loads(output_files["embeddings"].read_text())
        words = raw["words"]
        matrix = np.asarray(raw["vectors"], dtype=np.float32)
        print(f"  loaded matrix shape: {matrix.shape}")
    else:
        print(f"Collecting vocabulary (top {args.vocab_size} words)...")
        words = collect_all_words(args.vocab_size)
        print(f"  total unique words: {len(words)}")

        if args.dry_run:
            print("Dry run — would call OpenAI embeddings API here.")
            print(f"  model: {EMBEDDING_MODEL} (dim={EMBEDDING_DIMS})")
            print(f"  batches: {(len(words) + BATCH_SIZE - 1) // BATCH_SIZE}")
            print(f"  targets: {len(HAND_PICKED_TARGETS)}")
            return 0

        print(f"Calling OpenAI embeddings API ({EMBEDDING_MODEL} @ {EMBEDDING_DIMS}d)...")
        matrix = fetch_embeddings(client, words)
        print(f"  got matrix shape: {matrix.shape}")

        # L2-normalize each row so cosine = dot product
        matrix = normalize_rows(matrix)

    embeddings_dict: dict[str, np.ndarray] = {
        word: matrix[i] for i, word in enumerate(words)
    }

    # When reusing embeddings, skip the axes/UMAP recomputation entirely —
    # those derived outputs are unchanged.
    if not args.reuse_embeddings:
        print("Computing anchor-based axis vectors...")
        axes = compute_axes(embeddings_dict)
        print(f"  {len(axes)}/{len(SEMANTIC_AXES)} axes computed")

        print("Scoring axis coherence (AUC on held-out test words)...")
        auc_scores = compute_coherence_auc(embeddings_dict, axes)
        print("\n  Axis coherence scores (AUC, higher = better):")
        print("  " + "-" * 40)
        for name in SEMANTIC_AXES:
            auc = auc_scores.get(name, float("nan"))
            marker = "✓" if auc > 0.85 else ("~" if auc > 0.70 else "✗")
            print(f"  {marker} {name:<12s} {auc:.3f}")
        print()

        print("Computing per-axis projection ranges (5th/95th percentile)...")
        ranges = compute_projection_ranges(embeddings_dict, axes)

        print("Running UMAP (this takes ~30s)...")
        umap_coords = run_umap(matrix)
        print(f"  UMAP shape: {umap_coords.shape}")

        # Write embeddings in both JSON (legacy/debug) and binary (production).
        print("\nWriting outputs...")

        # Binary .f32: raw Float32Array dump (50001 × 512 × 4 bytes ≈ 100MB)
        # Sub-second load time vs ~4s for JSON.parse on 230MB.
        matrix.astype(np.float32).tofile(output_files["embeddings_f32"])
        print(f"  {output_files['embeddings_f32']} ({output_files['embeddings_f32'].stat().st_size // 1024} KB)")

        # Meta JSON: word list + metadata (no vectors), ~500KB
        with open(output_files["embeddings_meta"], "w") as f:
            json.dump(
                {
                    "version": 2,
                    "format": "f32",
                    "model": f"{EMBEDDING_MODEL}-{EMBEDDING_DIMS}",
                    "words": words,
                    "dims": EMBEDDING_DIMS,
                    "count": len(words),
                    "endian": "little",
                },
                f,
            )
        print(f"  {output_files['embeddings_meta']} ({output_files['embeddings_meta'].stat().st_size // 1024} KB)")

        # Legacy JSON (kept for debugging — can be removed once binary is stable)
        with open(output_files["embeddings"], "w") as f:
            json.dump(
                {
                    "version": 1,
                    "model": f"{EMBEDDING_MODEL}-{EMBEDDING_DIMS}",
                    "words": words,
                    "vectors": [[round(float(x), 5) for x in row] for row in matrix],
                },
                f,
            )
        print(f"  {output_files['embeddings']} ({output_files['embeddings'].stat().st_size // 1024} KB)")

        with open(output_files["axes"], "w") as f:
            json.dump(
                {
                    "version": 1,
                    "axes": axes,
                    "coherence_auc": auc_scores,
                    "ranges": {name: {"p5": p5, "p95": p95} for name, (p5, p95) in ranges.items()},
                },
                f,
                indent=2,
            )
        print(f"  {output_files['axes']} ({output_files['axes'].stat().st_size // 1024} KB)")

        with open(output_files["umap"], "w") as f:
            json.dump(
                {
                    "version": 1,
                    "coordinates": {
                        word: [round(float(umap_coords[i, 0]), 4), round(float(umap_coords[i, 1]), 4)]
                        for i, word in enumerate(words)
                    },
                },
                f,
            )
        print(f"  {output_files['umap']} ({output_files['umap'].stat().st_size // 1024} KB)")
    else:
        print("Skipping axes/UMAP recompute (--reuse-embeddings)")

    # Target pool: wordfreq top N → LLM curator → keep ~target_pool good ones.
    # Reuse existing file if --skip-targets is passed (expensive LLM step).
    if args.skip_targets and output_files["targets"].exists():
        print("Skipping LLM target curation, reusing existing targets.json")
        valid_targets = json.loads(output_files["targets"].read_text())["targets"]
        valid_targets = [t for t in valid_targets if t in embeddings_dict]
    else:
        print(
            f"\nCurating target pool: top {args.target_candidates} wordfreq → "
            f"LLM filter → ~{args.target_pool} targets..."
        )
        # Candidates are the top wordfreq words in frequency order (load_vocabulary
        # returns them frequency-sorted). `words` is alphabetically sorted so we
        # can't slice it.
        freq_ordered = load_vocabulary(args.target_candidates)
        candidates = [w for w in freq_ordered if w in embeddings_dict]
        curated = curate_targets_with_llm(client, candidates, args.target_pool)
        valid_targets = [t for t in curated if t in embeddings_dict]
        print(f"  LLM kept {len(valid_targets)}/{len(candidates)} candidates")

    with open(output_files["targets"], "w") as f:
        json.dump({"version": 1, "targets": valid_targets}, f, indent=2)
    print(f"  {output_files['targets']} ({len(valid_targets)} targets)")

    with open(output_files["vocab"], "w") as f:
        json.dump({"version": 1, "words": words}, f)
    print(f"  {output_files['vocab']} ({len(words)} words)")

    # Per-target percentile distributions — kept as a reference artifact for
    # potential future use (e.g., alternative stretch curves). Runtime uses
    # rank-based scoring instead.
    print(f"\nComputing per-target percentile distributions ({len(valid_targets)} targets × {len(words)} vocab)...")
    percentiles = compute_target_percentiles(embeddings_dict, valid_targets, bins=100)
    with open(output_files["percentiles"], "w") as f:
        json.dump(
            {"version": 1, "bins": 100, "model": f"{EMBEDDING_MODEL}-{EMBEDDING_DIMS}", "targets": percentiles},
            f,
        )
    print(f"  {output_files['percentiles']} ({output_files['percentiles'].stat().st_size // 1024} KB)")

    print(f"\nDone. Files in {DATA_DIR}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
