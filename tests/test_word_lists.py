"""
Tests for word list validation across all languages.

These tests ensure word lists meet the requirements:
- All words are exactly 5 characters
- All words use only valid characters for that language
- No duplicate words
- Words are lowercase (normalized)
"""

import re

import pytest
from tests.conftest import (
    ALL_LANGUAGES,
    load_word_list,
    load_supplement_words,
    load_daily_words,
    load_blocklist,
    load_characters,
    load_keyboard,
    get_diacritic_base_chars,
)


class TestWordListBasics:
    """Basic word list validation tests."""

    # Pre-existing data quality issues (not code bugs)
    LOWERCASE_XFAIL = {"pt", "pau"}
    DUPLICATE_XFAIL = {"pau"}
    SUPPLEMENT_LENGTH_XFAIL = {"ckb"}

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
        if lang in self.SUPPLEMENT_LENGTH_XFAIL:
            pytest.xfail(f"{lang}: Known supplement word length issue")
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
        if lang in self.DUPLICATE_XFAIL:
            pytest.xfail(f"{lang}: Known duplicate words in word list")
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
        if lang in self.LOWERCASE_XFAIL:
            pytest.xfail(f"{lang}: Known uppercase words in word list")
        words = load_word_list(lang)
        uppercase = [w for w in words if w != w.lower()]
        assert not uppercase, (
            f"{lang}: Found {len(uppercase)} words with uppercase. " f"Examples: {uppercase[:5]}"
        )


class TestCharacterConsistency:
    """Tests for character set consistency."""

    # Pre-existing character set mismatches
    CHARACTER_XFAIL = {"az", "pt", "pau"}

    @pytest.mark.parametrize("lang", ALL_LANGUAGES)
    def test_words_use_valid_characters(self, lang):
        """All characters in words must be in the language's character set."""
        if lang in self.CHARACTER_XFAIL:
            pytest.xfail(f"{lang}: Known character set mismatch")
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
        if lang in self.CHARACTER_XFAIL:
            pytest.xfail(f"{lang}: Known character set mismatch")
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


class TestKeyboardCoverage:
    """Tests for keyboard coverage of word characters."""

    # Languages with known keyboard coverage gaps (complex scripts, incomplete keyboards)
    KEYBOARD_COVERAGE_XFAIL = {"vi", "ko", "el", "pt", "pau"}

    @pytest.mark.parametrize("lang", ALL_LANGUAGES)
    def test_keyboard_covers_all_word_characters(self, lang):
        if lang in self.KEYBOARD_COVERAGE_XFAIL:
            pytest.xfail(f"{lang}: Known keyboard coverage gap (needs expert review)")
        """All characters used in words must be typeable on the keyboard.

        Note: If a language has diacritic_map configured, users can type base
        characters (e.g., 'a') to match diacritical variants (e.g., 'ä').
        So the keyboard only needs the base characters.
        """
        words = load_word_list(lang)
        keyboard = load_keyboard(lang)

        if keyboard is None:
            pytest.skip(f"{lang}: No keyboard file (will use auto-generated)")

        # Skip empty keyboards - app auto-generates them from character set
        if not keyboard or all(len(row) == 0 for row in keyboard):
            pytest.skip(f"{lang}: Empty keyboard (app will auto-generate)")

        # Extract all characters from keyboard (load_keyboard returns normalized rows)
        keyboard_chars = set()
        for row in keyboard:
            for key in row:
                # Skip control keys
                if key not in ["⇨", "⟹", "⌫", "↵", "ENTER", "DEL"]:
                    keyboard_chars.add(key)

        if not keyboard_chars:
            pytest.skip(f"{lang}: Empty keyboard layout")

        # Get diacritic mapping - chars that can be typed via base char
        diacritic_map = get_diacritic_base_chars(lang)

        # Collect all unique characters from words
        word_chars = set()
        for word in words:
            word_chars.update(word)

        # Find characters in words but not on keyboard
        # Account for diacritic normalization: if 'ä' maps to 'a' and 'a' is on keyboard, it's fine
        missing = set()
        for char in word_chars:
            if char in keyboard_chars:
                continue
            # Check if this char can be typed via diacritic normalization
            base_char = diacritic_map.get(char)
            if base_char and base_char in keyboard_chars:
                continue
            missing.add(char)

        assert not missing, (
            f"{lang}: Characters in words but missing from keyboard: {missing}. "
            f"Keyboard has {len(keyboard_chars)} chars, words use {len(word_chars)} chars."
        )

    @pytest.mark.parametrize("lang", ALL_LANGUAGES)
    def test_keyboard_has_all_character_set_chars(self, lang):
        """Keyboard should include all characters from the character set."""
        chars = set(load_characters(lang))
        keyboard = load_keyboard(lang)

        if not chars:
            pytest.skip(f"{lang}: No character file")
        if keyboard is None:
            pytest.skip(f"{lang}: No keyboard file")

        # Skip empty keyboards - app auto-generates them from character set
        if not keyboard or all(len(row) == 0 for row in keyboard):
            pytest.skip(f"{lang}: Empty keyboard (app will auto-generate)")

        # Extract all characters from keyboard (load_keyboard returns normalized rows)
        keyboard_chars = set()
        for row in keyboard:
            for key in row:
                if key not in ["⇨", "⟹", "⌫", "↵", "ENTER", "DEL"]:
                    keyboard_chars.add(key)

        if not keyboard_chars:
            pytest.skip(f"{lang}: Empty keyboard layout")

        # Find characters in character set but not on keyboard
        missing = chars - keyboard_chars
        if missing:
            # This is a warning, not a failure - some chars may be rare
            pytest.skip(
                f"{lang}: Character set has {len(missing)} chars not on keyboard: "
                f"{list(missing)[:10]}..."
            )


