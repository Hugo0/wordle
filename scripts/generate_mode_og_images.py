#!/usr/bin/env python3
"""Generate OG preview images for game modes using the v3 editorial design system.

Per-language images in public/images/modes/{mode}/{lang}.png
Generic fallbacks in public/images/og-{mode}.png

Design system tokens (Direction A: Editorial):
  --color-paper: #faf8f5       --color-ink: #1a1a1a
  --color-accent: #c0392b      --color-correct: #2d8544
  --color-semicorrect: #b8860b --color-muted: #8c8c8c
  --color-rule: #d4cfc7
  Fonts: Fraunces (display), Source Sans 3 (body), JetBrains Mono (labels)

OG image text guidelines (Twitter/Facebook/LinkedIn):
  - Title: minimum 40px at 1200×630, ideally 60-90px
  - Subtitle/body: minimum 28px, ideally 36-48px
  - URL/labels: minimum 20px
  - Keep text in center 1000×500 safe zone (avoid edges cropped by cards)

Usage:
    uv run python scripts/generate_mode_og_images.py              # English samples only
    uv run python scripts/generate_mode_og_images.py --all         # All languages
    uv run python scripts/generate_mode_og_images.py en fi ar      # Specific languages
"""

import json
import math
import os
import subprocess
import sys

import arabic_reshaper
from bidi.algorithm import get_display
from PIL import Image, ImageDraw, ImageFont

# ── Paths ──
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_DIR = os.path.join(ROOT, "public", "images")
MODES_DIR = os.path.join(OUTPUT_DIR, "modes")
LANG_DIR = os.path.join(ROOT, "data", "languages")
DEFAULT_CONFIG_PATH = os.path.join(ROOT, "data", "default_language_config.json")
FONTS_DIR = os.path.join(ROOT, "scripts", ".fonts")

# ── Design system colors ──
PAPER = (250, 248, 245)  # #faf8f5
PAPER_WARM = (243, 239, 232)  # #f3efe8
INK = (26, 26, 26)  # #1a1a1a
ACCENT = (192, 57, 43)  # #c0392b
CORRECT = (45, 133, 68)  # #2d8544
SEMICORRECT = (184, 134, 11)  # #b8860b
MUTED = (140, 140, 140)  # #8c8c8c
MUTED_SOFT = (232, 232, 232)  # #e8e8e8
RULE = (212, 207, 199)  # #d4cfc7
WHITE = (255, 255, 255)

W, H = 1200, 630

# ── Font URLs ──
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


DEJAVU_PATH = None
CJK_PATH = None


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


def prepare_bidi(text, is_rtl):
    if not is_rtl:
        return text
    return get_display(arabic_reshaper.reshape(text))


def text_width(draw, text, f):
    bbox = draw.textbbox((0, 0), text, font=f)
    return bbox[2] - bbox[0]


