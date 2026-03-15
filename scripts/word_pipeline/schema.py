"""Schema for words.yaml — the single source of truth per language."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import UTC, datetime
from pathlib import Path

import yaml


@dataclass
class WordFlags:
    profanity: bool = False
    foreign: bool = False
    proper_noun: bool = False
    phrase: bool = False

    def any_set(self) -> bool:
        return self.profanity or self.foreign or self.proper_noun or self.phrase


@dataclass
class LLMCuration:
    tier: str  # "daily" | "valid" | "reject"
    confidence: int  # 1-5
    reason: str
    definition: str | None = None
    definition_en: str | None = None


@dataclass
class WordEntry:
    word: str
    length: int
    tier: str  # "daily" | "valid" | "blocked"
    frequency: float = 0.0  # wordfreq Zipf score (0-7)
    difficulty: float | None = None  # 0.0 (easy) to 1.0 (hard)
    sources: list[str] = field(default_factory=list)
    flags: WordFlags = field(default_factory=WordFlags)
    llm: LLMCuration | None = None
    reviewed: bool = False
    history: list[int] = field(default_factory=list)  # day indices
    scheduled_day: int | None = None


@dataclass
class SourceInfo:
    name: str
    type: str  # "dictionary" | "frequency" | "community"
    version: str | None = None


@dataclass
class WordsYaml:
    metadata: dict
    words: list[WordEntry]

    def by_tier(self, tier: str) -> list[WordEntry]:
        return [w for w in self.words if w.tier == tier]

    def daily_words(self) -> list[str]:
        return [w.word for w in self.words if w.tier == "daily"]

    def all_words(self) -> list[str]:
        return [w.word for w in self.words if w.tier in ("daily", "valid", "blocked")]

    def word_map(self) -> dict[str, WordEntry]:
        return {w.word: w for w in self.words}


# --- Serialization ---


def _entry_to_dict(entry: WordEntry) -> dict:
    """Convert WordEntry to a clean dict for YAML output."""
    d: dict = {"word": entry.word, "length": entry.length, "tier": entry.tier}
    if entry.frequency:
        d["frequency"] = round(entry.frequency, 2)
    if entry.difficulty is not None:
        d["difficulty"] = round(entry.difficulty, 2)
    if entry.sources:
        d["sources"] = entry.sources
    if entry.flags.any_set():
        d["flags"] = {k: v for k, v in asdict(entry.flags).items() if v}
    if entry.llm:
        llm_d = {
            "tier": entry.llm.tier,
            "confidence": entry.llm.confidence,
            "reason": entry.llm.reason,
        }
        if entry.llm.definition:
            llm_d["definition"] = entry.llm.definition
        if entry.llm.definition_en:
            llm_d["definition_en"] = entry.llm.definition_en
        d["llm"] = llm_d
    if entry.reviewed:
        d["reviewed"] = True
    if entry.history:
        d["history"] = entry.history
    if entry.scheduled_day is not None:
        d["scheduled_day"] = entry.scheduled_day
    return d


def _entry_from_dict(d: dict) -> WordEntry:
    """Parse a dict from YAML into a WordEntry."""
    flags = WordFlags(**d["flags"]) if "flags" in d else WordFlags()
    llm = LLMCuration(**d["llm"]) if "llm" in d else None
    return WordEntry(
        word=d["word"],
        length=d["length"],
        tier=d["tier"],
        frequency=d.get("frequency", 0.0),
        difficulty=d.get("difficulty"),
        sources=d.get("sources", []),
        flags=flags,
        llm=llm,
        reviewed=d.get("reviewed", False),
        history=d.get("history", []),
        scheduled_day=d.get("scheduled_day"),
    )


def _get_yaml_dumper():
    """Get the fastest available YAML dumper."""
    try:
        return yaml.CDumper
    except AttributeError:
        return yaml.Dumper


def to_yaml(words_yaml: WordsYaml) -> str:
    """Serialize WordsYaml to YAML string."""
    doc = {
        "metadata": words_yaml.metadata,
        "words": [_entry_to_dict(w) for w in words_yaml.words],
    }
    return yaml.dump(
        doc,
        Dumper=_get_yaml_dumper(),
        allow_unicode=True,
        default_flow_style=False,
        sort_keys=False,
        width=120,
    )


def _get_yaml_loader():
    """Get the fastest available YAML loader."""
    try:
        return yaml.CSafeLoader
    except AttributeError:
        return yaml.SafeLoader


def from_yaml(text: str) -> WordsYaml:
    """Parse YAML string into WordsYaml."""
    doc = yaml.load(text, Loader=_get_yaml_loader())  # noqa: S506
    words = [_entry_from_dict(w) for w in doc.get("words", [])]
    return WordsYaml(metadata=doc.get("metadata", {}), words=words)


def load_words_yaml(path: Path) -> WordsYaml:
    """Load words.yaml from disk."""
    return from_yaml(path.read_text(encoding="utf-8"))


def save_words_yaml(words_yaml: WordsYaml, path: Path) -> None:
    """Save words.yaml to disk."""
    path.write_text(to_yaml(words_yaml), encoding="utf-8")


def to_compiled_json(words_yaml: WordsYaml) -> dict:
    """Compile WordsYaml to optimized JSON for runtime consumption."""
    daily, valid, blocked = [], [], []
    for w in words_yaml.words:
        if w.tier == "daily":
            daily.append(w.word)
        elif w.tier == "valid":
            valid.append(w.word)
        elif w.tier == "blocked":
            blocked.append(w.word)
    daily.sort()
    valid.sort()
    blocked.sort()

    return {
        "daily": daily,
        "valid": valid,
        "blocked": blocked,
        "meta": {
            "language_code": words_yaml.metadata.get("language_code", ""),
            "daily_count": len(daily),
            "valid_count": len(valid),
            "blocked_count": len(blocked),
            "compiled_at": datetime.now(UTC).isoformat(),
        },
    }