class TestDailyWords:
    """Tests for curated daily word lists."""

    # Pre-existing data issues
    SUPPLEMENT_OVERLAP_XFAIL = {"pl", "ckb"}  # Pre-existing supplement/main overlap

    @pytest.mark.parametrize("lang", ALL_LANGUAGES)
    def test_daily_words_subset_of_main(self, lang):
        """Daily words must be a subset of the main word list."""
        daily = load_daily_words(lang)
        if not daily:
            pytest.skip(f"{lang}: No daily words file")
        main = set(load_word_list(lang))
        invalid = [w for w in daily if w not in main]
        assert not invalid, (
            f"{lang}: {len(invalid)} daily words not in main list. " f"Examples: {invalid[:5]}"
        )

    @pytest.mark.parametrize("lang", ALL_LANGUAGES)
    def test_daily_words_no_duplicates(self, lang):
        """No duplicate words in daily words file."""
        daily = load_daily_words(lang)
        if not daily:
            pytest.skip(f"{lang}: No daily words file")
        seen = set()
        duplicates = []
        for w in daily:
            if w in seen:
                duplicates.append(w)
            seen.add(w)
        assert not duplicates, (
            f"{lang}: {len(duplicates)} duplicate daily words. " f"Examples: {duplicates[:10]}"
        )

    @pytest.mark.parametrize("lang", ALL_LANGUAGES)
    def test_daily_words_are_5_letters(self, lang):
        """All daily words must be exactly 5 letters."""
        daily = load_daily_words(lang)
        if not daily:
            pytest.skip(f"{lang}: No daily words file")
        invalid = [(w, len(w)) for w in daily if len(w) != 5]
        assert not invalid, (
            f"{lang}: {len(invalid)} daily words with wrong length. " f"Examples: {invalid[:5]}"
        )

    @pytest.mark.parametrize("lang", ALL_LANGUAGES)
    def test_supplement_disjoint_from_main(self, lang):
        """Supplement words must not overlap with main word list."""
        if lang in self.SUPPLEMENT_OVERLAP_XFAIL:
            pytest.xfail(f"{lang}: Known supplement/main overlap")
        supplement = load_supplement_words(lang)
        if not supplement:
            pytest.skip(f"{lang}: No supplement word list")
        main = set(load_word_list(lang))
        overlap = [w for w in supplement if w in main]
        assert not overlap, (
            f"{lang}: {len(overlap)} supplement words also in main list. "
            f"Examples: {overlap[:5]}"
        )


class TestWordListQuality:
    """Tests for word list quality (warnings, not failures)."""

    WHITESPACE_XFAIL = {"pt"}

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
        if lang in self.WHITESPACE_XFAIL:
            pytest.xfail(f"{lang}: Known whitespace in word list")
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


class TestDailyWordQuality:
    """Tests for daily word list quality — blocklist, Roman numerals."""

    _ROMAN_RE = re.compile(r"^[ivxlcdm]+$")

    @classmethod
    def _is_roman_numeral(cls, word: str) -> bool:
        if not cls._ROMAN_RE.match(word):
            return False
        roman_values = {"i": 1, "v": 5, "x": 10, "l": 50, "c": 100, "d": 500, "m": 1000}
        valid_sub = {("i", "v"), ("i", "x"), ("x", "l"), ("x", "c"), ("c", "d"), ("c", "m")}
        total = 0
        i = 0
        while i < len(word):
            if i + 1 < len(word) and roman_values[word[i]] < roman_values[word[i + 1]]:
                if (word[i], word[i + 1]) not in valid_sub:
                    return False
                total += roman_values[word[i + 1]] - roman_values[word[i]]
                i += 2
            else:
                total += roman_values[word[i]]
                i += 1
        return total > 0

    @pytest.mark.parametrize("lang", ALL_LANGUAGES)
    def test_daily_words_not_in_blocklist(self, lang):
        """Daily words should not overlap with blocklist."""
        daily = load_daily_words(lang)
        if not daily:
            pytest.skip(f"{lang}: No daily words")
        blocklist = load_blocklist(lang)
        if not blocklist:
            pytest.skip(f"{lang}: No blocklist")
        overlap = set(daily) & blocklist
        assert not overlap, (
            f"{lang}: {len(overlap)} daily words in blocklist. " f"Examples: {sorted(overlap)[:10]}"
        )

    @pytest.mark.parametrize("lang", ALL_LANGUAGES)
    def test_no_roman_numerals_in_daily_words(self, lang):
        """Daily words should not contain Roman numerals."""
        daily = load_daily_words(lang)
        if not daily:
            pytest.skip(f"{lang}: No daily words")
        romans = [w for w in daily if self._is_roman_numeral(w)]
        assert not romans, f"{lang}: Found Roman numerals in daily words: {romans[:10]}"
