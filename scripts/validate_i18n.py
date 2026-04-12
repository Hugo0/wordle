"""
Validate i18n translation files against the default language config.

Checks:
  1. Missing keys — language overrides a section but omits keys present in default
  2. Untranslated keys — value identical to English default (likely never translated)
  3. String length warnings — translations >2x English length that may overflow UI
  4. JSON validity — every language_config.json must parse

Usage:
  uv run python scripts/validate_i18n.py
  uv run python scripts/validate_i18n.py --verbose
  uv run python scripts/validate_i18n.py --strict   # also fail on untranslated keys
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
LANGUAGES_DIR = DATA_DIR / "languages"
DEFAULT_CONFIG_PATH = DATA_DIR / "default_language_config.json"

# Sections whose string keys are compared against the default
CHECKED_SECTIONS = ("text", "ui", "help")

# Languages exempt from untranslated-key checks (English-based or conlangs)
UNTRANSLATED_EXEMPT_LANGS = {"en", "tlh", "qya", "pau"}

# UI keys used in tight spaces — warn if translation exceeds this char count
BUTTON_KEYS = {"text.share", "text.copied", "text.shared"}
BUTTON_MAX_CHARS = 15

STAT_LABEL_KEYS = {
    "ui.games",
    "ui.win_percent",
    "ui.streak",
    "ui.best",
    "ui.wins",
    "ui.solved",
    "ui.combo",
    "ui.avg_guesses",
    "ui.failed",
    "ui.points",
}
STAT_LABEL_MAX_CHARS = 12

# General max length before warning (for non-description strings)
GENERAL_MAX_CHARS = 80

# Minimum string length to consider for untranslated check — very short strings
# (1-2 chars) are often legitimately identical across languages.
MIN_UNTRANSLATED_CHECK_LEN = 3


# ---------------------------------------------------------------------------
# Core validation logic (importable from tests)
# ---------------------------------------------------------------------------


def load_default_config() -> dict:
    with open(DEFAULT_CONFIG_PATH, encoding="utf-8") as f:
        return json.load(f)


def get_language_dirs() -> list[Path]:
    """Return sorted list of language directories that contain language_config.json."""
    if not LANGUAGES_DIR.exists():
        return []
    return sorted(
        d for d in LANGUAGES_DIR.iterdir() if d.is_dir() and (d / "language_config.json").exists()
    )


def load_lang_config(lang_dir: Path) -> dict:
    with open(lang_dir / "language_config.json", encoding="utf-8") as f:
        return json.load(f)


def _flat_string_keys(section: dict, prefix: str = "") -> dict[str, str]:
    """Extract flat key->value pairs for string values only (skip dicts/lists)."""
    result = {}
    for k, v in section.items():
        full_key = f"{prefix}.{k}" if prefix else k
        if isinstance(v, str):
            result[full_key] = v
    return result


def check_missing_keys(lang: str, lang_config: dict, default_config: dict) -> dict[str, list[str]]:
    """Return {section: [missing_keys]} for sections the language overrides."""
    missing: dict[str, list[str]] = {}
    for section in CHECKED_SECTIONS:
        if section not in lang_config:
            # Language doesn't override this section — falls back entirely to default.
            continue
        default_keys = set(default_config.get(section, {}).keys())
        lang_keys = set(lang_config[section].keys())
        diff = sorted(default_keys - lang_keys)
        if diff:
            missing[section] = diff
    return missing


def check_untranslated_keys(lang: str, lang_config: dict, default_config: dict) -> list[str]:
    """Return list of 'section.key' strings identical to English default."""
    if lang in UNTRANSLATED_EXEMPT_LANGS:
        return []

    untranslated = []
    for section in CHECKED_SECTIONS:
        if section not in lang_config:
            continue
        default_flat = _flat_string_keys(default_config.get(section, {}), section)
        lang_flat = _flat_string_keys(lang_config.get(section, {}), section)

        for key, lang_val in lang_flat.items():
            default_val = default_flat.get(key)
            if default_val is None:
                continue
            if len(default_val) < MIN_UNTRANSLATED_CHECK_LEN:
                continue
            if lang_val == default_val:
                untranslated.append(key)
    return untranslated


def check_string_lengths(
    lang: str, lang_config: dict, default_config: dict
) -> list[tuple[str, int, int]]:
    """Return list of (key, lang_len, default_len) for oversized translations."""
    warnings = []
    for section in CHECKED_SECTIONS:
        if section not in lang_config:
            continue
        default_flat = _flat_string_keys(default_config.get(section, {}), section)
        lang_flat = _flat_string_keys(lang_config.get(section, {}), section)

        for key, lang_val in lang_flat.items():
            default_val = default_flat.get(key)
            if default_val is None or not default_val:
                continue

            lang_len = len(lang_val)
            default_len = len(default_val)
            qualified_key = key  # already has section prefix

            # Button keys: hard cap
            if qualified_key in BUTTON_KEYS and lang_len > BUTTON_MAX_CHARS:
                warnings.append((qualified_key, lang_len, default_len))
                continue

            # Stat label keys: hard cap
            if qualified_key in STAT_LABEL_KEYS and lang_len > STAT_LABEL_MAX_CHARS:
                warnings.append((qualified_key, lang_len, default_len))
                continue

            # General: warn if >2x default AND >80 chars (skip short strings
            # where 2x is still fine, e.g. "Share" -> "Teilen" is 2x but fine)
            if lang_len > 2 * default_len and lang_len > GENERAL_MAX_CHARS:
                warnings.append((qualified_key, lang_len, default_len))

    return warnings


def check_json_validity(lang_dir: Path) -> str | None:
    """Return error message if language_config.json is invalid JSON, else None."""
    try:
        with open(lang_dir / "language_config.json", encoding="utf-8") as f:
            json.load(f)
        return None
    except (json.JSONDecodeError, UnicodeDecodeError) as e:
        return str(e)


def validate_all() -> dict:
    """Run all checks on all languages. Returns a results dict."""
    default_config = load_default_config()
    lang_dirs = get_language_dirs()

    results = {
        "total_languages": len(lang_dirs),
        "json_errors": {},  # lang -> error string
        "missing_keys": {},  # lang -> {section: [keys]}
        "untranslated": {},  # lang -> [keys]
        "length_warnings": {},  # lang -> [(key, lang_len, default_len)]
    }

    for lang_dir in lang_dirs:
        lang = lang_dir.name

        # JSON validity
        err = check_json_validity(lang_dir)
        if err:
            results["json_errors"][lang] = err
            continue  # can't check further if JSON is broken

        lang_config = load_lang_config(lang_dir)

        # Missing keys
        missing = check_missing_keys(lang, lang_config, default_config)
        if missing:
            results["missing_keys"][lang] = missing

        # Untranslated keys
        untranslated = check_untranslated_keys(lang, lang_config, default_config)
        if untranslated:
            results["untranslated"][lang] = untranslated

        # Length warnings
        length_warns = check_string_lengths(lang, lang_config, default_config)
        if length_warns:
            results["length_warnings"][lang] = length_warns

    return results


# ---------------------------------------------------------------------------
# CLI output
# ---------------------------------------------------------------------------


def print_results(results: dict, verbose: bool = False, strict: bool = False) -> int:
    """Print results and return exit code (0 = pass, 1 = fail).

    Default mode: only JSON errors are critical (exit 1).
    --strict mode: missing keys and untranslated keys also cause exit 1.

    Missing keys fall back to English defaults at runtime, so they don't break
    the app — but they indicate incomplete translations.
    """
    has_critical = False

    print(f"\n{'=' * 60}")
    print(f"i18n Validation — {results['total_languages']} languages checked")
    print(f"{'=' * 60}\n")

    # JSON errors (always critical)
    if results["json_errors"]:
        has_critical = True
        print("FAIL: Invalid JSON files")
        for lang, err in sorted(results["json_errors"].items()):
            print(f"  {lang}: {err}")
        print()

    # Missing keys (critical only with --strict)
    if results["missing_keys"]:
        label = "FAIL" if strict else "WARN"
        if strict:
            has_critical = True
        print(f"{label}: Missing keys in {len(results['missing_keys'])} languages")
        for lang, sections in sorted(results["missing_keys"].items()):
            total = sum(len(keys) for keys in sections.values())
            if verbose:
                for section, keys in sorted(sections.items()):
                    for key in keys:
                        print(f"  {lang}: {section}.{key}")
            else:
                section_summary = ", ".join(f"{s} ({len(k)})" for s, k in sorted(sections.items()))
                print(f"  {lang}: {total} missing — {section_summary}")
        print()

    # Untranslated keys (critical only with --strict)
    if results["untranslated"]:
        label = "FAIL" if strict else "WARN"
        if strict:
            has_critical = True

        # Sort by count descending, show top 10
        by_count = sorted(results["untranslated"].items(), key=lambda x: -len(x[1]))
        print(f"{label}: Untranslated keys (identical to English default)")
        for shown, (lang, keys) in enumerate(by_count):
            if not verbose and shown >= 10:
                remaining = len(by_count) - 10
                print(f"  ... and {remaining} more languages")
                break
            if verbose:
                print(f"  {lang} ({len(keys)} keys):")
                for key in keys:
                    print(f"    {key}")
            else:
                print(f"  {lang}: {len(keys)} untranslated keys")
        print()

    # Length warnings (never critical, informational)
    if results["length_warnings"]:
        print(f"WARN: String length issues in {len(results['length_warnings'])} languages")
        for lang, warns in sorted(results["length_warnings"].items()):
            if verbose:
                for key, lang_len, default_len in warns:
                    print(f"  {lang}: {key} — {lang_len} chars (default: {default_len})")
            else:
                print(f"  {lang}: {len(warns)} strings may overflow UI")
        print()

    # Summary
    issues_count = len(results["json_errors"])
    if strict:
        issues_count += len(results["missing_keys"])
    ok_count = results["total_languages"] - issues_count
    print(f"{'=' * 60}")
    if has_critical:
        print(f"RESULT: FAIL — {ok_count}/{results['total_languages']} languages OK")
    else:
        print(f"RESULT: PASS — {ok_count}/{results['total_languages']} languages OK")
        warnings = []
        if results["missing_keys"]:
            total_missing = sum(
                sum(len(keys) for keys in sections.values())
                for sections in results["missing_keys"].values()
            )
            warnings.append(
                f"{total_missing} missing keys in {len(results['missing_keys'])} languages"
            )
        if results["untranslated"]:
            total_untranslated = sum(len(v) for v in results["untranslated"].values())
            warnings.append(
                f"{total_untranslated} untranslated keys in "
                f"{len(results['untranslated'])} languages"
            )
        if warnings:
            print(f"  Warnings: {'; '.join(warnings)}")
            print("  Run with --strict to enforce")
    print(f"{'=' * 60}\n")

    return 1 if has_critical else 0


def main():
    parser = argparse.ArgumentParser(description="Validate i18n translation files")
    parser.add_argument("--verbose", action="store_true", help="Show detailed per-language output")
    parser.add_argument(
        "--strict", action="store_true", help="Fail on untranslated keys (not just warn)"
    )
    args = parser.parse_args()

    results = validate_all()
    exit_code = print_results(results, verbose=args.verbose, strict=args.strict)
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