def draw_centered(draw, text, y, f, fill):
    w = text_width(draw, text, f)
    draw.text(((W - w) // 2, y), text, fill=fill, font=f)


def wrap_text(text, f, draw, max_width):
    """Wrap text to fit within max_width pixels."""
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


def _is_latin(text):
    """Return True if text contains only Latin/ASCII characters (no Cyrillic/Greek/Arabic/CJK)."""
    return all(ord(c) < 0x0250 for c in text)


def draw_tagline(draw, tagline, y, is_rtl, lang_code):
    """Draw tagline with auto-shrink to fit within image bounds. Returns bottom y."""
    needs_cjk = lang_code in CJK_LANGS
    # Use Fraunces for Latin text even on RTL languages (English fallback taglines)
    if needs_cjk:
        font_path = CJK_PATH
    elif is_rtl and not _is_latin(tagline or ""):
        font_path = DEJAVU_PATH
    else:
        font_path = FRAUNCES_PATH
    font_path = font_path or FRAUNCES_PATH
    max_w = W - 200  # 100px margin each side

    tag_text = prepare_bidi(tagline, is_rtl) if tagline else ""
    if not tag_text:
        return y

    # Auto-shrink: try decreasing font sizes until text fits in max 2 lines
    chosen_size = 36
    lines = [tag_text]
    for size in (36, 32, 28, 24, 20):
        f = font(font_path, size)
        lines = wrap_text(tag_text, f, draw, max_w)
        if len(lines) <= 2:
            chosen_size = size
            break

    f = font(font_path, chosen_size)
    line_y = y
    for line in lines[:2]:  # Max 2 lines
        draw_centered(draw, line, line_y, f, MUTED)
        line_y += chosen_size + 6

    return line_y


def draw_rule(draw, y):
    draw.line([(100, y), (W - 100, y)], fill=RULE, width=1)
    cx = W // 2
    draw.line([(cx - 20, y), (cx + 20, y)], fill=INK, width=3)


def draw_board(draw, cx, cy, rows, cols=5, tile_size=20, gap=4, solved_row=None):
    grid_w = cols * tile_size + (cols - 1) * gap
    grid_h = rows * tile_size + (rows - 1) * gap
    x0 = cx - grid_w // 2
    y0 = cy - grid_h // 2
    for r in range(rows):
        for c in range(cols):
            mx = x0 + c * (tile_size + gap)
            my = y0 + r * (tile_size + gap)
            if solved_row is not None and r == solved_row:
                color = CORRECT
            elif r < (solved_row if solved_row is not None else rows):
                v = (r + c) % 3
                color = CORRECT if v == 0 else SEMICORRECT if v == 1 else MUTED
            else:
                color = MUTED_SOFT
            draw.rectangle([mx, my, mx + tile_size, my + tile_size], fill=color)


def draw_timer_arc(draw, cx, cy, radius, progress=0.7):
    """Draw a circular timer arc for speed mode."""
    # Background circle
    bbox = [cx - radius, cy - radius, cx + radius, cy + radius]
    draw.ellipse(bbox, outline=RULE, width=6)
    # Progress arc (accent red, showing time remaining)
    start = -90  # 12 o'clock
    end = start + int(360 * progress)
    draw.arc(bbox, start, end, fill=ACCENT, width=6)
    # Tick marks
    for i in range(12):
        angle = math.radians(i * 30 - 90)
        inner = radius - 10
        outer = radius - 4
        x1 = cx + inner * math.cos(angle)
        y1 = cy + inner * math.sin(angle)
        x2 = cx + outer * math.cos(angle)
        y2 = cy + outer * math.sin(angle)
        draw.line([(x1, y1), (x2, y2)], fill=MUTED, width=2)


# ═══════════════════════════════════════════════════════════════════════════
# Mode-specific image generators
# ═══════════════════════════════════════════════════════════════════════════


def gen_unlimited(draw, img, tagline, is_rtl, lang_code):
    cy = 340
    draw_board(draw, W // 2 - 100, cy, rows=5, tile_size=26, gap=5, solved_row=3)
    draw_board(draw, W // 2 + 100, cy, rows=5, tile_size=26, gap=5, solved_row=2)


def gen_speed(draw, img, tagline, is_rtl, lang_code):
    cy = 340
    timer_cx = W // 2 - 130
    draw_timer_arc(draw, timer_cx, cy, radius=95, progress=0.72)
    time_font = font(FRAUNCES_PATH, 52)
    draw_centered_at(draw, "4:12", timer_cx, cy - 16, time_font, ACCENT)
    small_font = font(JETBRAINS_PATH, 14)
    draw_centered_at(draw, "REMAINING", timer_cx, cy + 34, small_font, MUTED)
    draw_board(draw, W // 2 + 160, cy, rows=4, tile_size=26, gap=5, solved_row=3)


def gen_dordle(draw, img, tagline, is_rtl, lang_code):
    cy = 340
    draw_board(draw, W // 2 - 120, cy, rows=5, tile_size=26, gap=5, solved_row=4)
    draw_board(draw, W // 2 + 120, cy, rows=5, tile_size=26, gap=5, solved_row=3)


def gen_tridle(draw, img, tagline, is_rtl, lang_code):
    cy = 340
    draw_board(draw, W // 2 - 185, cy, rows=5, tile_size=22, gap=4, solved_row=3)
    draw_board(draw, W // 2, cy, rows=5, tile_size=22, gap=4, solved_row=4)
    draw_board(draw, W // 2 + 185, cy, rows=5, tile_size=22, gap=4, solved_row=2)


def gen_quordle(draw, img, tagline, is_rtl, lang_code):
    cy = 340
    for dx, dy, sr in [(-125, -68, 3), (125, -68, 4), (-125, 68, 2), (125, 68, 4)]:
        draw_board(draw, W // 2 + dx, cy + dy, rows=4, tile_size=20, gap=4, solved_row=sr)


def gen_octordle(draw, img, tagline, is_rtl, lang_code):
    """8 boards in a 4×2 grid."""
    cy = 340
    ts, gap = 14, 3
    spacing_x, spacing_y = 135, 80
    solved_rows = [3, 4, 2, 5, 4, 3, 5, 2]
    for i in range(8):
        col, row = i % 4, i // 4
        dx = (col - 1.5) * spacing_x
        dy = (row - 0.5) * spacing_y
        draw_board(draw, int(W // 2 + dx), int(cy + dy), rows=6, tile_size=ts, gap=gap, solved_row=solved_rows[i])


def gen_sedecordle(draw, img, tagline, is_rtl, lang_code):
    """16 boards in a 4×4 grid."""
    cy = 340
    ts, gap = 12, 2
    spacing_x, spacing_y = 150, 68
    solved_rows = [2, 2, 1, 2, 2, 1, 2, 2, 1, 2, 2, 1, 2, 1, 2, 2]
    for i in range(16):
        col, row = i % 4, i // 4
        dx = (col - 1.5) * spacing_x
        dy = (row - 1.5) * spacing_y
        draw_board(draw, int(W // 2 + dx), int(cy + dy), rows=3, tile_size=ts, gap=gap, solved_row=solved_rows[i])


def gen_duotrigordle(draw, img, tagline, is_rtl, lang_code):
    """32 boards in an 8×4 grid."""
    cy = 340
    ts, gap = 8, 2
    spacing_x, spacing_y = 72, 55
    solved_rows = [2, 2, 1, 2, 2, 1, 2, 2, 1, 2, 2, 1, 2, 1, 2, 2,
                   2, 1, 2, 2, 1, 2, 2, 1, 2, 2, 1, 2, 1, 2, 2, 1]
    for i in range(32):
        col, row = i % 8, i // 8
        dx = (col - 3.5) * spacing_x
        dy = (row - 1.5) * spacing_y
        draw_board(draw, int(W // 2 + dx), int(cy + dy), rows=3, tile_size=ts, gap=gap, solved_row=solved_rows[i])


def draw_centered_at(draw, text, cx, cy, f, fill):
    """Draw text centered at a specific point."""
    bbox = draw.textbbox((0, 0), text, font=f)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    draw.text((cx - tw // 2, cy - th // 2), text, fill=fill, font=f)


# ═══════════════════════════════════════════════════════════════════════════

MODE_GENERATORS = {
    "unlimited": gen_unlimited,
    "speed": gen_speed,
    "dordle": gen_dordle,
    "tridle": gen_tridle,
    "quordle": gen_quordle,
    "octordle": gen_octordle,
    "sedecordle": gen_sedecordle,
    "duotrigordle": gen_duotrigordle,
}

MODE_LABELS = {
    "unlimited": "Unlimited",
    "speed": "Speed Streak",
    "dordle": "Dordle",
    "tridle": "Tridle",
    "quordle": "Quordle",
    "octordle": "Octordle",
    "sedecordle": "Sedecordle",
    "duotrigordle": "Duotrigordle",
}

MODE_TAGLINES_EN = {
    "unlimited": "No waiting — play as many as you want",
    "speed": "Race the clock — 5 minutes, as many words as you can",
    "dordle": "2 boards, 1 keyboard, 7 guesses",
    "tridle": "3 boards, 1 keyboard, 8 guesses",
    "quordle": "4 boards, 1 keyboard, 9 guesses",
    "octordle": "8 boards, 1 keyboard, 13 guesses",
    "sedecordle": "16 boards, 1 keyboard, 21 guesses",
    "duotrigordle": "32 boards, 1 keyboard, 37 guesses",
}


def generate_mode_image(mode_slug, lang_code="en", lang_name="", tagline="", is_rtl=False):
    """Generate a single mode OG image.

    Layout — simple, bold, 3 zones:
      - Top: small masthead + HUGE mode name (the hero)
      - Middle: boards (no rules boxing them in)
      - Bottom: single rule + tagline
    """
    img = Image.new("RGB", (W, H), PAPER)
    draw = ImageDraw.Draw(img)

    # ── Accent stripe at top ──
    draw.rectangle([(0, 0), (W, 4)], fill=ACCENT)

    # ── Masthead: small branding, not competing ──
    draw_masthead(draw, cy=22, size=32)

    # ── Mode name — THE HERO (120px) ──
    display_lg = font(FRAUNCES_PATH, 120)
    label = MODE_LABELS[mode_slug]
    draw_centered(draw, label, 70, display_lg, INK)

    # ── Mode-specific visual (boards, timer) — centered in middle zone ──
    gen = MODE_GENERATORS[mode_slug]
    gen(draw, img, tagline, is_rtl, lang_code)

    # ── Single rule before tagline ──
    draw_rule(draw, 505)

    # ── Tagline at bottom ──
    tag_text = tagline or MODE_TAGLINES_EN[mode_slug]
    draw_tagline(draw, tag_text, 520, is_rtl, lang_code)

    return img


def draw_masthead(draw, cy, size=120):
    """Draw 'Wordle.Global' masthead matching the landing page exactly.

    Fraunces display weight 800, with the dot in accent red.
    """
    f = font(FRAUNCES_PATH, size)
    # Measure each part
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


def generate_main_og_image():
    """Generate the updated main og-image.png with design system."""
    img = Image.new("RGB", (W, H), PAPER)
    draw = ImageDraw.Draw(img)

    # Accent stripe
    draw.rectangle([(0, 0), (W, 4)], fill=ACCENT)

    # Masthead: Wordle.Global (large, matching landing page)
    draw_masthead(draw, cy=80, size=120)

    # Mono label subtitle
    mono = font(JETBRAINS_PATH, 14)
    draw_centered(draw, "THE WORLD'S WORD GAME", 230, mono, MUTED)

    # Editorial rule with thick center
    draw_rule(draw, 265)

    # Subtitle
    body_lg = font(SOURCE_SANS_PATH, 42)
    draw_centered(draw, "Free daily word puzzle in 80+ languages", 290, body_lg, MUTED)

    # Mini tile row — 6 tiles spelling WORDLE
    tile_size = 52
    gap = 8
    letters = "WORDLE"
    colors = [CORRECT, SEMICORRECT, MUTED, CORRECT, SEMICORRECT, CORRECT]
    total_w = len(letters) * tile_size + (len(letters) - 1) * gap
    start_x = (W - total_w) // 2
    tile_y = 370
    tile_font = font(FRAUNCES_PATH, 30)

    for i, (letter, color) in enumerate(zip(letters, colors, strict=True)):
        x = start_x + i * (tile_size + gap)
        draw.rectangle([x, tile_y, x + tile_size, tile_y + tile_size], fill=color)
        lbox = draw.textbbox((0, 0), letter, font=tile_font)
        lw = lbox[2] - lbox[0]
        lh = lbox[3] - lbox[1]
        draw.text(
            (x + (tile_size - lw) // 2, tile_y + (tile_size - lh) // 2 - 3),
            letter,
            fill=WHITE,
            font=tile_font,
        )

    # Bottom rule
    draw_rule(draw, 470)

    # Mode list
    mono_lg = font(JETBRAINS_PATH, 16)
    modes_text = "CLASSIC · UNLIMITED · SPEED · DORDLE · TRIDLE · QUORDLE · OCTORDLE"
    draw_centered(draw, modes_text, 490, mono_lg, MUTED)

    # URL
    url_font = font(JETBRAINS_PATH, 20)
    draw_centered(draw, "wordle.global", 540, url_font, ACCENT)

    return img


def load_language_configs():
    configs = {}
    for lang_code in sorted(os.listdir(LANG_DIR)):
        config_path = os.path.join(LANG_DIR, lang_code, "language_config.json")
        if not os.path.exists(config_path):
            continue
        with open(config_path) as f:
            lang_config = json.load(f)
        modes = lang_config.get("meta", {}).get("modes", {})
        configs[lang_code] = {
            "name": lang_config.get("name", lang_code),
            "name_native": lang_config.get("name_native", lang_config.get("name", lang_code)),
            "is_rtl": str(lang_config.get("right_to_left", "false")).lower() == "true",
            "modes": modes,
        }
    return configs


def main():
    download_fonts()
    init_fallback_fonts()
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    args = sys.argv[1:]
    generate_all = "--all" in args
    specific_langs = [a for a in args if a != "--all" and not a.startswith("-")]

    # Always generate English samples + main OG image
    print("Generating main og-image.png...")
    img = generate_main_og_image()
    img.save(os.path.join(OUTPUT_DIR, "og-image.png"), "PNG", optimize=True)
    print("  Done.")

    # English-only mode samples (fast preview)
    if not generate_all and not specific_langs:
        print("\nGenerating English mode samples...")
        for slug in MODE_GENERATORS:
            img = generate_mode_image(slug)
            path = os.path.join(OUTPUT_DIR, f"og-{slug}.png")
            img.save(path, "PNG", optimize=True)
            print(f"  {path}")
        print("\nRun with --all to generate all languages.")
        return

    # Multi-language generation
    configs = load_language_configs()
    target_langs = sorted(configs.keys()) if generate_all else specific_langs
    total = len(target_langs) * len(MODE_GENERATORS)
    count = 0

    for slug in MODE_GENERATORS:
        mode_dir = os.path.join(MODES_DIR, slug)
        os.makedirs(mode_dir, exist_ok=True)

        for lang_code in target_langs:
            cfg = configs.get(lang_code)
            if not cfg:
                continue
            count += 1

            mode_meta = cfg["modes"].get(slug, {})
            tagline = mode_meta.get("description", MODE_TAGLINES_EN.get(slug, ""))

            img = generate_mode_image(
                slug,
                lang_code=lang_code,
                lang_name=cfg["name_native"],
                tagline=tagline,
                is_rtl=cfg["is_rtl"],
            )
            path = os.path.join(mode_dir, f"{lang_code}.png")
            img.save(path, "PNG", optimize=True)

            if count % 50 == 0 or count == total:
                print(f"  [{count}/{total}] {path}")

    # Also save English as the generic fallback
    for slug in MODE_GENERATORS:
        img = generate_mode_image(slug)
        path = os.path.join(OUTPUT_DIR, f"og-{slug}.png")
        img.save(path, "PNG", optimize=True)

    print(
        f"\nDone! Generated {count} mode images + {len(MODE_GENERATORS)} fallbacks + og-image.png"
    )


if __name__ == "__main__":
    main()
