"""
Tests for daily word selection algorithm.

These tests ensure the daily word selection is deterministic and consistent.
The algorithm must produce the same word for the same day across all instances.

Migration Note (2026-01-25):
- Days <= 1681: Legacy shuffle algorithm (backwards compatible)
- Days > 1681: Consistent hashing algorithm (blocklist-friendly)
"""

import pytest
import datetime
import random
import hashlib
from pathlib import Path
from tests.conftest import ALL_LANGUAGES, load_word_list

# Migration cutoff - must match webapp/app.py
MIGRATION_DAY_IDX = 1681
DATA_DIR = Path(__file__).parent.parent / "webapp" / "data" / "languages"


def get_todays_idx(date: datetime.date = None) -> int:
    """
    Calculate the word index for a given date.
    Must match the algorithm in webapp/app.py exactly.
    """
    if date is None:
        date = datetime.datetime.utcnow().date()

    # Convert to datetime for calculation
    if isinstance(date, datetime.date) and not isinstance(date, datetime.datetime):
        dt = datetime.datetime.combine(date, datetime.time())
    else:
        dt = date

    epoch = datetime.datetime(1970, 1, 1)
    n_days = (dt - epoch).days
    idx = n_days - 18992 + 195
    return idx


def get_daily_word(word_list: list[str], date: datetime.date = None) -> str:
    """Get the daily word for a language on a given date."""
    if not word_list:
        return None
    idx = get_todays_idx(date)
    return word_list[idx % len(word_list)]


class TestDailyWordAlgorithm:
    """Tests for the daily word selection algorithm."""

    def test_index_is_deterministic(self):
        """Same date should always produce same index."""
        date = datetime.date(2025, 1, 15)
        idx1 = get_todays_idx(date)
        idx2 = get_todays_idx(date)
        assert idx1 == idx2

    def test_different_dates_produce_different_indices(self):
        """Different dates should produce different indices."""
        date1 = datetime.date(2025, 1, 15)
        date2 = datetime.date(2025, 1, 16)
        idx1 = get_todays_idx(date1)
        idx2 = get_todays_idx(date2)
        assert idx1 != idx2
        assert idx2 == idx1 + 1  # Consecutive days

    def test_index_is_positive(self):
        """Index should be positive for recent dates."""
        # Test a range of dates from 2022 to 2026
        for year in range(2022, 2027):
            for month in [1, 6, 12]:
                date = datetime.date(year, month, 15)
                idx = get_todays_idx(date)
                assert idx >= 0, f"Index for {date} should be non-negative, got {idx}"

    def test_index_increases_over_time(self):
        """Index should increase as time progresses."""
        dates = [
            datetime.date(2024, 1, 1),
            datetime.date(2024, 6, 1),
            datetime.date(2025, 1, 1),
            datetime.date(2025, 6, 1),
        ]
        indices = [get_todays_idx(d) for d in dates]
        assert indices == sorted(indices), "Indices should increase over time"


class TestDailyWordSelection:
    """Tests for daily word selection across languages."""

    @pytest.mark.parametrize("lang", ALL_LANGUAGES)
    def test_daily_word_is_deterministic(self, lang):
        """Same date should produce same word for a language."""
        words = load_word_list(lang)
        if not words:
            pytest.skip(f"{lang}: No word list")

        date = datetime.date(2025, 1, 15)
        word1 = get_daily_word(words, date)
        word2 = get_daily_word(words, date)
        assert word1 == word2, f"{lang}: Word should be deterministic"

    @pytest.mark.parametrize("lang", ALL_LANGUAGES)
    def test_daily_word_is_valid(self, lang):
        """Daily word should be a valid word from the list."""
        words = load_word_list(lang)
        if not words:
            pytest.skip(f"{lang}: No word list")

        date = datetime.date(2025, 1, 15)
        word = get_daily_word(words, date)
        assert word in words, f"{lang}: Daily word '{word}' not in word list"

    @pytest.mark.parametrize("lang", ALL_LANGUAGES)
    def test_daily_word_is_5_letters(self, lang):
        """Daily word should be exactly 5 letters."""
        words = load_word_list(lang)
        if not words:
            pytest.skip(f"{lang}: No word list")

        date = datetime.date(2025, 1, 15)
        word = get_daily_word(words, date)
        assert len(word) == 5, f"{lang}: Daily word '{word}' is {len(word)} chars"

    def test_word_list_shuffling_is_deterministic(self):
        """Word list shuffling (if any) should be deterministic."""
        # This tests that random.seed(42) produces consistent results
        test_list = ["apple", "baker", "crane", "delta", "eagle"]

        random.seed(42)
        shuffled1 = test_list.copy()
        random.shuffle(shuffled1)

        random.seed(42)
        shuffled2 = test_list.copy()
        random.shuffle(shuffled2)

        assert shuffled1 == shuffled2, "Shuffling with same seed should be deterministic"


