#!/usr/bin/env python3
"""Generate social share preview images (OG images) for all languages × results.

Produces 1200×630 PNGs in webapp/static/images/share/{lang}_{r}.png
where r is 1-6 (win) or x (loss).

Usage:
    uv run python scripts/generate_share_images.py
    uv run python scripts/generate_share_images.py en fi he  # specific languages only
"""

import json
import os
import sys

import arabic_reshaper
from bidi.algorithm import get_display
from PIL import Image, ImageDraw, ImageFont

# Paths
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(ROOT, "webapp", "data")
LANG_DIR = os.path.join(DATA_DIR, "languages")
OUTPUT_DIR = os.path.join(ROOT, "webapp", "static", "images", "share")
DEFAULT_CONFIG_PATH = os.path.join(DATA_DIR, "default_language_config.json")

# Image dimensions (standard OG image)
WIDTH, HEIGHT = 1200, 630

# Colors
BG_COLOR = (23, 23, 23)  # #171717
GREEN = (34, 197, 94)  # #22c55e
YELLOW = (234, 179, 8)  # #eab308
GRAY = (82, 82, 82)  # #525252
WHITE = (255, 255, 255)
LIGHT_GRAY = (163, 163, 163)  # #a3a3a3

# Wordle tile pattern for the logo (G=green, Y=yellow, X=gray)
TILE_PATTERN = ["G", "Y", "X", "G", "Y", "G"]
TILE_LETTERS = ["W", "O", "R", "D", "L", "E"]
TILE_COLORS = {"G": GREEN, "Y": YELLOW, "X": GRAY}

# Font paths
FONT_BASE = "/usr/share/fonts/truetype/noto"
BOLD_FONT = os.path.join(FONT_BASE, "NotoSans-Bold.ttf")
# DejaVu Sans covers Latin, Cyrillic, Greek, Arabic, Hebrew, Georgian, Armenian,
# Devanagari, Korean, and more — perfect for mixed-script challenge text
CHALLENGE_FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
LATIN_FONT = os.path.join(FONT_BASE, "NotoSans-Regular.ttf")

# Pre-load fonts (avoid repeated truetype() calls in hot loop)
FONTS = {}


def get_font(path, size):
    """Get a cached font instance."""
    key = (path, size)
    if key not in FONTS:
        FONTS[key] = ImageFont.truetype(path, size)
    return FONTS[key]


def prepare_bidi_text(text, is_rtl):
    """Reshape and reorder RTL text for correct Pillow rendering."""
    if not is_rtl:
        return text
    # Arabic script needs reshaping (letter joining) — apply to all RTL
    # since it's a no-op for Hebrew script
    text = arabic_reshaper.reshape(text)
    return get_display(text)


