"""Generate word data report from compiled JSON (fast, no YAML parsing)."""

from __future__ import annotations

import json
import logging
import subprocess
from datetime import date

from . import DATA_DIR, MIGRATION_DAY_IDX
from .score import WORDFREQ_LANG_MAP
from .source import EXTRA_SOURCES, FREQ_LANG_MAP

log = logging.getLogger(__name__)

WORD_LENGTHS = [4, 5, 6]


def _get_todays_idx() -> int:
    n_days = (date.today() - date(1970, 1, 1)).days
    return n_days - 18992 + 195


def _load_config(lang: str) -> dict:
    p = DATA_DIR / lang / "language_config.json"
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else {}


def _get_data_sources(lang: str) -> list[str]:
    sources = []
    if lang in WORDFREQ_LANG_MAP:
        sources.append("wf")
    if lang in FREQ_LANG_MAP:
        sources.append("fw")
    for code, key in [
        ("kk", "kaikki"),
        ("lz", "leipzig"),
        ("hs", "hunspell"),
        ("kb", "kbbi"),
        ("kt", "katla"),
    ]:
        if key in EXTRA_SOURCES.get(lang, set()):
            sources.append(code)
    return sources or ["--"]


def _get_all_git_provenance() -> dict[str, str]:
    """Get initial commit dates for all languages in one git call."""
    try:
        repo_root = DATA_DIR.parent.parent
        common_result = subprocess.run(
            ["git", "rev-parse", "--git-common-dir"],
            capture_output=True,
            text=True,
            cwd=repo_root,
            timeout=5,
        )
        git_root = (repo_root / common_result.stdout.strip()).resolve().parent
        result = subprocess.run(
            [
                "git",
                "log",
                "main",
                "--diff-filter=A",
                "--format=%as",
                "--name-only",
                "--",
                "webapp/data/languages/",
            ],
            capture_output=True,
            text=True,
            cwd=git_root,
            timeout=10,
        )
        provenance: dict[str, str] = {}
        current_date = None
        for line in result.stdout.split("\n"):
            line = line.strip()
            if not line:
                continue
            if len(line) == 10 and line[0].isdigit() and "-" in line:
                current_date = line
            elif "_5words.txt" in line and current_date:
                parts = line.split("/")
                for i, p in enumerate(parts):
                    if p == "languages" and i + 1 < len(parts):
                        provenance.setdefault(parts[i + 1], current_date)
                        break
        return provenance
    except Exception:
        return {}


