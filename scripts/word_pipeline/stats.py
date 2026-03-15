"""Generate a comprehensive stats report for all languages.

Outputs a single markdown document with:
1. One big overview table (all key metrics per language)
2. Legend explaining metrics
3. Issues & recommended actions (only for languages with problems)
"""

from __future__ import annotations

import json
import logging
from collections import Counter
from datetime import date

from . import DATA_DIR, MIGRATION_DAY_IDX
from .schema import load_words_yaml
from .score import WORDFREQ_LANG_MAP
from .source import EXTRA_SOURCES, FREQ_LANG_MAP

log = logging.getLogger(__name__)


def _get_todays_idx() -> int:
    n_days = (date.today() - date(1970, 1, 1)).days
    return n_days - 18992 + 195


def _load_config(lang: str) -> dict:
    config_path = DATA_DIR / lang / "language_config.json"
    if config_path.exists():
        return json.loads(config_path.read_text(encoding="utf-8"))
    return {}


def _get_data_sources(lang: str) -> list[str]:
    """Determine the actual data sources available for a language."""
    sources = []
    if lang in WORDFREQ_LANG_MAP:
        sources.append("wf")  # wordfreq (Wikipedia, Reddit, Books)
    if lang in FREQ_LANG_MAP:
        sources.append("fw")  # FrequencyWords (OpenSubtitles)
    extras = EXTRA_SOURCES.get(lang, set())
    if "kaikki" in extras:
        sources.append("kk")  # kaikki.org (Wiktionary)
    if "leipzig" in extras:
        sources.append("lz")  # Leipzig Corpora (newspaper)
    if "hunspell" in extras:
        sources.append("hs")  # Hunspell spellcheck
    if "kbbi" in extras:
        sources.append("kb")  # KBBI (Indonesian dict)
    if "katla" in extras:
        sources.append("kt")  # Katla (Indonesian Wordle)
    if not sources:
        sources.append("--")  # community-only
    return sources


def compute_language_stats(lang: str) -> dict | None:
    """Compute comprehensive stats for a single language."""
    yaml_path = DATA_DIR / lang / "words.yaml"
    if not yaml_path.exists():
        return None

    wy = load_words_yaml(yaml_path)
    config = _load_config(lang)

    # Tier counts
    daily = [w for w in wy.words if w.tier == "daily"]
    valid = [w for w in wy.words if w.tier == "valid"]
    blocked = [w for w in wy.words if w.tier == "blocked"]

    # Frequency
    daily_with_freq = [w for w in daily if w.frequency > 0]
    freq_pct = len(daily_with_freq) / max(1, len(daily)) * 100
    avg_zipf = (
        sum(w.frequency for w in daily_with_freq) / max(1, len(daily_with_freq))
        if daily_with_freq
        else 0
    )

    # LLM curation
    llm_curated = [w for w in wy.words if w.llm is not None]
    llm_demoted = [w for w in llm_curated if w.llm.tier in ("reject", "valid")]

    # LLM reason categories
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
    days_since = _get_todays_idx() - MIGRATION_DAY_IDX
    history_days = sum(len(w.history) for w in wy.words if w.history)

    # Data sources
    data_sources = _get_data_sources(lang)

    # Issues
    issues = []
    if len(daily) < 365:
        issues.append(f"CRITICAL: only {len(daily)} daily words ({len(daily) / 365:.1f} years)")
    elif len(daily) < 1000:
        issues.append(f"LOW: only {len(daily)} daily words ({len(daily) / 365:.1f} years)")
    if not llm_curated:
        issues.append("not LLM-curated")
    if freq_pct < 20:
        issues.append(f"low freq coverage ({freq_pct:.0f}%)")
    if reasons.get("names", 0) > len(llm_curated) * 0.3 and llm_curated:
        issues.append(f"name contamination ({reasons['names']}/{len(llm_curated)})")

    # Config flags
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
        # Counts
        "daily": len(daily),
        "valid": len(valid),
        "blocked": len(blocked),
        "total": len(wy.words),
        # Frequency
        "freq_pct": round(freq_pct),
        "avg_zipf": round(avg_zipf, 1),
        # Sources
        "data_sources": data_sources,
        # LLM
        "llm_curated": len(llm_curated),
        "llm_demoted": len(llm_demoted),
        "llm_reasons": dict(reasons.most_common()),
        "reviewed": sum(1 for w in wy.words if w.reviewed),
        # History
        "history_days": history_days,
        "days_since": days_since,
        # Health
        "years": round(len(daily) / 365, 1),
        # Issues
        "issues": issues,
    }


