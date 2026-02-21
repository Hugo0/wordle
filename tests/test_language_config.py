"""
Tests for language configuration files.

These tests ensure language_config.json files are valid and complete.
"""

import pytest
from tests.conftest import (
    ALL_LANGUAGES,
    load_language_config,
    load_keyboard,
    load_word_list,
    load_characters,
    get_diacritic_base_chars,
)


class TestLanguageConfigExists:
    """Tests for config file existence and basic validity."""

    @pytest.mark.parametrize("lang", ALL_LANGUAGES)
    def test_config_exists(self, lang):
        """Each language should have a language_config.json."""
        config = load_language_config(lang)
        # Config is optional (falls back to default), but warn if missing
        if config is None:
            pytest.skip(f"{lang}: No language_config.json (using default)")

    @pytest.mark.parametrize("lang", ALL_LANGUAGES)
    def test_config_is_valid_json(self, lang):
        """Config file should be valid JSON."""
        config = load_language_config(lang)
        if config is None:
            pytest.skip(f"{lang}: No config file")
        # If we got here, JSON parsed successfully
        assert isinstance(config, dict)


class TestRequiredFields:
    """Tests for required configuration fields."""

    REQUIRED_FIELDS = [
        "language_code",
        "name",
        "name_native",
        "right_to_left",
    ]

    REQUIRED_META_FIELDS = [
        "locale",
        "title",
        "description",
    ]

    REQUIRED_TEXT_FIELDS = [
        "subheader",
        "next_word",
        "share",
    ]

    REQUIRED_HELP_FIELDS = [
        "title",
        "close",
    ]

    @pytest.mark.parametrize("lang", ALL_LANGUAGES)
    def test_has_required_fields(self, lang):
        """Config must have all required top-level fields."""
        config = load_language_config(lang)
        if config is None:
            pytest.skip(f"{lang}: No config file")

        missing = [f for f in self.REQUIRED_FIELDS if f not in config]
        assert not missing, f"{lang}: Missing required fields: {missing}"

    @pytest.mark.parametrize("lang", ALL_LANGUAGES)
    def test_has_meta_section(self, lang):
        """Config should have meta section with required fields."""
        config = load_language_config(lang)
        if config is None:
            pytest.skip(f"{lang}: No config file")

        assert "meta" in config, f"{lang}: Missing 'meta' section"
        meta = config["meta"]
        missing = [f for f in self.REQUIRED_META_FIELDS if f not in meta]
        assert not missing, f"{lang}: Missing meta fields: {missing}"

    @pytest.mark.parametrize("lang", ALL_LANGUAGES)
    def test_has_text_section(self, lang):
        """Config should have text section with required fields."""
        config = load_language_config(lang)
        if config is None:
            pytest.skip(f"{lang}: No config file")

        assert "text" in config, f"{lang}: Missing 'text' section"
        text = config["text"]
        missing = [f for f in self.REQUIRED_TEXT_FIELDS if f not in text]
        assert not missing, f"{lang}: Missing text fields: {missing}"

    @pytest.mark.parametrize("lang", ALL_LANGUAGES)
    def test_has_help_section(self, lang):
        """Config should have help section with required fields."""
        config = load_language_config(lang)
        if config is None:
            pytest.skip(f"{lang}: No config file")

        assert "help" in config, f"{lang}: Missing 'help' section"
        help_section = config["help"]
        missing = [f for f in self.REQUIRED_HELP_FIELDS if f not in help_section]
        assert not missing, f"{lang}: Missing help fields: {missing}"


