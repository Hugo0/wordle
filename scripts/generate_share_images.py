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
TRANSLATIONS_PATH = os.path.join(DATA_DIR, "share_translations.json")

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

RTL_LANGS = {"ar", "ckb", "fa", "he"}


def prepare_bidi_text(text, lang_code):
    """Reshape and reorder RTL text for correct Pillow rendering."""
    if lang_code not in RTL_LANGS:
        return text
    # Arabic script needs reshaping (letter joining)
    if lang_code in ("ar", "ckb", "fa"):
        text = arabic_reshaper.reshape(text)
    # Apply bidi algorithm to get visual ordering
    return get_display(text)


def get_challenge_font(size):
    """Get the challenge text font (DejaVu Sans — broad Unicode coverage)."""
    return ImageFont.truetype(CHALLENGE_FONT, size)


def draw_wordle_tiles(draw, y_center):
    """Draw the WORDLE letter tiles across the top."""
    tile_size = 56
    gap = 8
    total_width = len(TILE_LETTERS) * tile_size + (len(TILE_LETTERS) - 1) * gap
    start_x = (WIDTH - total_width) // 2

    for i, (letter, pattern) in enumerate(zip(TILE_LETTERS, TILE_PATTERN)):
        x = start_x + i * (tile_size + gap)
        color = TILE_COLORS[pattern]
        # Draw rounded rect (approximate with rect + circles)
        r = 6
        draw.rounded_rectangle(
            [x, y_center - tile_size // 2, x + tile_size, y_center + tile_size // 2],
            radius=r,
            fill=color,
        )
        # Letter
        font = ImageFont.truetype(BOLD_FONT, 34)
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


def generate_image(lang_code, result, challenge_text, lang_name_native):
    """Generate a single share preview image."""
    img = Image.new("RGB", (WIDTH, HEIGHT), BG_COLOR)
    draw = ImageDraw.Draw(img)

    # 1. WORDLE tiles at top
    draw_wordle_tiles(draw, y_center=70)

    # 2. "WORDLE GLOBAL" text under tiles
    font_title = ImageFont.truetype(BOLD_FONT, 22)
    bbox = draw.textbbox((0, 0), "WORDLE GLOBAL", font=font_title)
    tw = bbox[2] - bbox[0]
    draw.text(((WIDTH - tw) // 2, 108), "WORDLE GLOBAL", fill=LIGHT_GRAY, font=font_title)

    # 3. Big score in the center
    if result == "x":
        score_text = "X/6"
        score_color = GRAY
    else:
        score_text = f"{result}/6"
        if result == "1":
            score_color = GREEN
        elif int(result) <= 3:
            score_color = GREEN
        elif int(result) <= 5:
            score_color = YELLOW
        else:
            score_color = YELLOW

    font_score = ImageFont.truetype(BOLD_FONT, 140)
    bbox = draw.textbbox((0, 0), score_text, font=font_score)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    score_y = 180
    draw.text(((WIDTH - tw) // 2, score_y), score_text, fill=score_color, font=font_score)

    # 4. Decorative mini tiles flanking the score (showing a result pattern)
    mini_size = 16
    mini_gap = 4
    mini_y = score_y + th // 2 + 165 - mini_size // 2
    # Left side mini tiles
    for row in range(min(int(result) if result != "x" else 6, 6)):
        for col in range(5):
            mx = 80 + col * (mini_size + mini_gap)
            my = score_y + 20 + row * (mini_size + mini_gap)
            if result != "x" and row == (int(result) - 1):
                c = GREEN  # Last row all green (solved)
            elif row < (int(result) - 1 if result != "x" else 6):
                # Random-ish pattern
                if (row + col) % 3 == 0:
                    c = GREEN
                elif (row + col) % 3 == 1:
                    c = YELLOW
                else:
                    c = GRAY
            else:
                c = GRAY
            draw.rectangle([mx, my, mx + mini_size, my + mini_size], fill=c)
    # Right side (mirror)
    for row in range(min(int(result) if result != "x" else 6, 6)):
        for col in range(5):
            mx = WIDTH - 80 - (4 - col) * (mini_size + mini_gap) - mini_size
            my = score_y + 20 + row * (mini_size + mini_gap)
            if result != "x" and row == (int(result) - 1):
                c = GREEN
            elif row < (int(result) - 1 if result != "x" else 6):
                if (row + col + 1) % 3 == 0:
                    c = GREEN
                elif (row + col + 1) % 3 == 1:
                    c = YELLOW
                else:
                    c = GRAY
            else:
                c = GRAY
            draw.rectangle([mx, my, mx + mini_size, my + mini_size], fill=c)

    # 5. Challenge text (apply bidi reordering for RTL languages)
    display_text = prepare_bidi_text(challenge_text, lang_code)
    font_challenge = get_challenge_font(32)
    lines = wrap_text(display_text, font_challenge, draw, WIDTH - 160)
    text_y = 460
    for line in lines[:2]:  # Max 2 lines
        bbox = draw.textbbox((0, 0), line, font=font_challenge)
        tw = bbox[2] - bbox[0]
        x = (WIDTH - tw) // 2
        draw.text((x, text_y), line, fill=WHITE, font=font_challenge)
        text_y += 44

    # 6. URL at bottom
    font_url = ImageFont.truetype(LATIN_FONT, 20)
    url_text = f"wordle.global/{lang_code}"
    bbox = draw.textbbox((0, 0), url_text, font=font_url)
    tw = bbox[2] - bbox[0]
    draw.text(((WIDTH - tw) // 2, HEIGHT - 50), url_text, fill=LIGHT_GRAY, font=font_url)

    return img


def main():
    # Load translations
    with open(TRANSLATIONS_PATH) as f:
        translations = json.load(f)

    # Load language configs for name_native
    lang_names = {}
    for lang_code in os.listdir(LANG_DIR):
        config_path = os.path.join(LANG_DIR, lang_code, "language_config.json")
        if os.path.exists(config_path):
            with open(config_path) as f:
                config = json.load(f)
            lang_names[lang_code] = config.get("name_native", config.get("name", lang_code))

    # Filter languages if args provided
    if len(sys.argv) > 1:
        target_langs = sys.argv[1:]
    else:
        target_langs = sorted(lang_names.keys())

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    results = ["1", "2", "3", "4", "5", "6", "x"]
    total = len(target_langs) * len(results)
    count = 0

    for lang_code in target_langs:
        name_native = lang_names.get(lang_code, lang_code)
        trans = translations.get(lang_code, translations.get("en", {}))

        for result in results:
            count += 1
            if result == "x":
                text = trans.get("lose", "I didn't get today's Wordle. Can you?")
            else:
                text = trans.get("win", "I got today's Wordle in {n} tries. Can you beat me?")
                text = text.replace("{n}", result)

            img = generate_image(lang_code, result, text, name_native)
            out_path = os.path.join(OUTPUT_DIR, f"{lang_code}_{result}.png")
            img.save(out_path, "PNG", optimize=True)

            if count % 20 == 0 or count == total:
                print(f"  [{count}/{total}] Generated {out_path}")

    print(f"\nDone! Generated {count} images in {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