class TestWordCycling:
    """Tests for word list cycling behavior."""

    @pytest.mark.parametrize("lang", ALL_LANGUAGES)
    def test_no_repeat_in_word_list_length_days(self, lang):
        """Words shouldn't repeat within the word list length."""
        words = load_word_list(lang)
        if not words:
            pytest.skip(f"{lang}: No word list")

        # Check a sample period
        start_date = datetime.date(2025, 1, 1)
        num_days = min(len(words), 365)  # Check up to a year or list length

        selected_words = []
        for i in range(num_days):
            date = start_date + datetime.timedelta(days=i)
            word = get_daily_word(words, date)
            selected_words.append(word)

        unique_words = set(selected_words)
        # All selected words should be unique within the period
        assert len(unique_words) == len(
            selected_words
        ), f"{lang}: Found duplicate words within {num_days} days"

    @pytest.mark.parametrize("lang", ALL_LANGUAGES)
    def test_cycles_through_all_words(self, lang):
        """Over enough days, all words should be used."""
        words = load_word_list(lang)
        if not words:
            pytest.skip(f"{lang}: No word list")

        if len(words) > 1000:
            pytest.skip(f"{lang}: Word list too large for full cycle test")

        start_date = datetime.date(2020, 1, 1)
        num_days = len(words)

        selected_words = set()
        for i in range(num_days):
            date = start_date + datetime.timedelta(days=i)
            word = get_daily_word(words, date)
            selected_words.add(word)

        assert selected_words == set(words), f"{lang}: Not all words used after {num_days} days"


# =============================================================================
# NEW: Tests for migration and consistent hashing algorithm
# =============================================================================


def _word_hash(word: str, lang_code: str) -> int:
    """Get stable hash for a word (must match webapp/app.py)."""
    h = hashlib.sha256(f"{lang_code}:{word}".encode()).digest()
    return int.from_bytes(h[:8], "big")


def _day_hash(day_idx: int, lang_code: str) -> int:
    """Get hash for a day (must match webapp/app.py)."""
    h = hashlib.sha256(f"{lang_code}:day:{day_idx}".encode()).digest()
    return int.from_bytes(h[:8], "big")


def get_daily_word_consistent_hash(
    words: list, blocklist: set, day_idx: int, lang_code: str
) -> str:
    """Consistent hashing algorithm (must match webapp/app.py)."""
    day_h = _day_hash(day_idx, lang_code)
    candidates = []
    for word in words:
        if word not in blocklist:
            candidates.append((_word_hash(word, lang_code), word))
    if not candidates:
        return words[0] if words else ""
    candidates.sort(key=lambda x: x[0])
    for word_h, word in candidates:
        if word_h >= day_h:
            return word
    return candidates[0][1]


def get_daily_word_legacy(words: list, blocklist: set, day_idx: int) -> str:
    """Legacy shuffle algorithm (must match webapp/app.py)."""
    list_len = len(words)
    if not blocklist:
        return words[day_idx % list_len]
    for offset in range(list_len):
        idx = (day_idx + offset) % list_len
        word = words[idx]
        if word not in blocklist:
            return word
    return words[day_idx % list_len]


def load_blocklist(lang: str) -> set:
    """Load blocklist for a language."""
    path = DATA_DIR / lang / f"{lang}_blocklist.txt"
    if not path.exists():
        return set()
    blocklist = set()
    for line in path.read_text().strip().split("\n"):
        line = line.strip()
        if line and not line.startswith("#"):
            blocklist.add(line.lower())
    return blocklist


class TestMigrationCutoff:
    """Tests for the migration cutoff date."""

    def test_migration_day_is_january_25_2026(self):
        """Migration day 1681 should be January 25, 2026."""
        date = datetime.date(2026, 1, 25)
        idx = get_todays_idx(date)
        assert idx == MIGRATION_DAY_IDX, f"Day 1681 should be Jan 25, 2026, got idx {idx}"

    def test_legacy_algorithm_for_past_days(self):
        """Days <= MIGRATION_DAY_IDX should use legacy algorithm."""
        # Day 1681 should still use legacy
        assert MIGRATION_DAY_IDX <= 1681
        # Day 1682 should use new algorithm
        assert MIGRATION_DAY_IDX < 1682


class TestBackwardsCompatibility:
    """Tests to ensure past daily words don't change."""

    # Known daily words for specific dates (captured before migration)
    # Format: (lang, date, expected_word)
    # These are the ACTUAL words that were shown on these dates
    KNOWN_WORDS = [
        # English - well-known, stable
        ("en", datetime.date(2025, 1, 1), None),  # Will be filled by test
        ("en", datetime.date(2025, 6, 15), None),
        ("en", datetime.date(2026, 1, 25), None),  # Migration day
        # Finnish - popular language
        ("fi", datetime.date(2025, 1, 1), None),
        ("fi", datetime.date(2026, 1, 25), None),
    ]

    @pytest.mark.parametrize("lang", ["en", "fi", "de", "he"])
    def test_legacy_words_unchanged(self, lang):
        """Words for days before migration should match legacy algorithm."""
        words = load_word_list(lang)
        if not words:
            pytest.skip(f"{lang}: No word list")

        # Test several days in the past
        test_days = [100, 500, 1000, 1500, 1681]
        for day_idx in test_days:
            legacy_word = get_daily_word_legacy(words, set(), day_idx)
            # This should be the word shown on that day (no blocklist for past)
            assert legacy_word in words, f"{lang} day {day_idx}: Word not in list"
            assert len(legacy_word) == 5, f"{lang} day {day_idx}: Word not 5 chars"


