"""Generate a comprehensive stats report for all languages.

Outputs a markdown document with per-language stats including:
- Word counts (daily, valid, blocked, total)
- LLM curation stats (processed, rejected, flagged reasons)
- Data quality metrics (English contamination, proper nouns, loanwords)
- Word history (frozen days, coverage)
- Source provenance
"""

from __future__ import annotations

import json
import logging
from collections import Counter
from datetime import date

from . import DATA_DIR, MIGRATION_DAY_IDX
from .schema import load_words_yaml

log = logging.getLogger(__name__)


def _get_todays_idx() -> int:
    n_days = (date.today() - date(1970, 1, 1)).days
    return n_days - 18992 + 195


def _load_config(lang: str) -> dict:
    config_path = DATA_DIR / lang / "language_config.json"
    if config_path.exists():
        return json.loads(config_path.read_text(encoding="utf-8"))
    return {}


def compute_language_stats(lang: str) -> dict:
    """Compute comprehensive stats for a single language."""
    yaml_path = DATA_DIR / lang / "words.yaml"
    if not yaml_path.exists():
        return {"lang": lang, "status": "no_yaml"}

    wy = load_words_yaml(yaml_path)
    config = _load_config(lang)

    # Basic counts
    daily = [w for w in wy.words if w.tier == "daily"]
    valid = [w for w in wy.words if w.tier == "valid"]
    blocked = [w for w in wy.words if w.tier == "blocked"]
    total = len(wy.words)

    # Sources
    source_counts: Counter = Counter()
    for w in wy.words:
        for s in w.sources:
            source_counts[s] += 1

    # Frequency stats
    with_freq = [w for w in wy.words if w.frequency > 0]
    avg_freq_daily = sum(w.frequency for w in daily if w.frequency > 0) / max(
        1, sum(1 for w in daily if w.frequency > 0)
    )
    avg_freq_all = sum(w.frequency for w in with_freq) / max(1, len(with_freq))

    # LLM curation stats
    llm_processed = [w for w in wy.words if w.llm is not None]
    llm_rejected = [w for w in llm_processed if w.llm.tier == "reject"]
    llm_valid = [w for w in llm_processed if w.llm.tier == "valid"]
    llm_daily = [w for w in llm_processed if w.llm.tier == "daily"]
    reviewed = [w for w in wy.words if w.reviewed]

    # LLM reason categorization
    reason_categories: Counter = Counter()
    for w in llm_processed:
        reason = w.llm.reason.lower()
        if "proper" in reason or "name" in reason or "surname" in reason:
            reason_categories["proper_nouns"] += 1
        elif "english" in reason or "loanword" in reason or "foreign" in reason:
            reason_categories["foreign/loanwords"] += 1
        elif "vulgar" in reason or "offensive" in reason or "slur" in reason:
            reason_categories["vulgar/offensive"] += 1
        elif "archaic" in reason or "obsolete" in reason or "rare" in reason:
            reason_categories["archaic/rare"] += 1
        elif "technical" in reason or "scientific" in reason:
            reason_categories["technical"] += 1
        elif "conjugat" in reason or "verb" in reason or "inflect" in reason:
            reason_categories["inflected_forms"] += 1
        else:
            reason_categories["other"] += 1

    # Flags stats
    flag_counts = {
        "profanity": sum(1 for w in wy.words if w.flags.profanity),
        "foreign": sum(1 for w in wy.words if w.flags.foreign),
        "proper_noun": sum(1 for w in wy.words if w.flags.proper_noun),
        "phrase": sum(1 for w in wy.words if w.flags.phrase),
    }

    # Word history
    words_with_history = [w for w in wy.words if w.history]
    total_history_days = sum(len(w.history) for w in words_with_history)
    days_since_migration = _get_todays_idx() - MIGRATION_DAY_IDX

    # Config metadata
    lang_name = config.get("name", lang)
    lang_native = config.get("name_native", "")
    timezone = config.get("timezone", "UTC")
    rtl = config.get("right_to_left", "false") == "true"
    grapheme_mode = config.get("grapheme_mode", "false") == "true"

    # Keyboard
    keyboard_path = DATA_DIR / lang / f"{lang}_keyboard.json"
    has_keyboard = keyboard_path.exists()

    return {
        "lang": lang,
        "status": "ok",
        "name": lang_name,
        "name_native": lang_native,
        "timezone": timezone,
        "rtl": rtl,
        "grapheme_mode": grapheme_mode,
        "has_keyboard": has_keyboard,
        # Word counts
        "total": total,
        "daily": len(daily),
        "valid": len(valid),
        "blocked": len(blocked),
        # Frequency
        "with_frequency": len(with_freq),
        "freq_coverage": len(with_freq) / max(1, total) * 100,
        "avg_freq_daily": round(avg_freq_daily, 2),
        "avg_freq_all": round(avg_freq_all, 2),
        # Sources
        "sources": dict(source_counts.most_common()),
        # LLM curation
        "llm_processed": len(llm_processed),
        "llm_rejected": len(llm_rejected),
        "llm_valid": len(llm_valid),
        "llm_daily": len(llm_daily),
        "llm_reasons": dict(reason_categories.most_common()),
        "reviewed": len(reviewed),
        # Flags
        "flags": flag_counts,
        # History
        "words_with_history": len(words_with_history),
        "total_history_days": total_history_days,
        "days_since_migration": days_since_migration,
        "history_coverage": total_history_days / max(1, days_since_migration) * 100,
        # Pool health
        "daily_years": round(len(daily) / 365, 1),
    }


