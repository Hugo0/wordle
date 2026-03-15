"""One-time migration: convert words.yaml → words.json for all languages.

Usage:
    uv run python scripts/migrate_yaml_to_json.py [lang_code...]
    uv run python scripts/migrate_yaml_to_json.py --all
    uv run python scripts/migrate_yaml_to_json.py --all --dry-run
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import yaml

SCRIPT_DIR = Path(__file__).parent
DATA_DIR = SCRIPT_DIR.parent / "webapp" / "data" / "languages"


def _get_yaml_loader():
    try:
        return yaml.CSafeLoader
    except AttributeError:
        return yaml.SafeLoader


def migrate_language(lang: str, dry_run: bool = False) -> dict:
    """Convert words.yaml → words.json for a single language."""
    yaml_path = DATA_DIR / lang / "words.yaml"
    json_path = DATA_DIR / lang / "words.json"

    if not yaml_path.exists():
        return {"lang": lang, "status": "skipped", "reason": "no words.yaml"}

    # Parse YAML
    doc = yaml.load(yaml_path.read_text(encoding="utf-8"), Loader=_get_yaml_loader())  # noqa: S506

    word_count = len(doc.get("words", []))
    metadata = doc.get("metadata", {})

    if not dry_run:
        # Write JSON with same structure
        json_text = json.dumps(doc, ensure_ascii=False, indent=2, sort_keys=False)
        json_path.write_text(json_text + "\n", encoding="utf-8")

    return {
        "lang": lang,
        "status": "ok",
        "words": word_count,
        "json_path": str(json_path),
        "language_name": metadata.get("language_name", lang),
    }


def verify_roundtrip(lang: str) -> bool:
    """Verify that words.json has the same data as words.yaml."""
    yaml_path = DATA_DIR / lang / "words.yaml"
    json_path = DATA_DIR / lang / "words.json"

    if not yaml_path.exists() or not json_path.exists():
        return False

    yaml_doc = yaml.load(yaml_path.read_text(encoding="utf-8"), Loader=_get_yaml_loader())  # noqa: S506
    json_doc = json.loads(json_path.read_text(encoding="utf-8"))

    yaml_words = {w["word"] for w in yaml_doc.get("words", [])}
    json_words = {w["word"] for w in json_doc.get("words", [])}

    if yaml_words != json_words:
        diff = yaml_words.symmetric_difference(json_words)
        print(f"  {lang}: word mismatch! diff={len(diff)}")
        return False

    # Check tier counts match
    for tier in ("daily", "valid", "blocked"):
        yaml_count = sum(1 for w in yaml_doc["words"] if w.get("tier") == tier)
        json_count = sum(1 for w in json_doc["words"] if w.get("tier") == tier)
        if yaml_count != json_count:
            print(f"  {lang}: {tier} count mismatch: yaml={yaml_count} json={json_count}")
            return False

    return True


def main():
    parser = argparse.ArgumentParser(description="Migrate words.yaml → words.json")
    parser.add_argument("langs", nargs="*", help="Language codes")
    parser.add_argument("--all", action="store_true", help="Migrate all languages")
    parser.add_argument("--dry-run", action="store_true", help="Preview without writing")
    parser.add_argument("--verify", action="store_true", help="Verify roundtrip after migration")
    args = parser.parse_args()

    if args.all:
        langs = sorted(
            d.name for d in DATA_DIR.iterdir() if d.is_dir() and (d / "words.yaml").exists()
        )
    elif args.langs:
        langs = args.langs
    else:
        print("Specify language codes or --all")
        sys.exit(1)

    print(f"Migrating {len(langs)} language(s) from YAML → JSON...")
    if args.dry_run:
        print("(dry run — no files written)")

    results = []
    for lang in langs:
        result = migrate_language(lang, dry_run=args.dry_run)
        results.append(result)

    # Summary
    ok = [r for r in results if r["status"] == "ok"]
    skipped = [r for r in results if r["status"] == "skipped"]
    total_words = sum(r.get("words", 0) for r in ok)

    print(f"\nMigrated: {len(ok)} languages, {total_words:,} total words")
    if skipped:
        print(f"Skipped: {len(skipped)} ({', '.join(r['lang'] for r in skipped)})")

    # Verify if requested
    if args.verify and not args.dry_run:
        print("\nVerifying roundtrip...")
        failures = []
        for r in ok:
            if not verify_roundtrip(r["lang"]):
                failures.append(r["lang"])
        if failures:
            print(f"FAILED: {len(failures)} languages: {', '.join(failures)}")
            sys.exit(1)
        else:
            print(f"All {len(ok)} languages verified successfully.")


if __name__ == "__main__":
    main()
