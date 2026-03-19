#!/usr/bin/env python3
"""Clean up language_config.json files across all languages.

1. Remove dead keys (replaced by newer keys during Nuxt migration)
2. Rename kebab-case keys to snake_case for consistency
"""

import json
from pathlib import Path

LANGUAGES_DIR = Path(__file__).parent.parent / "data" / "languages"

# Keys that are no longer referenced in any Vue template or TypeScript code
DEAD_KEYS = {
    "ui": {
        "easy_mode",
        "easy_mode_label",
        "haptic_feedback",
        "haptic_feedback_desc",
        "show_definitions",
        "show_definitions_desc",
        "sound_effects",
        "sound_effects_desc",
        "word_art",
        "word_art_desc",
    },
}

# Kebab-case → snake_case renames
RENAMES = {
    "text": {
        "notification-copied": "notification_copied",
        "notification-word-not-valid": "notification_word_not_valid",
        "notification-partial-word": "notification_partial_word",
    },
}


def cleanup_config(config: dict) -> tuple[dict, int, int]:
    """Clean a single config dict. Returns (cleaned_config, keys_removed, keys_renamed)."""
    removed = 0
    renamed = 0

    for section, dead_keys in DEAD_KEYS.items():
        if section in config:
            for key in dead_keys:
                if key in config[section]:
                    del config[section][key]
                    removed += 1

    for section, rename_map in RENAMES.items():
        if section in config:
            for old_key, new_key in rename_map.items():
                if old_key in config[section]:
                    config[section][new_key] = config[section].pop(old_key)
                    renamed += 1

    return config, removed, renamed


def main():
    # Clean default config
    default_path = LANGUAGES_DIR.parent / "default_language_config.json"
    with open(default_path, encoding="utf-8") as f:
        default_config = json.load(f)

    default_config, d_removed, d_renamed = cleanup_config(default_config)
    with open(default_path, "w", encoding="utf-8") as f:
        json.dump(default_config, f, ensure_ascii=False, indent=4)
        f.write("\n")
    print(f"default: removed {d_removed}, renamed {d_renamed}")

    # Clean all language configs
    total_removed = d_removed
    total_renamed = d_renamed

    for lang_dir in sorted(LANGUAGES_DIR.iterdir()):
        config_path = lang_dir / "language_config.json"
        if not config_path.exists():
            continue

        with open(config_path, encoding="utf-8") as f:
            config = json.load(f)

        config, removed, renamed = cleanup_config(config)

        with open(config_path, "w", encoding="utf-8") as f:
            json.dump(config, f, ensure_ascii=False, indent=4)
            f.write("\n")

        if removed or renamed:
            print(f"  {lang_dir.name}: removed {removed}, renamed {renamed}")
            total_removed += removed
            total_renamed += renamed

    print(f"\nTotal: {total_removed} keys removed, {total_renamed} keys renamed")


if __name__ == "__main__":
    main()
