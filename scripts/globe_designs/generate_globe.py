"""Generate rotating globe APNG — v3 with proper anti-aliasing and no edge clipping."""

import math
from pathlib import Path

import numpy as np
import shapefile
from PIL import Image, ImageDraw, ImageFilter

# Colors
OCEAN = (37, 99, 235)
LAND = (34, 197, 94)

OUTPUT_SIZE = 64
RENDER_SIZE = 256  # 4x supersampling
FRAMES = 16
RADIUS = RENDER_SIZE * 0.44  # leave padding
CX, CY = RENDER_SIZE / 2, RENDER_SIZE / 2


def build_land_grid(coastlines, resolution=720):
    """Build high-res land mask with dateline wrapping."""
    h = resolution // 2
    w = resolution
    # Render at 3x width to handle dateline wrapping, then tile
    wide_w = w * 3
    grid_img = Image.new("L", (wide_w, h), 0)
    draw = ImageDraw.Draw(grid_img)
    scale_x = w / 360.0
    scale_y = h / 180.0
    for poly in coastlines:
        for offset in [-360, 0, 360]:
            pts = [((lon + offset + 180) * scale_x + w, (90 - lat) * scale_y) for lat, lon in poly]
            if len(pts) >= 3:
                draw.polygon(pts, fill=255)
    # Crop the center strip
    grid_arr = np.array(grid_img)[:, w:w*2]
    return grid_arr > 128, w, h


def render_shaded(rotation_deg, land_grid, grid_w, grid_h):
    """Render one shaded globe frame."""
    pixels = np.zeros((RENDER_SIZE, RENDER_SIZE, 4), dtype=np.uint8)
    angle_rad = math.radians(rotation_deg)
    ca, sa = math.cos(-angle_rad), math.sin(-angle_rad)

    # Precompute lighting direction
    light = np.array([0.35, 0.5, 0.75])
    light /= np.linalg.norm(light)

    for py in range(RENDER_SIZE):
        dy = -(py - CY) / RADIUS
        dy2 = dy * dy
        if dy2 >= 1.0:
            continue
        for px in range(RENDER_SIZE):
            dx = (px - CX) / RADIUS
            dist_sq = dx * dx + dy2
            if dist_sq >= 1.0:
                continue
            dz = math.sqrt(1.0 - dist_sq)

            # Inverse rotate to get world-space coordinates
            rx = dx * ca + dz * sa
            ry = dy
            rz = -dx * sa + dz * ca

            # To lat/lon
            lat = math.asin(max(-1.0, min(1.0, ry)))
            lon = math.atan2(rx, rz)

            # Grid lookup
            gx = int(((math.degrees(lon) + 180.0) % 360.0) * grid_w / 360.0)
            gy = int((90.0 - math.degrees(lat)) * grid_h / 180.0)
            gx = min(gx, grid_w - 1)
            gy = min(gy, grid_h - 1)
            is_land = land_grid[gy, gx]

            # Diffuse lighting
            brightness = dx * light[0] + dy * light[1] + dz * light[2]
            brightness = max(0.28, brightness * 0.7 + 0.35)

            base = LAND if is_land else OCEAN
            r = min(255, int(base[0] * brightness))
            g = min(255, int(base[1] * brightness))
            b = min(255, int(base[2] * brightness))
            pixels[py, px] = [r, g, b, 255]

    img = Image.fromarray(pixels, "RGBA")

    # Specular highlight
    spec = Image.new("RGBA", (RENDER_SIZE, RENDER_SIZE), (0, 0, 0, 0))
    ImageDraw.Draw(spec).ellipse(
        [CX - 30, CY - 40, CX + 15, CY - 5],
        fill=(255, 255, 255, 40),
    )
    spec = spec.filter(ImageFilter.GaussianBlur(18))
    mask = Image.new("L", (RENDER_SIZE, RENDER_SIZE), 0)
    R = int(RADIUS)
    ImageDraw.Draw(mask).ellipse([int(CX)-R, int(CY)-R, int(CX)+R, int(CY)+R], fill=255)
    from PIL import ImageChops
    spec.putalpha(ImageChops.multiply(spec.split()[3], mask))
    img = Image.alpha_composite(img, spec)

    # Downscale with LANCZOS for smooth edges
    img = img.resize((OUTPUT_SIZE, OUTPUT_SIZE), Image.LANCZOS)
    return img


def main():
    out = Path(__file__).parent
    out.mkdir(exist_ok=True)

    print("Loading coastlines...")
    sf = shapefile.Reader("/tmp/ne_land/ne_110m_land")
    coastlines = []
    for shape in sf.shapes():
        parts = list(shape.parts) + [len(shape.points)]
        for i in range(len(parts) - 1):
            ring = shape.points[parts[i]:parts[i + 1]]
            coastlines.append([(pt[1], pt[0]) for pt in ring])
    print(f"  {len(coastlines)} polygons")

    print("Building land grid (720x360)...")
    land_grid, gw, gh = build_land_grid(coastlines, resolution=720)

    print(f"Rendering {FRAMES} frames at {RENDER_SIZE}px → {OUTPUT_SIZE}px...")
    frames = []
    for i in range(FRAMES):
        angle = (360.0 / FRAMES) * i
        frame = render_shaded(angle, land_grid, gw, gh)
        frames.append(frame)
        print(f"  {i+1}/{FRAMES}")

    # Save APNG — 350ms per frame = slow, gentle rotation
    delay = 350
    frames[0].save(
        out / "globe_v3.apng",
        save_all=True, append_images=frames[1:],
        duration=delay, loop=0, disposal=2,
    )
    frames[0].save(out / "globe_v3_f0.png")
    frames[4].save(out / "globe_v3_f4.png")
    frames[8].save(out / "globe_v3_f8.png")

    size_kb = (out / "globe_v3.apng").stat().st_size // 1024
    print(f"\nSaved: globe_v3.apng ({size_kb}KB, {FRAMES} frames, {delay}ms/frame)")
    print(f"  file://{out}/globe_v3.apng")


if __name__ == "__main__":
    main()
