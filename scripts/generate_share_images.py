#!/usr/bin/env python3
"""Generate social share preview images (OG images) for all languages x results.

Produces 1200x630 PNGs in public/images/share/{lang}_{r}.png
where r is 1-6 (win) or x (loss).

Uses the v3 editorial design system (Fraunces, Source Sans 3, JetBrains Mono)
matching generate_mode_og_images.py.

Usage:
    uv run python scripts/generate_share_images.py
    uv run python scripts/generate_share_images.py en fi he  # specific languages only
"""

import json
import os
import re
import subprocess
import sys

import arabic_reshaper
from bidi.algorithm import get_display
from PIL import Image, ImageDraw, ImageFont

# ── Paths ──
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(ROOT, "data")
LANG_DIR = os.path.join(DATA_DIR, "languages")
OUTPUT_DIR = os.path.join(ROOT, "public", "images", "share")
DEFAULT_CONFIG_PATH = os.path.join(DATA_DIR, "default_language_config.json")
FONTS_DIR = os.path.join(ROOT, "scripts", ".fonts")

# ── Design system colors ──
PAPER = (250, 248, 245)  # #faf8f5
INK = (26, 26, 26)  # #1a1a1a
ACCENT = (192, 57, 43)  # #c0392b
CORRECT = (45, 133, 68)  # #2d8544
SEMICORRECT = (184, 134, 11)  # #b8860b
MUTED = (140, 140, 140)  # #8c8c8c
MUTED_SOFT = (232, 232, 232)  # #e8e8e8
RULE = (212, 207, 199)  # #d4cfc7

W, H = 1200, 630

# ── Font URLs (same as generate_mode_og_images.py) ──
FRAUNCES_URL = "https://github.com/google/fonts/raw/main/ofl/fraunces/Fraunces%5BSOFT%2CWONK%2Copsz%2Cwght%5D.ttf"
SOURCE_SANS_URL = (
    "https://github.com/google/fonts/raw/main/ofl/sourcesans3/SourceSans3%5Bwght%5D.ttf"
)
JETBRAINS_URL = (
    "https://github.com/google/fonts/raw/main/ofl/jetbrainsmono/JetBrainsMono%5Bwght%5D.ttf"
)
_DEJAVU_PATHS = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/dejavu-sans-fonts/DejaVuSans.ttf",
    "/usr/share/fonts/TTF/DejaVuSans.ttf",
]
_CJK_PATHS = [
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
    "/usr/share/fonts/noto-cjk/NotoSansCJK-Regular.ttc",
]

FRAUNCES_PATH = os.path.join(FONTS_DIR, "Fraunces.ttf")
SOURCE_SANS_PATH = os.path.join(FONTS_DIR, "SourceSans3.ttf")
JETBRAINS_PATH = os.path.join(FONTS_DIR, "JetBrainsMono.ttf")

CJK_LANGS = {"ko", "ja", "zh"}
FONT_CACHE = {}
DEJAVU_PATH = None
CJK_PATH = None


def download_fonts():
    os.makedirs(FONTS_DIR, exist_ok=True)
    for url, path, name in [
        (FRAUNCES_URL, FRAUNCES_PATH, "Fraunces"),
        (SOURCE_SANS_URL, SOURCE_SANS_PATH, "Source Sans 3"),
        (JETBRAINS_URL, JETBRAINS_PATH, "JetBrains Mono"),
    ]:
        if not os.path.exists(path):
            print(f"  Downloading {name}...")
            subprocess.run(["curl", "-sL", "-o", path, url], check=True)


def _resolve(candidates):
    for p in candidates:
        if os.path.isfile(p):
            return p
    return None


def init_fallback_fonts():
    global DEJAVU_PATH, CJK_PATH
    DEJAVU_PATH = _resolve(_DEJAVU_PATHS)
    CJK_PATH = _resolve(_CJK_PATHS)


def font(path, size):
    key = (path, size)
    if key not in FONT_CACHE:
        try:
            FONT_CACHE[key] = (
                ImageFont.truetype(path, size) if path else ImageFont.load_default(size=size)
            )
        except OSError:
            FONT_CACHE[key] = ImageFont.load_default(size=size)
    return FONT_CACHE[key]


def text_width(draw, text, f):
    bbox = draw.textbbox((0, 0), text, font=f)
    return bbox[2] - bbox[0]