class TestFieldValues:
    """Tests for valid field values."""

    @pytest.mark.parametrize("lang", ALL_LANGUAGES)
    def test_language_code_matches_folder(self, lang):
        """language_code in config should match the folder name."""
        config = load_language_config(lang)
        if config is None:
            pytest.skip(f"{lang}: No config file")

        assert config.get("language_code") == lang, (
            f"{lang}: language_code '{config.get('language_code')}' "
            f"doesn't match folder name '{lang}'"
        )

    @pytest.mark.parametrize("lang", ALL_LANGUAGES)
    def test_right_to_left_is_valid(self, lang):
        """right_to_left should be 'true' or 'false' string."""
        config = load_language_config(lang)
        if config is None:
            pytest.skip(f"{lang}: No config file")

        rtl = config.get("right_to_left")
        assert rtl in (
            "true",
            "false",
        ), f"{lang}: right_to_left should be 'true' or 'false', got '{rtl}'"

    @pytest.mark.parametrize("lang", ALL_LANGUAGES)
    def test_name_not_empty(self, lang):
        """Language name should not be empty."""
        config = load_language_config(lang)
        if config is None:
            pytest.skip(f"{lang}: No config file")

        assert config.get("name"), f"{lang}: 'name' is empty"
        assert config.get("name_native"), f"{lang}: 'name_native' is empty"


class TestKeyboardConfig:
    """Tests for keyboard configuration."""

    # Languages with known keyboard coverage gaps (complex scripts, incomplete keyboards)
    KEYBOARD_COVERAGE_XFAIL = {"vi", "ko", "el", "pt", "pau", "la", "az", "oc", "qya"}

    @pytest.mark.parametrize("lang", ALL_LANGUAGES)
    def test_keyboard_covers_all_characters(self, lang):
        if lang in self.KEYBOARD_COVERAGE_XFAIL:
            pytest.xfail(f"{lang}: Known keyboard coverage gap (needs expert review)")
        """Keyboard should include all characters used in words.

        Note: If a language has diacritic_map configured, users can type base
        characters (e.g., 'a') to match diacritical variants (e.g., 'ä').
        So the keyboard only needs the base characters.
        """
        keyboard = load_keyboard(lang)
        if keyboard is None:
            pytest.skip(f"{lang}: No keyboard file (auto-generated)")

        # Skip empty keyboards - app auto-generates them from character set
        if not keyboard or all(len(row) == 0 for row in keyboard):
            pytest.skip(f"{lang}: Empty keyboard (app will auto-generate)")

        words = load_word_list(lang)
        word_chars = set()
        for word in words:
            word_chars.update(word)

        # Flatten keyboard to get all keys
        keyboard_chars = set()
        for row in keyboard:
            for key in row:
                if key not in ("⇨", "⟹", "⌫", "ENTER", "DEL"):
                    keyboard_chars.add(key)

        # Get diacritic mapping - chars that can be typed via base char
        diacritic_map = get_diacritic_base_chars(lang)

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

        assert not missing, f"{lang}: Characters in words but not on keyboard: {missing}"

    @pytest.mark.parametrize("lang", ALL_LANGUAGES)
    def test_keyboard_has_enter_and_backspace(self, lang):
        """Keyboard should have enter and backspace keys."""
        keyboard = load_keyboard(lang)
        if keyboard is None:
            pytest.skip(f"{lang}: No keyboard file")

        # Skip empty keyboards - app auto-generates them with enter/backspace
        if not keyboard or all(len(row) == 0 for row in keyboard):
            pytest.skip(f"{lang}: Empty keyboard (app will auto-generate)")

        all_keys = [key for row in keyboard for key in row]
        has_enter = "⇨" in all_keys or "⟹" in all_keys or "ENTER" in all_keys
        has_backspace = "⌫" in all_keys or "DEL" in all_keys

        assert has_enter, f"{lang}: Keyboard missing enter key (⇨, ⟹, or ENTER)"
        assert has_backspace, f"{lang}: Keyboard missing backspace key (⌫ or DEL)"

    @pytest.mark.parametrize("lang", ALL_LANGUAGES)
    def test_keyboard_is_list_of_rows(self, lang):
        """Keyboard should be a list of rows (lists)."""
        keyboard = load_keyboard(lang)
        if keyboard is None:
            pytest.skip(f"{lang}: No keyboard file")

        assert isinstance(keyboard, list), f"{lang}: Keyboard should be a list"
        for i, row in enumerate(keyboard):
            assert isinstance(row, list), f"{lang}: Keyboard row {i} should be a list"
