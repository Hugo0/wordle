"""Generate a comprehensive word data report.

Outputs a markdown document with:
1. Legend (column definitions, abbreviations)
2. Main table (one row per language × word length)
3. Issues & recommendations
4. LLM curation breakdown
"""

from __future__ import annotations

import json
import logging
import subprocess
from collections import Counter
from datetime import date

from . import DATA_DIR, MIGRATION_DAY_IDX
from .schema import load_words_yaml
from .score import WORDFREQ_LANG_MAP
from .source import EXTRA_SOURCES, FREQ_LANG_MAP

log = logging.getLogger(__name__)

WORD_LENGTHS = [4, 5, 6]  # lengths to report on


def _get_todays_idx() -> int:
    n_days = (date.today() - date(1970, 1, 1)).days
    return n_days - 18992 + 195


def _load_config(lang: str) -> dict:
    config_path = DATA_DIR / lang / "language_config.json"
    if config_path.exists():
        return json.loads(config_path.read_text(encoding="utf-8"))
    return {}


def _get_data_sources(lang: str) -> list[str]:
    """Actual data sources available for a language."""
    sources = []
    if lang in WORDFREQ_LANG_MAP:
        sources.append("wf")
    if lang in FREQ_LANG_MAP:
        sources.append("fw")
    extras = EXTRA_SOURCES.get(lang, set())
    for code, key in [
        ("kk", "kaikki"),
        ("lz", "leipzig"),
        ("hs", "hunspell"),
        ("kb", "kbbi"),
        ("kt", "katla"),
    ]:
        if key in extras:
            sources.append(code)
    return sources or ["--"]


def _get_git_provenance(lang: str) -> str:
    """Get the initial commit date for this language's word list."""
    try:
        repo_root = DATA_DIR.parent.parent
        result = subprocess.run(
            [
                "git",
                "log",
                "--all",
                "--diff-filter=A",
                "--format=%as",
                "--",
                f"webapp/data/languages/{lang}/{lang}_5words.txt",
            ],
            capture_output=True,
            text=True,
            cwd=repo_root,
            timeout=5,
        )
        lines = result.stdout.strip().split("\n")
        if lines and lines[-1]:
            return lines[-1]
        # Try words.yaml if original file not found
        result = subprocess.run(
            [
                "git",
                "log",
                "--all",
                "--diff-filter=A",
                "--format=%as",
                "--",
                f"webapp/data/languages/{lang}/words.yaml",
            ],
            capture_output=True,
            text=True,
            cwd=repo_root,
            timeout=5,
        )
        lines = result.stdout.strip().split("\n")
        return lines[-1] if lines and lines[-1] else "?"
    except Exception:
        return "?"


def compute_pool_stats(lang: str, word_length: int, wy, config: dict) -> dict | None:
    """Compute stats for a specific language + word length pool."""
    words = [w for w in wy.words if w.length == word_length]
    if not words:
        return None

    daily = [w for w in words if w.tier == "daily"]
    valid = [w for w in words if w.tier == "valid"]
    blocked = [w for w in words if w.tier == "blocked"]

    # Frequency
    daily_with_freq = [w for w in daily if w.frequency > 0]
    freq_pct = len(daily_with_freq) / max(1, len(daily)) * 100
    avg_zipf = (
        sum(w.frequency for w in daily_with_freq) / len(daily_with_freq) if daily_with_freq else 0
    )

    # LLM
    llm_curated = [w for w in words if w.llm is not None]
    llm_demoted = [w for w in llm_curated if w.llm.tier in ("reject", "valid")]

    # LLM reasons
    reasons: Counter = Counter()
    for w in llm_curated:
        r = w.llm.reason.lower()
        if "proper" in r or "name" in r or "surname" in r:
            reasons["names"] += 1
        elif "english" in r or "loanword" in r or "foreign" in r:
            reasons["foreign"] += 1
        elif "vulgar" in r or "offensive" in r or "slur" in r:
            reasons["vulgar"] += 1
        elif "archaic" in r or "obsolete" in r or "rare" in r or "technical" in r:
            reasons["obscure"] += 1
        else:
            reasons["other"] += 1

    # History
    history_days = sum(len(w.history) for w in words if w.history)

    # Issues
    issues = []
    if len(daily) < 365 and len(words) > 0:
        issues.append(f"only {len(daily)} daily ({len(daily) / 365:.1f}yr)")
    if not llm_curated and len(daily) > 0:
        issues.append("no LLM review")
    if freq_pct < 20 and len(daily) > 50:
        issues.append(f"low freq ({freq_pct:.0f}%)")

    return {
        "daily": len(daily),
        "valid": len(valid),
        "blocked": len(blocked),
        "total": len(words),
        "freq_pct": round(freq_pct),
        "avg_zipf": round(avg_zipf, 1),
        "llm_curated": len(llm_curated),
        "llm_demoted": len(llm_demoted),
        "llm_reasons": dict(reasons.most_common()),
        "history_days": history_days,
        "years": round(len(daily) / 365, 1),
        "issues": issues,
    }