def generate_report(langs: list[str] | None = None) -> str:
    """Generate markdown stats report."""
    if langs is None:
        langs = sorted(
            d.name for d in DATA_DIR.iterdir() if d.is_dir() and (d / "words.yaml").exists()
        )

    all_stats = [s for lang in langs if (s := compute_language_stats(lang)) is not None]
    today = date.today().isoformat()
    days_since = _get_todays_idx() - MIGRATION_DAY_IDX

    total_words = sum(s["total"] for s in all_stats)
    total_daily = sum(s["daily"] for s in all_stats)
    total_llm = sum(s["llm_curated"] for s in all_stats)

    lines: list[str] = []
    lines.append("# Word Data Report")
    lines.append("")
    lines.append(
        f"*Generated {today} | {len(all_stats)} languages | "
        f"{total_words:,} total words | {total_daily:,} daily | "
        f"{total_llm:,} LLM-curated | {days_since} days since migration*"
    )
    lines.append("")

    # === MAIN TABLE ===
    lines.append("## All Languages")
    lines.append("")
    lines.append(
        "| Code | Language | Daily | Valid | Block | Total | "
        "Freq | Zipf | Sources | LLM | Yrs | Issues |"
    )
    lines.append(
        "|------|----------|------:|------:|------:|------:|"
        "----:|-----:|---------|----:|----:|--------|"
    )

    for s in sorted(all_stats, key=lambda x: -x["daily"]):
        src_str = ",".join(s["data_sources"])
        issue_str = "; ".join(s["issues"]) if s["issues"] else ""
        name = s["name"][:14]
        if s["flags"]:
            name += " " + " ".join(f"[{f}]" for f in s["flags"])

        lines.append(
            f"| {s['lang']} | {name} | {s['daily']:,} | {s['valid']:,} | "
            f"{s['blocked']:,} | {s['total']:,} | "
            f"{s['freq_pct']}% | {s['avg_zipf']} | {src_str} | "
            f"{s['llm_curated'] or '--'} | {s['years']} | {issue_str} |"
        )
    lines.append("")

    # === LEGEND ===
    lines.append("## Legend")
    lines.append("")
    lines.append(
        "**Tiers:** Daily = puzzle answers, Valid = accepted guesses only, Blocked = excluded"
    )
    lines.append("")
    lines.append("**Freq:** % of daily words with a frequency score from wordfreq/FrequencyWords")
    lines.append("")
    lines.append(
        "**Zipf:** Average word commonness (1=rare, 4=common, 7=ultra-common like 'the'). "
        "Good daily words are typically 3.5-5.5."
    )
    lines.append("")
    lines.append("**Sources:**")
    lines.append("- `wf` = wordfreq (Wikipedia, Reddit, Twitter, Google Books)")
    lines.append("- `fw` = FrequencyWords (OpenSubtitles)")
    lines.append("- `kk` = kaikki.org (Wiktionary word extracts)")
    lines.append("- `lz` = Leipzig Corpora (newspaper/web text)")
    lines.append("- `hs` = Hunspell (spellcheck dictionary)")
    lines.append("- `kb` = KBBI (Indonesian official dictionary)")
    lines.append("- `kt` = Katla (Indonesian Wordle answers)")
    lines.append("- `--` = community-contributed only (no external frequency/dictionary source)")
    lines.append("")
    lines.append(
        "**LLM:** Number of words reviewed by Claude. "
        "Words flagged as names/foreign/vulgar are demoted from daily tier."
    )
    lines.append("")
    lines.append("**Yrs:** Years of unique daily words at one word per day.")
    lines.append("")

    # === ISSUES ===
    with_issues = [s for s in all_stats if s["issues"]]
    if with_issues:
        lines.append("## Issues & Recommendations")
        lines.append("")
        for s in sorted(with_issues, key=lambda x: x["daily"]):
            lines.append(f"### {s['name']} (`{s['lang']}`)")
            lines.append("")
            for issue in s["issues"]:
                lines.append(f"- {issue}")

            # Recommendations
            if s["daily"] < 365:
                lines.append(
                    f"- **Action:** Run LLM curation on valid pool ({s['valid']:,} words) "
                    "to find promotable daily words"
                )
            if not s["llm_curated"]:
                lines.append(
                    "- **Action:** Run LLM curation: "
                    f"`cd scripts && uv run python -m word_pipeline extract {s['lang']} && "
                    "# then spawn curation agent`"
                )
            lines.append("")

    # === LLM CURATION BREAKDOWN ===
    curated = [s for s in all_stats if s["llm_curated"]]
    if curated:
        lines.append("## LLM Curation Summary")
        lines.append("")
        lines.append(
            "| Code | Language | Curated | Demoted | Names | Foreign | Vulgar | Obscure | Other |"
        )
        lines.append(
            "|------|----------|--------:|--------:|------:|--------:|-------:|--------:|------:|"
        )
        for s in sorted(curated, key=lambda x: -x["llm_curated"]):
            r = s["llm_reasons"]
            lines.append(
                f"| {s['lang']} | {s['name'][:14]} | {s['llm_curated']} | {s['llm_demoted']} | "
                f"{r.get('names', 0)} | {r.get('foreign', 0)} | {r.get('vulgar', 0)} | "
                f"{r.get('obscure', 0)} | {r.get('other', 0)} |"
            )
        lines.append("")

    return "\n".join(lines)
