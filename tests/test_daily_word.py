"""
Tests for daily word selection algorithm.

These tests ensure the daily word selection is deterministic and consistent.
The algorithm must produce the same word for the same day across all instances.
"""

import pytest
import datetime
import random
from tests.conftest import ALL_LANGUAGES, load_word_list


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
