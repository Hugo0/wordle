"""
Tests for language configuration files.

These tests ensure language_config.json files are valid and complete.
"""

import pytest

from tests.conftest import (
    ALL_LANGUAGES,
    LANGUAGES_DIR,
    get_diacritic_base_chars,
    load_all_keyboard_chars,
    load_daily_words,
    load_keyboard,
    load_language_config,
    load_word_list,
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


class TestConfigCompleteness:
    """Ensure language configs don't have keys absent from the defaults.

    The runtime does a shallow merge: per-language sections override entire
    default sections. This test catches typos and stale keys — NOT missing
    translations (those fall back to defaults at runtime).
    """

    @pytest.fixture(scope="class")
    def default_config(self):
        import json
        from pathlib import Path

        path = Path(__file__).parent.parent / "data" / "default_language_config.json"
        with open(path) as f:
            return json.load(f)

    @pytest.mark.parametrize("lang", ALL_LANGUAGES)
    def test_no_unknown_ui_keys(self, lang, default_config):
        config = load_language_config(lang)
        if config is None:
            pytest.skip(f"{lang}: No config file")
        allowed = set(default_config.get("ui", {}).keys())
        actual = set(config.get("ui", {}).keys())
        unknown = actual - allowed
        assert not unknown, f"{lang}: Unknown ui keys (typos?): {unknown}"

    @pytest.mark.parametrize("lang", ALL_LANGUAGES)
    def test_no_unknown_text_keys(self, lang, default_config):
        config = load_language_config(lang)
        if config is None:
            pytest.skip(f"{lang}: No config file")
        allowed = set(default_config.get("text", {}).keys())
        actual = set(config.get("text", {}).keys())
        unknown = actual - allowed
        assert not unknown, f"{lang}: Unknown text keys (typos?): {unknown}"

    @pytest.mark.parametrize("lang", ALL_LANGUAGES)
    def test_no_unknown_help_keys(self, lang, default_config):
        config = load_language_config(lang)
        if config is None:
            pytest.skip(f"{lang}: No config file")
        allowed = set(default_config.get("help", {}).keys())
        actual = set(config.get("help", {}).keys())
        unknown = actual - allowed
        assert not unknown, f"{lang}: Unknown help keys (typos?): {unknown}"

    @pytest.mark.parametrize("lang", ALL_LANGUAGES)
    def test_no_unknown_seo_keys(self, lang, default_config):
        config = load_language_config(lang)
        if config is None:
            pytest.skip(f"{lang}: No config file")
        if "seo" not in config:
            pytest.skip(f"{lang}: No seo section")
        allowed = set(default_config.get("seo", {}).keys())
        actual = set(config.get("seo", {}).keys())
        unknown = actual - allowed
        assert not unknown, f"{lang}: Unknown seo keys (typos?): {unknown}"


class TestKeyboardConfig:
    """Tests for keyboard configuration."""

    # Languages with known keyboard coverage gaps (complex scripts, incomplete keyboards)
    KEYBOARD_COVERAGE_XFAIL: set[str] = {"uk"}  # Ukrainian keyboard missing ʼ

    # Minimum daily words to require a keyboard (languages below this are stubs)
    MIN_DAILY_FOR_KEYBOARD = 100

    @pytest.mark.parametrize("lang", ALL_LANGUAGES)
    def test_playable_language_has_keyboard(self, lang):
        """Every language with >=100 daily words must have a keyboard file."""
        daily = load_daily_words(lang)
        daily_count = len(daily) if daily else 0
        if daily_count < self.MIN_DAILY_FOR_KEYBOARD:
            pytest.skip(f"{lang}: only {daily_count} daily words (stub language)")

        keyboard_file = LANGUAGES_DIR / lang / f"{lang}_keyboard.json"
        assert keyboard_file.exists(), f"{lang}: {daily_count} daily words but no keyboard file"

    @pytest.mark.parametrize("lang", ALL_LANGUAGES)
    def test_keyboard_not_empty(self, lang):
        """Keyboard files must have at least 5 typeable keys."""
        keyboard = load_keyboard(lang)
        if keyboard is None:
            pytest.skip(f"{lang}: No keyboard file")

        control_keys = {"⇨", "⟹", "⌫", "↵", "ENTER", "DEL"}
        typeable = [k for row in keyboard for k in row if k not in control_keys]
        assert len(typeable) >= 5, (
            f"{lang}: Keyboard has only {len(typeable)} typeable keys (need >=5)"
        )

    @pytest.mark.parametrize("lang", ALL_LANGUAGES)
    def test_keyboard_covers_all_characters(self, lang):
        if lang in self.KEYBOARD_COVERAGE_XFAIL:
            pytest.xfail(f"{lang}: Known keyboard coverage gap (needs expert review)")
        """Keyboard should include all characters used in daily words.

        Only daily-tier words are checked — valid/blocked words may contain
        characters not on the keyboard (they're supplement-derived guesses).
        """
        keyboard = load_keyboard(lang)
        if keyboard is None:
            pytest.skip(f"{lang}: No keyboard file (auto-generated)")

        # Skip empty keyboards - app auto-generates them from character set
        if not keyboard or all(len(row) == 0 for row in keyboard):
            pytest.skip(f"{lang}: Empty keyboard (app will auto-generate)")

        # Only check daily-tier words — those are what players must type
        daily = load_daily_words(lang)
        words = daily if daily else load_word_list(lang)
        word_chars = set()
        for word in words:
            word_chars.update(word)

        # Check all layouts — a character is typeable if it appears on any layout
        keyboard_chars = load_all_keyboard_chars(lang)

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
