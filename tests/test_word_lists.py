"""
Tests for word list validation across all languages.

These tests ensure word lists meet the requirements:
- All words are exactly 5 characters
- All words use only valid characters for that language
- No duplicate words
- Words are lowercase (normalized)
"""

import pytest
from tests.conftest import (
    ALL_LANGUAGES,
    load_word_list,
    load_supplement_words,
    load_characters,
)


class TestWordListBasics:
    """Basic word list validation tests."""

    @pytest.mark.parametrize("lang", ALL_LANGUAGES)
    def test_word_list_exists(self, lang):
        """Each language must have a word list."""
        words = load_word_list(lang)
        assert len(words) > 0, f"{lang}: Word list is empty or missing"

    @pytest.mark.parametrize("lang", ALL_LANGUAGES)
    def test_all_words_are_5_letters(self, lang):
        """All words must be exactly 5 characters."""
        words = load_word_list(lang)
        invalid = [(w, len(w)) for w in words if len(w) != 5]
        assert not invalid, (
            f"{lang}: Found {len(invalid)} words with wrong length. " f"Examples: {invalid[:5]}"
        )

    @pytest.mark.parametrize("lang", ALL_LANGUAGES)
    def test_supplement_words_are_5_letters(self, lang):
        """Supplemental words must also be exactly 5 characters."""
        words = load_supplement_words(lang)
        if not words:
            pytest.skip(f"{lang}: No supplement word list")
        invalid = [(w, len(w)) for w in words if len(w) != 5]
        assert not invalid, (
            f"{lang}: Found {len(invalid)} supplement words with wrong length. "
            f"Examples: {invalid[:5]}"
        )

    @pytest.mark.parametrize("lang", ALL_LANGUAGES)
    def test_no_duplicate_words(self, lang):
        """Word list should not have duplicates."""
        words = load_word_list(lang)
        seen = set()
        duplicates = []
        for w in words:
            if w in seen:
                duplicates.append(w)
            seen.add(w)
        assert not duplicates, (
            f"{lang}: Found {len(duplicates)} duplicate words. " f"Examples: {duplicates[:10]}"
        )

    @pytest.mark.parametrize("lang", ALL_LANGUAGES)
    def test_words_are_lowercase(self, lang):
        """All words should be lowercase."""
        words = load_word_list(lang)
        uppercase = [w for w in words if w != w.lower()]
        assert not uppercase, (
            f"{lang}: Found {len(uppercase)} words with uppercase. " f"Examples: {uppercase[:5]}"
        )


class TestCharacterConsistency:
    """Tests for character set consistency."""

    @pytest.mark.parametrize("lang", ALL_LANGUAGES)
    def test_words_use_valid_characters(self, lang):
        """All characters in words must be in the language's character set."""
        words = load_word_list(lang)
        chars = set(load_characters(lang))

        if not chars:
            pytest.skip(f"{lang}: No character file")

        invalid_words = []
        for word in words:
            invalid_chars = [c for c in word if c not in chars]
            if invalid_chars:
                invalid_words.append((word, invalid_chars))

        assert not invalid_words, (
            f"{lang}: Found {len(invalid_words)} words with invalid characters. "
            f"Examples: {invalid_words[:5]}"
        )

    @pytest.mark.parametrize("lang", ALL_LANGUAGES)
    def test_all_word_chars_in_character_set(self, lang):
        """Character set should cover all characters used in words."""
        words = load_word_list(lang)
        chars = set(load_characters(lang))

        if not chars:
            pytest.skip(f"{lang}: No character file")

        # Collect all unique characters from words
        word_chars = set()
        for word in words:
            word_chars.update(word)

        missing = word_chars - chars
        assert (
            not missing
        ), f"{lang}: Characters used in words but missing from character set: {missing}"


class TestWordListQuality:
    """Tests for word list quality (warnings, not failures)."""

    @pytest.mark.parametrize("lang", ALL_LANGUAGES)
    def test_minimum_word_count(self, lang):
        """Warn if word list has fewer than 100 words."""
        words = load_word_list(lang)
        if len(words) < 100:
            pytest.skip(
                f"{lang}: Only {len(words)} words - may run out quickly. "
                "Consider adding more words."
            )

    @pytest.mark.parametrize("lang", ALL_LANGUAGES)
    def test_no_whitespace_in_words(self, lang):
        """Words should not contain whitespace."""
        words = load_word_list(lang)
        with_whitespace = [w for w in words if any(c.isspace() for c in w)]
        assert not with_whitespace, f"{lang}: Found words with whitespace: {with_whitespace[:5]}"

    @pytest.mark.parametrize("lang", ALL_LANGUAGES)
    def test_words_are_alphabetic(self, lang):
        """Words should only contain letters (language-specific)."""
        words = load_word_list(lang)
        # This is a soft check - some languages may have valid non-alpha chars
        non_alpha = [w for w in words if not all(c.isalpha() for c in w)]
        if non_alpha:
            # Just warn, don't fail - some languages have diacritics etc
            pytest.skip(
                f"{lang}: {len(non_alpha)} words have non-alphabetic chars. "
                f"Examples: {non_alpha[:5]} (may be valid for this language)"
            )
