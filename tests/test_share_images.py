"""
Tests for share preview images (OG images).

Ensures every language with a language_config.json has share images
for all 7 result variants (1-6 wins + x loss).
"""

from pathlib import Path

import pytest

PROJECT_ROOT = Path(__file__).parent.parent
SHARE_DIR = PROJECT_ROOT / "public" / "images" / "share"
LANG_DIR = PROJECT_ROOT / "data" / "languages"

ALL_LANGUAGES = sorted(
    d.name for d in LANG_DIR.iterdir() if d.is_dir() and (d / "language_config.json").exists()
)

RESULTS = ["1", "2", "3", "4", "5", "6", "x"]


class TestShareImages:
    """Every language must have share images for social previews."""

    @pytest.mark.parametrize("lang", ALL_LANGUAGES)
    def test_share_images_exist(self, lang):
        """Each language should have 7 share images ({lang}_1..6.png + {lang}_x.png)."""
        missing = []
        for r in RESULTS:
            path = SHARE_DIR / f"{lang}_{r}.png"
            if not path.exists():
                missing.append(f"{lang}_{r}.png")

        assert not missing, (
            f"Missing share images for {lang}: {missing}. "
            f"Run: uv run python scripts/generate_share_images.py {lang}"
        )

    def test_share_dir_has_no_orphans(self):
        """Share images should only exist for known languages."""
        if not SHARE_DIR.exists():
            pytest.skip("Share directory doesn't exist yet")

        known = set(ALL_LANGUAGES)
        orphans = set()
        for f in SHARE_DIR.glob("*.png"):
            lang_code = f.stem.rsplit("_", 1)[0]
            if lang_code not in known:
                orphans.add(lang_code)

        assert not orphans, f"Share images exist for unknown languages: {sorted(orphans)}"
