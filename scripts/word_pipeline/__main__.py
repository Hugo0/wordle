"""CLI entry point: uv run python -m word_pipeline run ..."""

from __future__ import annotations

import argparse
import logging
import sys

from . import DATA_DIR

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")


def cmd_run(args):
    from .run import run_pipeline

    if args.all:
        langs = sorted(
            d.name for d in DATA_DIR.iterdir() if d.is_dir() and (d / "words.yaml").exists()
        )
    elif args.langs:
        langs = args.langs
    else:
        print("Specify language codes or --all")
        sys.exit(1)

    stages = args.stages.split(",") if args.stages else None

    print(f"Running pipeline for {len(langs)} language(s)...")
    results = []
    for lang in langs:
        result = run_pipeline(
            lang,
            stages=stages,
            use_llm=args.llm,
            llm_model=args.llm_model,
            llm_batch_size=args.batch_size,
            llm_max_batches=args.max_batches,
            dry_run=args.dry_run,
        )
        results.append(result)

    # Print summary
    print(
        f"\n{'Lang':<6} {'Status':<8} {'Total':>7} {'Daily':>7} {'Valid':>7} {'Block':>7} {'Stages'}"
    )
    print("-" * 70)
    for r in results:
        if r["status"] == "skipped":
            print(f"{r['lang']:<6} {'SKIP':<8} {r.get('reason', '')}")
            continue
        t = r.get("tiers", {})
        stages_str = ",".join(r.get("stages_run", []))
        print(
            f"{r['lang']:<6} {'OK':<8} {r.get('total_words', 0):>7} "
            f"{t.get('daily', 0):>7} {t.get('valid', 0):>7} {t.get('blocked', 0):>7} "
            f"{stages_str}"
        )
        for w in r.get("warnings", []):
            print(f"  ⚠ {w}")


def main():
    parser = argparse.ArgumentParser(prog="word_pipeline", description="Word data pipeline")
    sub = parser.add_subparsers(dest="command")

    # run command
    run_parser = sub.add_parser("run", help="Run pipeline stages")
    run_parser.add_argument("langs", nargs="*", help="Language codes")
    run_parser.add_argument("--all", action="store_true", help="Process all migrated languages")
    run_parser.add_argument(
        "--stages", help="Comma-separated stages: source,normalize,score,curate,compile,freeze"
    )
    run_parser.add_argument("--llm", action="store_true", help="Enable LLM curation")
    run_parser.add_argument("--llm-model", default="claude-sonnet-4-20250514", help="LLM model")
    run_parser.add_argument("--batch-size", type=int, default=50, help="LLM batch size")
    run_parser.add_argument("--max-batches", type=int, help="Max LLM batches (for testing)")
    run_parser.add_argument("--dry-run", action="store_true", help="Preview without writing")
    run_parser.set_defaults(func=cmd_run)

    args = parser.parse_args()
    if not args.command:
        parser.print_help()
        sys.exit(1)

    args.func(args)


if __name__ == "__main__":
    main()
