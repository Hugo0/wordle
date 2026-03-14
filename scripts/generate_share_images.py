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
OG_IMAGE_PATH = os.path.join(ROOT, "webapp", "static", "images", "og-image.png")

# Image dimensions (standard OG image)
WIDTH, HEIGHT = 1200, 630

# Colors
BG_COLOR = (23, 23, 23)  # #171717
GREEN = (34, 197, 94)  # #22c55e
YELLOW = (234, 179, 8)  # #eab308
GRAY = (82, 82, 82)  # #525252
WHITE = (255, 255, 255)

# Font paths
FONT_DEJAVU = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_DEJAVU_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_CJK = "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"
FONT_CJK_BOLD = "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc"
SCORE_FONT = "/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf"

# Languages needing CJK font (DejaVu doesn't cover Hangul glyphs)
CJK_LANGS = {"ko"}

# Pre-load fonts (avoid repeated truetype() calls in hot loop)
FONTS = {}

# Header strip cropped from the real og-image.png (pixel-perfect branding)
HEADER_STRIP = None
HEADER_HEIGHT = 90


def get_font(path, size):
    """Get a cached font instance."""
    key = (path, size)
    if key not in FONTS:
        FONTS[key] = ImageFont.truetype(path, size)
    return FONTS[key]


def load_header():
    """Crop and scale the WORDLE tiles + globe from og-image.png."""
    global HEADER_STRIP
    og = Image.open(OG_IMAGE_PATH)
    # Crop the tiles+globe band (y=185..335 in the 1200x630 original)
    strip = og.crop((0, 185, 1200, 335))
    HEADER_STRIP = strip.resize(
        (int(strip.width * HEADER_HEIGHT / strip.height), HEADER_HEIGHT),
        Image.LANCZOS,
    )


def prepare_bidi_text(text, is_rtl):
    """Reshape and reorder RTL text for correct Pillow rendering."""
    if not is_rtl:
        return text
    text = arabic_reshaper.reshape(text)
    return get_display(text)


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


def draw_mini_grid(draw, cx, cy, n_rows, solved_row, tile_size=24, gap=5):
    """Draw a mini tile grid centered at (cx, cy)."""
    cols = 5
    grid_w = cols * tile_size + (cols - 1) * gap
    grid_h = n_rows * tile_size + (n_rows - 1) * gap
    x0 = cx - grid_w // 2
    y0 = cy - grid_h // 2
    for row in range(n_rows):
        for col in range(cols):
            mx = x0 + col * (tile_size + gap)
            my = y0 + row * (tile_size + gap)
            if row == solved_row:
                c = GREEN
            else:
                v = (row + col) % 3
                c = GREEN if v == 0 else YELLOW if v == 1 else GRAY
            draw.rectangle([mx, my, mx + tile_size, my + tile_size], fill=c)


def generate_image(lang_code, result, challenge_text, is_rtl):
    """Generate a single share preview image."""
    img = Image.new("RGB", (WIDTH, HEIGHT), BG_COLOR)
    draw = ImageDraw.Draw(img)

    # 1. Header — pixel-perfect from og-image.png
    paste_x = (WIDTH - HEADER_STRIP.width) // 2
    img.paste(HEADER_STRIP, (paste_x, 15))

    # 2. Score at 1/3, mini grid at 2/3, vertically aligned
    score_text = f"{result}/6" if result != "x" else "X/6"
    score_color = GRAY if result == "x" else (GREEN if int(result) <= 3 else YELLOW)

    sf = get_font(SCORE_FONT, 160)
    bbox = draw.textbbox((0, 0), score_text, font=sf)
    stw = bbox[2] - bbox[0]
    ascent, _ = sf.getmetrics()

    mid_y = 265  # vertical center of score/grid band
    score_x = WIDTH // 3 - stw // 2
    score_y = mid_y - ascent // 2 - 5
    draw.text((score_x, score_y), score_text, fill=score_color, font=sf)

    # Grid centered at 2/3 mark, vertically aligned to score
    n_rows = int(result) if result != "x" else 6
    solved = int(result) - 1 if result != "x" else -1
    score_visual_cy = score_y + ascent // 2 + 10
    draw_mini_grid(draw, 2 * WIDTH // 3, score_visual_cy, n_rows, solved)

    # 3. Challenge text — pick font based on language script
    use_cjk = lang_code in CJK_LANGS
    font_reg = FONT_CJK if use_cjk else FONT_DEJAVU
    font_bold = FONT_CJK_BOLD if use_cjk else FONT_DEJAVU_BOLD

    # Auto-size: start at 44px, shrink if text overflows
    display_text = prepare_bidi_text(challenge_text, is_rtl)
    max_w = WIDTH - 200
    for size in (44, 38, 32, 26):
        font_main = get_font(font_reg, size)
        font_cta = get_font(font_bold, size + 4)
        lines = wrap_text(display_text, font_main, draw, max_w)
        if len(lines) <= 2:
            break

    if not lines:
        return img.convert("P", palette=Image.ADAPTIVE, colors=64)

    if len(lines) >= 2:
        line1 = lines[0]
        line2 = " ".join(lines[1:])
        bbox1 = draw.textbbox((0, 0), line1, font=font_main)
        draw.text(((WIDTH - (bbox1[2] - bbox1[0])) // 2, 430), line1, fill=WHITE, font=font_main)
        bbox2 = draw.textbbox((0, 0), line2, font=font_cta)
        draw.text(
            ((WIDTH - (bbox2[2] - bbox2[0])) // 2, 430 + size + 12),
            line2,
            fill=GREEN,
            font=font_cta,
        )
    else:
        line = lines[0]
        bbox = draw.textbbox((0, 0), line, font=font_cta)
        draw.text(((WIDTH - (bbox[2] - bbox[0])) // 2, 460), line, fill=GREEN, font=font_cta)

    # Convert to palette mode for smaller file size (~6 distinct colors)
    return img.convert("P", palette=Image.ADAPTIVE, colors=64)


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
        merged_text = {**defaults.get("text", {}), **lang_config.get("text", {})}
        configs[lang_code] = {
            "name_native": lang_config.get("name_native", lang_config.get("name", lang_code)),
            "is_rtl": str(lang_config.get("right_to_left", "false")).lower() == "true",
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
    load_header()
    configs = load_language_configs()

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