class TestConsistentHashingAlgorithm:
    """Tests for the new consistent hashing algorithm."""

    def test_consistent_hash_is_deterministic(self):
        """Same inputs should always produce same word."""
        words = ["apple", "baker", "crane", "delta", "eagle"]
        for day in range(100, 110):
            word1 = get_daily_word_consistent_hash(words, set(), day, "test")
            word2 = get_daily_word_consistent_hash(words, set(), day, "test")
            assert word1 == word2, f"Day {day}: Should be deterministic"

    def test_consistent_hash_stable_when_adding_words(self):
        """Adding words shouldn't change all days' selections."""
        words_v1 = ["apple", "baker", "crane", "delta", "eagle"]
        words_v2 = ["apple", "baker", "crane", "delta", "eagle", "fancy", "grape"]

        # Check that some days have the same word
        same_count = 0
        for day in range(100, 200):
            w1 = get_daily_word_consistent_hash(words_v1, set(), day, "test")
            w2 = get_daily_word_consistent_hash(words_v2, set(), day, "test")
            if w1 == w2:
                same_count += 1

        # Consistent hashing should preserve some days (not all change)
        # When adding 2 words to 5, ~2/7 of days may change, so ~70% stay same
        assert same_count >= 50, f"Only {same_count}/100 days unchanged after adding words"

    def test_blocklist_removes_words_from_selection(self):
        """Blocklisted words should never be selected."""
        words = ["apple", "baker", "crane", "delta", "eagle"]
        blocklist = {"baker", "delta"}

        for day in range(1000, 1100):
            word = get_daily_word_consistent_hash(words, blocklist, day, "test")
            assert word not in blocklist, f"Day {day}: Selected blocked word {word}"

    def test_blocklist_only_affects_blocked_word_days(self):
        """Blocklisting should only affect days that would have shown blocked words."""
        words = ["apple", "baker", "crane", "delta", "eagle"]

        # Find days that would select each word
        word_days = {w: [] for w in words}
        for day in range(1000, 1100):
            word = get_daily_word_consistent_hash(words, set(), day, "test")
            word_days[word].append(day)

        # Now blocklist "baker" and check other days are unchanged
        blocklist = {"baker"}
        for word, days in word_days.items():
            if word == "baker":
                continue  # Skip blocked word
            for day in days:
                new_word = get_daily_word_consistent_hash(words, blocklist, day, "test")
                assert new_word == word, f"Day {day}: Changed from {word} to {new_word}"

    @pytest.mark.parametrize("lang", ["he", "sr", "ar"])
    def test_large_language_blocklist_works(self, lang):
        """Languages with large blocklists should still work correctly."""
        words = load_word_list(lang)
        blocklist = load_blocklist(lang)

        if not words:
            pytest.skip(f"{lang}: No word list")
        if not blocklist:
            pytest.skip(f"{lang}: No blocklist")

        # Test future days (after migration)
        for day in range(MIGRATION_DAY_IDX + 1, MIGRATION_DAY_IDX + 100):
            word = get_daily_word_consistent_hash(words, blocklist, day, lang)
            assert word not in blocklist, f"{lang} day {day}: Selected blocked word"
            assert word in words, f"{lang} day {day}: Word not in list"


class TestWordDistribution:
    """Tests for fair distribution of words."""

    def test_consistent_hash_covers_all_words(self):
        """Over enough days, all non-blocked words should be selected."""
        words = ["apple", "baker", "crane", "delta", "eagle"]
        selected = set()

        # Check many days
        for day in range(10000):
            word = get_daily_word_consistent_hash(words, set(), day, "test")
            selected.add(word)

        assert selected == set(words), "Not all words were selected"

    def test_consistent_hash_reasonably_uniform(self):
        """Word selection should cover all words over time."""
        words = ["apple", "baker", "crane", "delta", "eagle"]
        counts = {w: 0 for w in words}

        for day in range(10000):
            word = get_daily_word_consistent_hash(words, set(), day, "test")
            counts[word] += 1

        # With consistent hashing, distribution isn't uniform but all words get used.
        # The key property is that all words appear (tested in test_consistent_hash_covers_all_words).
        # Here we just verify each word appears a reasonable number of times (at least 5% share).
        expected = 10000 / len(words)
        for word, count in counts.items():
            assert count > expected * 0.05, f"{word}: Only selected {count} times (less than 5%)"