def draw_wordle_tiles(draw, y_center):
    """Draw the WORDLE letter tiles across the top."""
    tile_size = 56
    gap = 8
    total_width = len(TILE_LETTERS) * tile_size + (len(TILE_LETTERS) - 1) * gap
    start_x = (WIDTH - total_width) // 2
    font = get_font(BOLD_FONT, 34)

    for i, (letter, pattern) in enumerate(zip(TILE_LETTERS, TILE_PATTERN)):
        x = start_x + i * (tile_size + gap)
        color = TILE_COLORS[pattern]
        draw.rounded_rectangle(
            [x, y_center - tile_size // 2, x + tile_size, y_center + tile_size // 2],
            radius=6,
            fill=color,
        )
        bbox = draw.textbbox((0, 0), letter, font=font)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        draw.text(
            (x + (tile_size - tw) // 2, y_center - th // 2 - 2),
            letter,
            fill=WHITE,
            font=font,
        )


def wrap_text(text, font, draw, max_width):
    """Wrap text to fit within max_width pixels."""
    words = text.split()
    lines = []
    current_line = ""

    for word in words:
        test_line = f"{current_line} {word}".strip() if current_line else word
        bbox = draw.textbbox((0, 0), test_line, font=font)
        if bbox[2] - bbox[0] <= max_width:
            current_line = test_line
        else:
            if current_line:
                lines.append(current_line)
            current_line = word

    if current_line:
        lines.append(current_line)

    return lines


def draw_mini_tiles(draw, result, score_y):
    """Draw decorative mini tile grids flanking the score."""
    mini_size = 16
    mini_gap = 4
    n_rows = int(result) if result != "x" else 6
    solved_row = int(result) - 1 if result != "x" else -1

    for side in ("left", "right"):
        for row in range(n_rows):
            for col in range(5):
                if side == "left":
                    mx = 80 + col * (mini_size + mini_gap)
                else:
                    mx = WIDTH - 80 - (4 - col) * (mini_size + mini_gap) - mini_size
                my = score_y + 20 + row * (mini_size + mini_gap)

                if row == solved_row:
                    c = GREEN
                else:
                    offset = 0 if side == "left" else 1
                    v = (row + col + offset) % 3
                    c = GREEN if v == 0 else YELLOW if v == 1 else GRAY
                draw.rectangle([mx, my, mx + mini_size, my + mini_size], fill=c)


def generate_image(lang_code, result, challenge_text, is_rtl):
    """Generate a single share preview image."""
    img = Image.new("RGB", (WIDTH, HEIGHT), BG_COLOR)
    draw = ImageDraw.Draw(img)

    # 1. WORDLE tiles at top
    draw_wordle_tiles(draw, y_center=70)

    # 2. "WORDLE GLOBAL" text under tiles
    font_title = get_font(BOLD_FONT, 22)
    bbox = draw.textbbox((0, 0), "WORDLE GLOBAL", font=font_title)
    tw = bbox[2] - bbox[0]
    draw.text(((WIDTH - tw) // 2, 108), "WORDLE GLOBAL", fill=LIGHT_GRAY, font=font_title)

    # 3. Big score in the center
    if result == "x":
        score_text = "X/6"
        score_color = GRAY
    else:
        score_text = f"{result}/6"
        score_color = GREEN if int(result) <= 3 else YELLOW

    font_score = get_font(BOLD_FONT, 140)
    bbox = draw.textbbox((0, 0), score_text, font=font_score)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    score_y = 180
    draw.text(((WIDTH - tw) // 2, score_y), score_text, fill=score_color, font=font_score)

    # 4. Decorative mini tiles flanking the score
    draw_mini_tiles(draw, result, score_y)

    # 5. Challenge text (apply bidi reordering for RTL languages)
    display_text = prepare_bidi_text(challenge_text, is_rtl)
    font_challenge = get_font(CHALLENGE_FONT, 32)
    lines = wrap_text(display_text, font_challenge, draw, WIDTH - 160)
    text_y = 460
    for line in lines[:2]:  # Max 2 lines
        bbox = draw.textbbox((0, 0), line, font=font_challenge)
        tw = bbox[2] - bbox[0]
        x = (WIDTH - tw) // 2
        draw.text((x, text_y), line, fill=WHITE, font=font_challenge)
        text_y += 44

    # 6. URL at bottom
    font_url = get_font(LATIN_FONT, 20)
    url_text = f"wordle.global/{lang_code}"
    bbox = draw.textbbox((0, 0), url_text, font=font_url)
    tw = bbox[2] - bbox[0]
    draw.text(((WIDTH - tw) // 2, HEIGHT - 50), url_text, fill=LIGHT_GRAY, font=font_url)

    return img


def load_language_configs():
    """Load all language configs with default fallback (mirrors app.py pattern)."""
    with open(DEFAULT_CONFIG_PATH) as f:
        defaults = json.load(f)

    configs = {}
    for lang_code in sorted(os.listdir(LANG_DIR)):
        config_path = os.path.join(LANG_DIR, lang_code, "language_config.json")
        if not os.path.exists(config_path):
            continue
        with open(config_path) as f:
            lang_config = json.load(f)
        # Merge defaults for text section
        merged_text = {**defaults.get("text", {}), **lang_config.get("text", {})}
        configs[lang_code] = {
            "name_native": lang_config.get("name_native", lang_config.get("name", lang_code)),
            "is_rtl": lang_config.get("right_to_left", "false") == "true",
            "share_challenge_win": merged_text.get(
                "share_challenge_win",
                "I got today's Wordle in {n} tries. Can you beat me?",
            ),
            "share_challenge_lose": merged_text.get(
                "share_challenge_lose",
                "I didn't get today's Wordle. Can you?",
            ),
        }
    return configs


def main():
    configs = load_language_configs()

    # Filter languages if args provided
    if len(sys.argv) > 1:
        target_langs = sys.argv[1:]
    else:
        target_langs = sorted(configs.keys())

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    results = ["1", "2", "3", "4", "5", "6", "x"]
    total = len(target_langs) * len(results)
    count = 0

    for lang_code in target_langs:
        cfg = configs.get(lang_code)
        if not cfg:
            print(f"  Warning: no config for {lang_code}, skipping")
            continue

        for result in results:
            count += 1
            if result == "x":
                text = cfg["share_challenge_lose"]
            else:
                text = cfg["share_challenge_win"].replace("{n}", result)

            img = generate_image(lang_code, result, text, cfg["is_rtl"])
            out_path = os.path.join(OUTPUT_DIR, f"{lang_code}_{result}.png")
            img.save(out_path, "PNG", optimize=True)

            if count % 20 == 0 or count == total:
                print(f"  [{count}/{total}] Generated {out_path}")

    print(f"\nDone! Generated {count} images in {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
