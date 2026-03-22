#!/usr/bin/env python3
"""Generate favicon variants using the design system fonts and colors.

Renders the Fraunces "W" glyph as proper vector paths via Pillow,
producing multiple options for review and all required sizes for deployment.

Usage:
    uv run python scripts/generate_favicon.py          # Generate all options
    uv run python scripts/generate_favicon.py --pick a # Deploy option A
"""

import os
import subprocess
import sys

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONTS_DIR = os.path.join(ROOT, "scripts", ".fonts")
FAVICON_DIR = os.path.join(ROOT, "public", "favicon")

# ── Design system colors ──
PAPER = (250, 248, 245)
INK = (26, 26, 26)
CORRECT = (45, 133, 68)
SEMICORRECT = (184, 134, 11)
GRAY = (120, 124, 126)
WHITE = (255, 255, 255)
ACCENT = (192, 57, 43)

# ── Font setup (reuses OG image pipeline) ──
FRAUNCES_URL = "https://github.com/google/fonts/raw/main/ofl/fraunces/Fraunces%5BSOFT%2CWONK%2Copsz%2Cwght%5D.ttf"
FRAUNCES_PATH = os.path.join(FONTS_DIR, "Fraunces.ttf")


def ensure_font():
    os.makedirs(FONTS_DIR, exist_ok=True)
    if not os.path.exists(FRAUNCES_PATH):
        print("  Downloading Fraunces...")
        subprocess.run(["curl", "-sL", "-o", FRAUNCES_PATH, FRAUNCES_URL], check=True)
    return FRAUNCES_PATH


def make_tile(size, bg, fg, letter, font_path, radius_frac=0.125, font_scale=0.65):
    """Render a single tile: rounded rect + centered letter."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    r = int(size * radius_frac)
    draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=r, fill=bg)

    if letter:
        font_size = int(size * font_scale)
        font = ImageFont.truetype(font_path, font_size)
        bbox = font.getbbox(letter)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        x = (size - tw) // 2 - bbox[0]
        y = (size - th) // 2 - bbox[1]
        draw.text((x, y), letter, fill=fg, font=font)
    return img


def option_a(size, font_path):
    """Green correct tile + white W."""
    return make_tile(size, CORRECT, WHITE, "W", font_path)


def option_b(size, font_path):
    """Dark ink tile + cream W."""
    return make_tile(size, INK, PAPER, "W", font_path)


def option_c(size, font_path):
    """Three stacked tiles: green W, gold G, gray L."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    tile_h = int(size * 0.29)
    gap = int(size * 0.035)
    total = tile_h * 3 + gap * 2
    y_start = (size - total) // 2
    margin = int(size * 0.08)
    tile_w = size - margin * 2
    r = int(size * 0.05)

    colors = [(CORRECT, "W"), (SEMICORRECT, "G"), (GRAY, "L")]
    for i, (bg, letter) in enumerate(colors):
        y = y_start + i * (tile_h + gap)
        tile = Image.new("RGBA", (tile_w, tile_h), (0, 0, 0, 0))
        d = ImageDraw.Draw(tile)
        d.rounded_rectangle([0, 0, tile_w - 1, tile_h - 1], radius=r, fill=bg)
        font_size = int(tile_h * 0.6)
        font = ImageFont.truetype(font_path, font_size)
        bbox = font.getbbox(letter)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        tx = (tile_w - tw) // 2 - bbox[0]
        ty = (tile_h - th) // 2 - bbox[1]
        d.text((tx, ty), letter, fill=WHITE, font=font)
        img.paste(tile, (margin, y), tile)
    return img


def option_d(size, font_path):
    """2x2 abstract grid: 2 green, 1 gold, 1 gray."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    gap = int(size * 0.06)
    margin = int(size * 0.05)
    cell = (size - margin * 2 - gap) // 2
    r = int(size * 0.055)
    colors = [CORRECT, CORRECT, SEMICORRECT, GRAY]
    positions = [
        (margin, margin),
        (margin + cell + gap, margin),
        (margin, margin + cell + gap),
        (margin + cell + gap, margin + cell + gap),
    ]
    for (x, y), bg in zip(positions, colors):
        draw.rounded_rectangle([x, y, x + cell, y + cell], radius=r, fill=bg)
    return img


def option_e(size, font_path):
    """Editorial: warm paper, ink italic W, green accent bar at top."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    r = int(size * 0.125)
    draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=r, fill=PAPER)

    # Green accent bar
    bar_h = max(int(size * 0.03), 2)
    draw.rectangle([0, 0, size - 1, bar_h - 1], fill=CORRECT)

    # Italic W — Fraunces doesn't have a separate italic file in variable,
    # so we render normal and let the serif character speak
    font_size = int(size * 0.72)
    font = ImageFont.truetype(font_path, font_size)
    bbox = font.getbbox("W")
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    x = (size - tw) // 2 - bbox[0]
    y = (size - th) // 2 - bbox[1] + int(size * 0.02)
    draw.text((x, y), "W", fill=INK, font=font)
    return img