def compute_language_meta(lang: str) -> dict | None:
    """Compute language-level metadata (not per-length)."""
    yaml_path = DATA_DIR / lang / "words.yaml"
    if not yaml_path.exists():
        return None

    config = _load_config(lang)
    flags = []
    if config.get("right_to_left", "false") == "true":
        flags.append("RTL")
    if config.get("grapheme_mode", "false") == "true":
        flags.append("grapheme")

    return {
        "lang": lang,
        "name": config.get("name", lang),
        "name_native": config.get("name_native", ""),
        "flags": flags,
        "sources": _get_data_sources(lang),
        "added": _get_git_provenance(lang),
        "has_keyboard": (DATA_DIR / lang / f"{lang}_keyboard.json").exists(),
        "reviewed": 0,  # filled later
    }


def generate_report(langs: list[str] | None = None) -> str:
    """Generate markdown stats report."""
    if langs is None:
        langs = sorted(
            d.name for d in DATA_DIR.iterdir() if d.is_dir() and (d / "words.yaml").exists()
        )

    today = date.today().isoformat()
    days_since = _get_todays_idx() - MIGRATION_DAY_IDX

    # Collect all data
    rows: list[dict] = []
    lang_metas: dict[str, dict] = {}

    for lang in langs:
        meta = compute_language_meta(lang)
        if meta is None:
            continue
        lang_metas[lang] = meta

        wy = load_words_yaml(DATA_DIR / lang / "words.yaml")
        config = _load_config(lang)
        meta["reviewed"] = sum(1 for w in wy.words if w.reviewed)

        for wl in WORD_LENGTHS:
            pool = compute_pool_stats(lang, wl, wy, config)
            if pool is not None:
                rows.append({"lang": lang, "length": wl, **meta, **pool})
            else:
                # Empty placeholder row
                rows.append(
                    {
                        "lang": lang,
                        "length": wl,
                        **meta,
                        "daily": 0,
                        "valid": 0,
                        "blocked": 0,
                        "total": 0,
                        "freq_pct": 0,
                        "avg_zipf": 0,
                        "llm_curated": 0,
                        "llm_demoted": 0,
                        "llm_reasons": {},
                        "history_days": 0,
                        "years": 0,
                        "issues": [],
                    }
                )

    # Sort by language code, then length
    rows.sort(key=lambda r: (r["lang"], r["length"]))

    # Totals
    total_words = sum(r["total"] for r in rows)
    total_daily = sum(r["daily"] for r in rows)
    total_llm = sum(r["llm_curated"] for r in rows)

    lines: list[str] = []
    lines.append("# Word Data Report")
    lines.append("")
    lines.append(
        f"*Generated {today} | {len(lang_metas)} languages | "
        f"{total_words:,} words | {total_daily:,} daily | "
        f"{total_llm:,} LLM-reviewed | {days_since} days post-migration*"
    )
    lines.append("")

    # === LEGEND ===
    lines.append("## Legend")
    lines.append("")
    lines.append("| Column | Meaning |")
    lines.append("|--------|---------|")
    lines.append("| **Code** | ISO language code |")
    lines.append(
        "| **Language** | Language name. Tags: `[RTL]` = right-to-left, `[G]` = grapheme-cluster mode |"
    )
    lines.append("| **Len** | Word length (characters or grapheme clusters) |")
    lines.append("| **Daily W** | Puzzle answer pool — words players must guess |")
    lines.append("| **Valid W** | Accepted guesses but never selected as daily answer |")
    lines.append("| **Block W** | Excluded from daily (profanity, proper nouns, etc.) |")
    lines.append("| **Freq** | % of daily words with a frequency score |")
    lines.append(
        '| **Zipf** | Average word commonness (1=rare, 4=common, 7="the"). Target: 3.5-5.5 |'
    )
    lines.append("| **Sources** | Dictionary/frequency data sources (see below) |")
    lines.append("| **LLM** | Words reviewed by Claude for quality |")
    lines.append("| **Yrs** | Years of unique daily words at 1 word/day |")
    lines.append("| **Added** | Date language was first added to the project |")
    lines.append("")
    lines.append(
        "**Source codes:** "
        "`wf` = wordfreq (Wikipedia+Reddit+Books), "
        "`fw` = FrequencyWords (OpenSubtitles), "
        "`kk` = kaikki (Wiktionary), "
        "`lz` = Leipzig (newspaper), "
        "`hs` = Hunspell, "
        "`kb` = KBBI (Indonesian), "
        "`kt` = Katla (Indonesian Wordle), "
        "`--` = community-only"
    )
    lines.append("")

    # === MAIN TABLE ===
    lines.append("## Word Pools")
    lines.append("")
    lines.append(
        "| Code | Language | Len | Daily W | Valid W | Block W "
        "| Freq | Zipf | Sources | LLM | Yrs | Added | Issues |"
    )
    lines.append(
        "|------|----------|----:|--------:|--------:|--------:"
        "|-----:|-----:|---------|----:|----:|-------|--------|"
    )

    for r in rows:
        name = r["name"][:14]
        if r["flags"]:
            tags = "".join(f"[{'G' if f == 'grapheme' else f}]" for f in r["flags"])
            name += f" {tags}"

        zipf_str = str(r["avg_zipf"]) if r["avg_zipf"] > 0 else "—"
        freq_str = f"{r['freq_pct']}%" if r["freq_pct"] > 0 else "—"
        src_str = ",".join(r["sources"])
        llm_str = str(r["llm_curated"]) if r["llm_curated"] else "—"
        yrs_str = str(r["years"]) if r["years"] > 0 else "—"
        issue_str = "; ".join(r["issues"]) if r["issues"] else ""

        # Skip empty placeholder rows where total is 0
        if r["total"] == 0:
            lines.append(
                f"| {r['lang']} | {name} | {r['length']} | — | — | — "
                f"| — | — | {src_str} | — | — | {r['added']} | *no data yet* |"
            )
        else:
            lines.append(
                f"| {r['lang']} | {name} | {r['length']} | {r['daily']:,} | {r['valid']:,} | {r['blocked']:,} "
                f"| {freq_str} | {zipf_str} | {src_str} | {llm_str} | {yrs_str} | {r['added']} | {issue_str} |"
            )
    lines.append("")

    # === ISSUES ===
    issue_rows = [r for r in rows if r["issues"] and r["total"] > 0]
    if issue_rows:
        lines.append("## Issues & Recommendations")
        lines.append("")
        # Group by severity
        critical = [
            r for r in issue_rows if any("only" in i for i in r["issues"]) and r["daily"] < 365
        ]
        # low_pool: languages with < 2000 but >= 365 daily words (not critical)
        uncurated = [
            r for r in issue_rows if any("no LLM" in i for i in r["issues"]) and r not in critical
        ]

        if critical:
            lines.append("### Critical — insufficient daily words")
            lines.append("")
            for r in sorted(critical, key=lambda x: x["daily"]):
                lines.append(
                    f"- **{r['name']}** (`{r['lang']}`, {r['length']}-letter): "
                    f"{r['daily']} daily words ({r['years']} years). "
                    f"Has {r['valid']:,} valid words to promote."
                )
            lines.append("")

        if uncurated:
            n = len(set(r["lang"] for r in uncurated))
            lines.append(f"### Uncurated — {n} languages not yet LLM-reviewed")
            lines.append("")
            lines.append("Run LLM curation to remove proper nouns, loanwords, and vulgar words:")
            lines.append("```")
            uncurated_langs = sorted(set(r["lang"] for r in uncurated))
            lines.append(
                f"cd scripts && uv run python -m word_pipeline extract {' '.join(uncurated_langs)}"
            )
            lines.append("# then spawn Claude curation agents per language")
            lines.append("```")
            lines.append("")

    # === LLM CURATION BREAKDOWN ===
    curated_rows = [r for r in rows if r["llm_curated"] and r["total"] > 0]
    if curated_rows:
        lines.append("## LLM Curation Breakdown")
        lines.append("")
        lines.append(
            "| Code | Language | Len | Reviewed | Demoted | Names | Foreign | Vulgar | Obscure | Other |"
        )
        lines.append(
            "|------|----------|----:|---------:|--------:|------:|--------:|-------:|--------:|------:|"
        )
        for r in sorted(curated_rows, key=lambda x: -x["llm_curated"]):
            rc = r["llm_reasons"]
            lines.append(
                f"| {r['lang']} | {r['name'][:14]} | {r['length']} | {r['llm_curated']} | {r['llm_demoted']} | "
                f"{rc.get('names', 0)} | {rc.get('foreign', 0)} | {rc.get('vulgar', 0)} | "
                f"{rc.get('obscure', 0)} | {rc.get('other', 0)} |"
            )
        lines.append("")

    return "\n".join(lines)
