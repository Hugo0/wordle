#!/usr/bin/env python3
"""Generate the W. favicon at all required sizes.

Uses the Fraunces variable font from the design system with size-specific
tuning: large sizes use opsz 144 (display) with the font's period glyph,
small sizes use opsz 9 (text) with a hand-drawn pixel dot for legibility.

Usage:
    uv run python scripts/generate_favicon.py            # Deploy all sizes
    uv run python scripts/generate_favicon.py --preview   # Generate preview progression
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
ACCENT = (192, 57, 43)

# ── Font setup (reuses OG image pipeline) ──
FRAUNCES_URL = "https://github.com/google/fonts/raw/main/ofl/fraunces/Fraunces%5BSOFT%2CWONK%2Copsz%2Cwght%5D.ttf"
FRAUNCES_PATH = os.path.join(FONTS_DIR, "Fraunces.ttf")

# Gap between W ink edge and dot at 512px (negative = overlap/tuck in).
# Scaled proportionally for other large sizes.
LARGE_DOT_GAP = -24

# Threshold: sizes at or below this use the small-size pixel dot approach.
SMALL_SIZE_THRESHOLD = 48


def ensure_font():
    os.makedirs(FONTS_DIR, exist_ok=True)
    if not os.path.exists(FRAUNCES_PATH):
        print("  Downloading Fraunces...")
        subprocess.run(["curl", "-sL", "-o", FRAUNCES_PATH, FRAUNCES_URL], check=True)
    return FRAUNCES_PATH


def _find_ink_bounds(font, char, canvas_size):
    """Find the leftmost and rightmost ink pixels of a rendered character."""
    img = Image.new("L", (canvas_size, canvas_size), 0)
    ImageDraw.Draw(img).text((50, 50), char, fill=255, font=font)
    left = right = 0
    for col in range(canvas_size):
        for row in range(canvas_size):
            if img.getpixel((col, row)) > 30:
                left = col
                break
        else:
            continue
        break
    for col in range(canvas_size - 1, -1, -1):
        for row in range(canvas_size):
            if img.getpixel((col, row)) > 30:
                right = col
                break
        else:
            continue
        break
    return left, right


def make_small(sz, font_path):
    """Render W. at small sizes (<=48px) with pixel-aligned dot overlay."""
    font = ImageFont.truetype(font_path, int(sz * 0.78))
    font.set_variation_by_axes([9, 900, 0, 0])  # opsz 9 (text), weight 900 (black)

    img = Image.new("RGB", (sz, sz), PAPER)
    draw = ImageDraw.Draw(img)

    bbox = font.getbbox("W")
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]

    # Center the W
    x = (sz - tw) // 2 - bbox[0]
    y = (sz - th) // 2 - bbox[1]
    draw.text((x, y), "W", fill=INK, font=font)

    # Red dot: overlaps W's bottom-right corner at baseline
    dot_d = max(round(sz * 0.16), 2)
    nudge = max(sz // 8, 2)  # push into W's right leg
    dot_x = x + bbox[0] + tw - nudge
    dot_y = y + bbox[1] + th - dot_d

    if dot_d <= 3:
        draw.rectangle([dot_x, dot_y, dot_x + dot_d - 1, dot_y + dot_d - 1], fill=ACCENT)
    else:
        draw.ellipse([dot_x, dot_y, dot_x + dot_d, dot_y + dot_d], fill=ACCENT)

    return img


def make_large(sz, font_path):
    """Render W. at large sizes (>48px) with font glyph dot."""
    font = ImageFont.truetype(font_path, int(sz * 0.664))
    font.set_variation_by_axes([144, 800, 0, 1])  # opsz 144 (display), weight 800

    canvas = sz * 2
    w_left, w_right = _find_ink_bounds(font, "W", canvas)
    w_ink_width = w_right - 50  # 50 is the draw origin

    dot_left, dot_right = _find_ink_bounds(font, ".", canvas)
    dot_ink_width = dot_right - dot_left

    gap = int(LARGE_DOT_GAP * sz / 512)
    bbox = font.getbbox("W")
    th = bbox[3] - bbox[1]
    total_width = w_ink_width + gap + dot_ink_width
    start_x = (sz - total_width) // 2
    base_y = (sz - th) // 2 - bbox[1]

    img = Image.new("RGBA", (sz, sz), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    r = int(sz * 0.125)
    draw.rounded_rectangle([0, 0, sz - 1, sz - 1], radius=r, fill=PAPER)
    draw.text((start_x, base_y), "W", fill=INK, font=font)

    dot_draw_x = start_x + w_ink_width + gap - (dot_left - 50)
    draw.text((dot_draw_x, base_y), ".", fill=ACCENT, font=font)

    return img


def make_maskable(sz, font_path):
    """Render W. with extra padding for Android adaptive icon safe zone."""
    font = ImageFont.truetype(font_path, int(sz * 0.50))
    font.set_variation_by_axes([144, 800, 0, 1])

    canvas = sz * 2
    w_left, w_right = _find_ink_bounds(font, "W", canvas)
    w_ink_width = w_right - 50

    dot_left, dot_right = _find_ink_bounds(font, ".", canvas)
    dot_ink_width = dot_right - dot_left

    gap = int(LARGE_DOT_GAP * sz / 512)
    bbox = font.getbbox("W")
    th = bbox[3] - bbox[1]
    total_width = w_ink_width + gap + dot_ink_width
    start_x = (sz - total_width) // 2
    base_y = (sz - th) // 2 - bbox[1]

    img = Image.new("RGB", (sz, sz), PAPER)
    draw = ImageDraw.Draw(img)
    draw.text((start_x, base_y), "W", fill=INK, font=font)

    dot_draw_x = start_x + w_ink_width + gap - (dot_left - 50)
    draw.text((dot_draw_x, base_y), ".", fill=ACCENT, font=font)

    return img


def make_favicon(sz, font_path):
    """Route to the appropriate renderer based on size."""
    if sz <= SMALL_SIZE_THRESHOLD:
        return make_small(sz, font_path)
    return make_large(sz, font_path)


DEPLOY_SIZES = {
    "favicon-16x16.png": 16,
    "favicon-32x32.png": 32,
    "apple-touch-icon.png": 180,
    "android-chrome-192x192.png": 192,
    "android-chrome-512x512.png": 512,
}


def deploy(font_path):
    """Generate all required sizes and overwrite favicon files."""
    print("Deploying W. favicon...")
    for filename, sz in DEPLOY_SIZES.items():
        img = make_favicon(sz, font_path)
        # Convert RGBA to RGB for PNG output
        if img.mode == "RGBA":
            rgb = Image.new("RGB", img.size, PAPER)
            rgb.paste(img, mask=img.split()[-1])
            img = rgb
        path = os.path.join(FAVICON_DIR, filename)
        img.save(path, "PNG")
        print(f"  ✓ {filename} ({sz}×{sz})")

    # Maskable icon (Android adaptive)
    maskable = make_maskable(512, font_path)
    maskable.save(os.path.join(FAVICON_DIR, "maskable-512x512.png"), "PNG")
    print("  ✓ maskable-512x512.png (512×512)")

    # ICO (contains 16 + 32)
    img16 = make_favicon(16, font_path)
    img32 = make_favicon(32, font_path)
    ico_path = os.path.join(FAVICON_DIR, "favicon.ico")
    img32.save(ico_path, "ICO", sizes=[(16, 16), (32, 32)])
    print("  ✓ favicon.ico (16+32)")

    print("\nDone!")


def preview(font_path):
    """Generate a size progression for visual review."""
    print("Generating preview progression...")
    for sz in [16, 24, 32, 48, 64, 128, 256, 512]:
        img = make_favicon(sz, font_path)
        if img.mode == "RGBA":
            rgb = Image.new("RGB", img.size, PAPER)
            rgb.paste(img, mask=img.split()[-1])
            img = rgb
        path = os.path.join(FAVICON_DIR, f"progression-{sz}.png")
        img.save(path, "PNG")
        print(f"  ✓ progression-{sz}.png")
    print(f"\nPreviews saved to {FAVICON_DIR}/progression-*.png")


def main():
    font_path = ensure_font()
    if "--preview" in sys.argv:
        preview(font_path)
    else:
        deploy(font_path)


if __name__ == "__main__":
    main()