def option_f(size, font_path):
    """Green tile + white globe wireframe."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    r = int(size * 0.125)
    draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=r, fill=CORRECT)

    cx, cy = size // 2, size // 2
    gr = int(size * 0.31)
    lw = max(int(size * 0.03), 2)
    # Circle
    draw.ellipse([cx - gr, cy - gr, cx + gr, cy + gr], outline=WHITE, width=lw)
    # Equator
    draw.line([cx - gr, cy, cx + gr, cy], fill=WHITE, width=lw)
    # Meridian (ellipse)
    mr = int(gr * 0.5)
    draw.ellipse([cx - mr, cy - gr, cx + mr, cy + gr], outline=WHITE, width=lw)
    # Latitude lines
    lat_offset = int(gr * 0.5)
    draw.line([cx - gr + lw, cy - lat_offset, cx + gr - lw, cy - lat_offset], fill=WHITE, width=lw)
    draw.line([cx - gr + lw, cy + lat_offset, cx + gr - lw, cy + lat_offset], fill=WHITE, width=lw)
    return img


OPTIONS = {
    "a": ("Green tile + W", option_a),
    "b": ("Ink tile + W", option_b),
    "c": ("Three stacked tiles", option_c),
    "d": ("2x2 grid", option_d),
    "e": ("Editorial W", option_e),
    "f": ("Green globe tile", option_f),
}

DEPLOY_SIZES = {
    "favicon-16x16.png": 16,
    "favicon-32x32.png": 32,
    "android-chrome-192x192.png": 192,
    "android-chrome-512x512.png": 512,
    "apple-touch-icon.png": 180,
}


def generate_previews(font_path):
    """Generate 512px preview PNGs for all options."""
    for key, (label, fn) in OPTIONS.items():
        img = fn(512, font_path)
        path = os.path.join(FAVICON_DIR, f"option-{key}.png")
        img.save(path, "PNG")
        print(f"  ✓ option-{key}.png — {label}")


def deploy_option(key, font_path):
    """Generate all required sizes for the chosen option and overwrite favicon files."""
    if key not in OPTIONS:
        print(f"Unknown option: {key}. Choose from: {', '.join(OPTIONS.keys())}")
        sys.exit(1)
    label, fn = OPTIONS[key]
    print(f"Deploying option {key}: {label}")
    for filename, sz in DEPLOY_SIZES.items():
        img = fn(sz, font_path)
        # Convert to RGB for non-transparent formats
        rgb = Image.new("RGB", img.size, PAPER)
        rgb.paste(img, mask=img.split()[-1])
        path = os.path.join(FAVICON_DIR, filename)
        rgb.save(path, "PNG")
        print(f"  ✓ {filename} ({sz}×{sz})")
    # Generate ICO (contains 16 + 32)
    img16 = fn(16, font_path)
    img32 = fn(32, font_path)
    ico_path = os.path.join(FAVICON_DIR, "favicon.ico")
    img32.save(ico_path, "ICO", sizes=[(16, 16), (32, 32)])
    print(f"  ✓ favicon.ico (16+32)")
    print(f"\nDone! Favicon deployed as option {key}.")


def main():
    font_path = ensure_font()
    if "--pick" in sys.argv:
        idx = sys.argv.index("--pick")
        key = sys.argv[idx + 1] if idx + 1 < len(sys.argv) else None
        if not key:
            print("Usage: --pick <a|b|c|d|e|f>")
            sys.exit(1)
        deploy_option(key, font_path)
    else:
        print("Generating favicon previews...")
        generate_previews(font_path)
        # Clean up old SVG options
        for f in os.listdir(FAVICON_DIR):
            if f.startswith("option-") and f.endswith(".svg"):
                os.remove(os.path.join(FAVICON_DIR, f))
        print(f"\nPreview PNGs saved to {FAVICON_DIR}/option-*.png")
        print("Pick one with: uv run python scripts/generate_favicon.py --pick <letter>")


if __name__ == "__main__":
    main()