def generate_report(langs: list[str] | None = None) -> str:
    """Generate a comprehensive markdown stats report."""
    if langs is None:
        langs = sorted(
            d.name for d in DATA_DIR.iterdir() if d.is_dir() and (d / "words.yaml").exists()
        )

    all_stats = []
    for lang in langs:
        stats = compute_language_stats(lang)
        if stats["status"] == "ok":
            all_stats.append(stats)

    today = date.today().isoformat()
    days_since = _get_todays_idx() - MIGRATION_DAY_IDX

    # Build report
    lines = []
    lines.append("# Word Data Stats Report")
    lines.append("")
    lines.append(f"Generated: {today}")
    lines.append(f"Languages: {len(all_stats)}")
    lines.append(f"Days since migration: {days_since}")
    lines.append("")

    # Global summary
    total_words = sum(s["total"] for s in all_stats)
    total_daily = sum(s["daily"] for s in all_stats)
    total_blocked = sum(s["blocked"] for s in all_stats)
    total_llm = sum(s["llm_processed"] for s in all_stats)
    lines.append("## Global Summary")
    lines.append("")
    lines.append("| Metric | Value |")
    lines.append("|--------|------:|")
    lines.append(f"| Total languages | {len(all_stats)} |")
    lines.append(f"| Total words | {total_words:,} |")
    lines.append(f"| Total daily words | {total_daily:,} |")
    lines.append(f"| Total blocked words | {total_blocked:,} |")
    lines.append(f"| LLM-curated words | {total_llm:,} |")
    lines.append(f"| Avg daily per language | {total_daily // len(all_stats):,} |")
    lines.append("")

    # Overview table
    lines.append("## Language Overview")
    lines.append("")
    lines.append("| Lang | Name | Daily | Valid | Block | Total | Freq% | LLM | Yrs |")
    lines.append("|------|------|------:|------:|------:|------:|------:|----:|----:|")
    for s in sorted(all_stats, key=lambda x: -x["daily"]):
        lines.append(
            f"| {s['lang']} | {s['name'][:12]} | {s['daily']:,} | {s['valid']:,} | "
            f"{s['blocked']:,} | {s['total']:,} | {s['freq_coverage']:.0f}% | "
            f"{s['llm_processed']} | {s['daily_years']} |"
        )
    lines.append("")

    # Per-language detail
    lines.append("## Language Details")
    lines.append("")

    for s in sorted(all_stats, key=lambda x: x["lang"]):
        native = f" ({s['name_native']})" if s["name_native"] else ""
        lines.append(f"### {s['name']}{native} — `{s['lang']}`")
        lines.append("")

        # Basic info
        attrs = []
        if s["rtl"]:
            attrs.append("RTL")
        if s["grapheme_mode"]:
            attrs.append("grapheme-mode")
        attrs.append(f"tz: {s['timezone']}")
        if s["has_keyboard"]:
            attrs.append("custom keyboard")
        lines.append(f"*{', '.join(attrs)}*")
        lines.append("")

        # Word counts
        lines.append(
            f"**Words:** {s['total']:,} total — {s['daily']:,} daily, {s['valid']:,} valid, {s['blocked']:,} blocked"
        )
        lines.append("")
        lines.append(f"**Pool health:** {s['daily_years']} years of daily words")
        lines.append("")

        # Frequency
        lines.append(
            f"**Frequency:** {s['freq_coverage']:.0f}% scored, avg Zipf {s['avg_freq_daily']} (daily), {s['avg_freq_all']} (all)"
        )
        lines.append("")

        # Sources
        if s["sources"]:
            src_parts = [f"{k}: {v}" for k, v in s["sources"].items()]
            lines.append(f"**Sources:** {', '.join(src_parts)}")
            lines.append("")

        # LLM curation
        if s["llm_processed"]:
            lines.append(
                f"**LLM curation:** {s['llm_processed']} processed — {s['llm_rejected']} reject, {s['llm_valid']} valid, {s['llm_daily']} daily"
            )
            if s["llm_reasons"]:
                reason_parts = [f"{k}: {v}" for k, v in s["llm_reasons"].items()]
                lines.append(f"  Reasons: {', '.join(reason_parts)}")
            lines.append("")

        if s["reviewed"]:
            lines.append(f"**Human reviewed:** {s['reviewed']} words")
            lines.append("")

        # Flags
        active_flags = {k: v for k, v in s["flags"].items() if v > 0}
        if active_flags:
            flag_parts = [f"{k}: {v}" for k, v in active_flags.items()]
            lines.append(f"**Flags:** {', '.join(flag_parts)}")
            lines.append("")

        # History
        lines.append(
            f"**History:** {s['words_with_history']} unique words served, "
            f"{s['total_history_days']}/{s['days_since_migration']} days covered "
            f"({s['history_coverage']:.0f}%)"
        )
        lines.append("")
        lines.append("---")
        lines.append("")

    return "\n".join(lines)