def generate_report(langs: list[str] | None = None) -> str:
    """Generate markdown stats report from compiled JSON only."""
    if langs is None:
        langs = sorted(
            d.name
            for d in DATA_DIR.iterdir()
            if d.is_dir() and (d / "words_compiled.json").exists()
        )

    today = date.today().isoformat()
    days_since = _get_todays_idx() - MIGRATION_DAY_IDX
    provenance = _get_all_git_provenance()

    rows: list[dict] = []

    for lang in langs:
        config = _load_config(lang)
        compiled = json.loads((DATA_DIR / lang / "words_compiled.json").read_text(encoding="utf-8"))
        meta = compiled.get("meta", {})
        sources = _get_data_sources(lang)
        added = provenance.get(lang, "?")

        flags = []
        if config.get("right_to_left", "false") == "true":
            flags.append("RTL")
        if config.get("grapheme_mode", "false") == "true":
            flags.append("G")

        name = config.get("name", lang)
        llm_curated = meta.get("llm_curated", 0)
        avg_zipf = meta.get("avg_zipf", 0)
        freq_pct = meta.get("freq_pct", 0)

        for wl in WORD_LENGTHS:
            if wl == 5:
                daily_n = len(compiled["daily"])
                valid_n = len(compiled["valid"])
                blocked_n = len(compiled["blocked"])

                issues = []
                if daily_n < 365:
                    issues.append(f"only {daily_n} daily ({daily_n / 365:.1f}yr)")
                if llm_curated == 0 and daily_n > 0:
                    issues.append("no LLM review")

                rows.append(
                    {
                        "lang": lang,
                        "name": name,
                        "flags": flags,
                        "length": wl,
                        "daily": daily_n,
                        "valid": valid_n,
                        "blocked": blocked_n,
                        "total": daily_n + valid_n + blocked_n,
                        "freq_pct": freq_pct,
                        "avg_zipf": avg_zipf,
                        "sources": sources,
                        "added": added,
                        "llm_curated": llm_curated,
                        "years": round(daily_n / 365, 1),
                        "issues": issues,
                    }
                )
            else:
                rows.append(
                    {
                        "lang": lang,
                        "name": name,
                        "flags": flags,
                        "length": wl,
                        "daily": 0,
                        "valid": 0,
                        "blocked": 0,
                        "total": 0,
                        "freq_pct": 0,
                        "avg_zipf": 0,
                        "sources": sources,
                        "added": added,
                        "llm_curated": 0,
                        "years": 0,
                        "issues": [],
                    }
                )

    rows.sort(key=lambda r: (r["lang"], r["length"]))

    total_words = sum(r["total"] for r in rows)
    total_daily = sum(r["daily"] for r in rows)
    total_llm = sum(r["llm_curated"] for r in rows if r["length"] == 5)

    lines: list[str] = []
    lines.append("# Word Data Report")
    lines.append("")
    lines.append(
        f"*Generated {today} | {len(langs)} languages | "
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
    lines.append("| **Language** | Name. `[RTL]` right-to-left, `[G]` grapheme-cluster counting |")
    lines.append("| **Len** | Word length (characters or grapheme clusters) |")
    lines.append("| **Daily W** | Puzzle answers — words players must guess |")
    lines.append("| **Valid W** | Accepted guesses, never daily answers |")
    lines.append("| **Block W** | Excluded (profanity, proper nouns, etc.) |")
    lines.append("| **Freq** | % of daily words with frequency score |")
    lines.append('| **Zipf** | Avg word commonness (1=rare, 4=common, 7="the"). Good: 3.5-5.5 |')
    lines.append("| **Sources** | Data provenance (see codes below) |")
    lines.append("| **LLM** | Words reviewed by Claude for quality |")
    lines.append("| **Yrs** | Years of unique daily words at 1/day |")
    lines.append("| **Added** | Date first added to project (git history) |")
    lines.append("")
    lines.append(
        "**Source codes:** "
        "`wf` wordfreq (Wikipedia+Reddit+Books) · "
        "`fw` FrequencyWords (OpenSubtitles) · "
        "`kk` kaikki (Wiktionary) · "
        "`lz` Leipzig (newspaper) · "
        "`hs` Hunspell · "
        "`kb` KBBI (Indonesian) · "
        "`kt` Katla (Indonesian Wordle) · "
        "`--` community-only"
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
        if r["total"] == 0:
            continue  # skip empty length rows

        display_name = r["name"][:14]
        if r["flags"]:
            display_name += " " + " ".join(f"[{f}]" for f in r["flags"])

        zipf = str(r["avg_zipf"]) if r["avg_zipf"] > 0 else "—"
        freq = f"{r['freq_pct']}%" if r["freq_pct"] > 0 else "—"
        llm = str(r["llm_curated"]) if r["llm_curated"] else "—"
        yrs = str(r["years"]) if r["years"] > 0 else "—"
        issue = "; ".join(r["issues"]) if r["issues"] else ""
        lines.append(
            f"| {r['lang']} | {display_name} | {r['length']} "
            f"| {r['daily']:,} | {r['valid']:,} | {r['blocked']:,} "
            f"| {freq} | {zipf} | {','.join(r['sources'])} | {llm} | {yrs} "
            f"| {r['added']} | {issue} |"
        )
    lines.append("")

    # === ISSUES ===
    issue_rows = [r for r in rows if r["issues"] and r["total"] > 0]
    if issue_rows:
        lines.append("## Issues & Recommendations")
        lines.append("")
        critical = [r for r in issue_rows if r["daily"] < 365]
        if critical:
            lines.append("### Critical — insufficient daily words")
            lines.append("")
            for r in sorted(critical, key=lambda x: x["daily"]):
                lines.append(
                    f"- **{r['name']}** (`{r['lang']}`): "
                    f"{r['daily']} daily ({r['years']}yr). "
                    f"{r['valid']:,} valid to promote."
                )
            lines.append("")

        uncurated = sorted({r["lang"] for r in issue_rows if "no LLM" in " ".join(r["issues"])})
        if uncurated:
            lines.append(f"### Uncurated — {len(uncurated)} languages need LLM review")
            lines.append("")
            lines.append("```bash")
            lines.append(
                f"cd scripts && uv run python -m word_pipeline extract {' '.join(uncurated)}"
            )
            lines.append("```")
            lines.append("")

    return "\n".join(lines)