def draw_centered(draw, text, y, f, fill):
    w = text_width(draw, text, f)
    draw.text(((W - w) // 2, y), text, fill=fill, font=f)


def draw_rule(draw, y):
    draw.line([(100, y), (W - 100, y)], fill=RULE, width=1)
    cx = W // 2
    draw.line([(cx - 20, y), (cx + 20, y)], fill=INK, width=3)


def draw_masthead(draw, cy, size=32):
    """Draw 'Wordle.Global' masthead with accent dot."""
    f = font(FRAUNCES_PATH, size)
    part1 = "Wordle"
    part2 = "."
    part3 = "Global"
    w1 = text_width(draw, part1, f)
    w2 = text_width(draw, part2, f)
    w3 = text_width(draw, part3, f)
    total = w1 + w2 + w3
    x = (W - total) // 2
    draw.text((x, cy), part1, fill=INK, font=f)
    draw.text((x + w1, cy), part2, fill=ACCENT, font=f)
    draw.text((x + w1 + w2, cy), part3, fill=INK, font=f)


def prepare_bidi(text, is_rtl):
    if not is_rtl:
        return text
    return get_display(arabic_reshaper.reshape(text))


def wrap_text(text, f, draw, max_width):
    words = text.split()
    lines = []
    current = ""
    for word in words:
        test = f"{current} {word}".strip() if current else word
        bbox = draw.textbbox((0, 0), test, font=f)
        if bbox[2] - bbox[0] <= max_width:
            current = test
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def draw_mini_grid(draw, cx, cy, n_rows, solved_row, tile_size=24, gap=5):
    """Draw a mini tile grid centered at (cx, cy) using editorial colors."""
    cols = 5
    grid_w = cols * tile_size + (cols - 1) * gap
    grid_h = n_rows * tile_size + (n_rows - 1) * gap
    x0 = cx - grid_w // 2
    y0 = cy - grid_h // 2
    for row in range(n_rows):
        for col in range(cols):
            mx = x0 + col * (tile_size + gap)
            my = y0 + row * (tile_size + gap)
            if solved_row is not None and row == solved_row:
                c = CORRECT
            elif row < (solved_row if solved_row is not None else n_rows):
                v = (row + col) % 3
                c = CORRECT if v == 0 else SEMICORRECT if v == 1 else MUTED
            else:
                c = MUTED_SOFT
            draw.rectangle([mx, my, mx + tile_size, my + tile_size], fill=c)


def generate_image(lang_code, result, challenge_text, is_rtl):
    """Generate a single share preview image in the editorial design style."""
    img = Image.new("RGB", (W, H), PAPER)
    draw = ImageDraw.Draw(img)

    # ── Accent stripe at top ──
    draw.rectangle([(0, 0), (W, 4)], fill=ACCENT)

    # ── Masthead ──
    draw_masthead(draw, cy=18, size=32)

    # ── Score + mini grid (centered as a pair) ──
    score_text = f"{result}/6" if result != "x" else "X/6"
    is_loss = result == "x"
    score_color = MUTED if is_loss else (CORRECT if int(result) <= 3 else SEMICORRECT)

    sf = font(FRAUNCES_PATH, 140)
    bbox = draw.textbbox((0, 0), score_text, font=sf)
    score_w = bbox[2] - bbox[0]
    score_h = bbox[3] - bbox[1]

    n_rows = int(result) if not is_loss else 6
    solved_row = int(result) - 1 if not is_loss else None
    tile_size, tile_gap = 26, 5
    cols = 5
    grid_w = cols * tile_size + (cols - 1) * tile_gap
    grid_h = n_rows * tile_size + (n_rows - 1) * tile_gap

    pair_gap = 50  # space between score and grid
    total_w = score_w + pair_gap + grid_w
    pair_x = (W - total_w) // 2

    # Vertical center for the pair
    pair_cy = 190
    score_y = pair_cy - score_h // 2 - 20  # slight upward nudge for visual weight

    draw.text((pair_x, score_y), score_text, fill=score_color, font=sf)

    grid_cx = pair_x + score_w + pair_gap + grid_w // 2
    draw_mini_grid(draw, grid_cx, pair_cy, n_rows, solved_row, tile_size=tile_size, gap=tile_gap)

    # ── Rule ──
    draw_rule(draw, 400)

    # ── Challenge text — split into statement (muted) + CTA (accent bold) ──
    sentence_split = re.split(r"(?<=[.?!])\s+(?=\S)", challenge_text)
    if len(sentence_split) >= 2:
        statement = " ".join(sentence_split[:-1])
        cta = sentence_split[-1]
    else:
        statement = ""
        cta = challenge_text

    needs_cjk = lang_code in CJK_LANGS
    font_body_path = CJK_PATH if needs_cjk else (DEJAVU_PATH if is_rtl else SOURCE_SANS_PATH)
    font_body_path = font_body_path or SOURCE_SANS_PATH
    font_cta_path = CJK_PATH if needs_cjk else (DEJAVU_PATH if is_rtl else FRAUNCES_PATH)
    font_cta_path = font_cta_path or FRAUNCES_PATH

    max_w = W - 200
    text_y = 420

    # Auto-size to fit in 2 lines max
    for stmt_s, cta_s in ((40, 44), (34, 38), (28, 32), (24, 28)):
        f_stmt = font(font_body_path, stmt_s)
        f_cta = font(font_cta_path, cta_s)
        stmt_ok = True
        cta_ok = True
        if statement:
            stmt_display = prepare_bidi(statement, is_rtl)
            stmt_lines = wrap_text(stmt_display, f_stmt, draw, max_w)
            if len(stmt_lines) != 1:
                stmt_ok = False
        else:
            stmt_lines = []
        cta_display = prepare_bidi(cta, is_rtl)
        cta_lines = wrap_text(cta_display, f_cta, draw, max_w)
        if len(cta_lines) != 1:
            cta_ok = False
        chosen_stmt_size = stmt_s
        if stmt_ok and cta_ok:
            break

    # Statement line (muted, regular)
    if stmt_lines:
        draw_centered(draw, stmt_lines[0], text_y, f_stmt, MUTED)

    # CTA line (ink, bold Fraunces)
    if cta_lines:
        cta_y = text_y + chosen_stmt_size + 10
        draw_centered(draw, cta_lines[0], cta_y, f_cta, INK)

    # ── URL at bottom ──
    url_font = font(JETBRAINS_PATH, 16)
    draw_centered(draw, "wordle.global", H - 36, url_font, ACCENT)

    # Palette mode for smaller file size
    return img.convert("P", palette=Image.ADAPTIVE, colors=64)


def load_language_configs():
    """Load all language configs with default fallback."""
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
                "I got today's Wordle in {n}. Can you beat me?",
            ),
            "share_challenge_lose": merged_text.get(
                "share_challenge_lose",
                "I didn't get today's Wordle. Can you?",
            ),
        }
    return configs


def main():
    download_fonts()
    init_fallback_fonts()
    configs = load_language_configs()

    target_langs = sys.argv[1:] if len(sys.argv) > 1 else sorted(configs.keys())

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
