"""Schema for words.json — the single source of truth per language."""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from pathlib import Path


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
class WordsData:
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
    """Convert WordEntry to a clean dict for JSON output."""
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
    """Parse a dict into a WordEntry."""
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


def to_json(words_data: WordsData) -> str:
    """Serialize WordsData to JSON string."""
    doc = {
        "metadata": words_data.metadata,
        "words": [_entry_to_dict(w) for w in words_data.words],
    }
    return json.dumps(doc, ensure_ascii=False, indent=2, sort_keys=False)


def from_json(text: str) -> WordsData:
    """Parse JSON string into WordsData."""
    doc = json.loads(text)
    words = [_entry_from_dict(w) for w in doc.get("words", [])]
    return WordsData(metadata=doc.get("metadata", {}), words=words)


def load_words(path: Path) -> WordsData:
    """Load words.json from disk."""
    return from_json(path.read_text(encoding="utf-8"))


def save_words(words_data: WordsData, path: Path) -> None:
    """Save words.json to disk."""
    path.write_text(to_json(words_data) + "\n", encoding="utf-8")
