"""Cut an illustration out as a piece of torn paper, magazine-collage style.

Usage: python3 scripts/tornpaper.py in.jpg out.png [--seed N]

The subject is found against its plain paper background, the paper around it is torn along a ragged line that
loosely follows the subject (generous margin, like a piece ripped out of a magazine), the torn edge gets a pale
fibrous rim where the paper's white core shows, and a soft contact shadow is added. Output is an RGBA PNG for
the `illustration` scene. Crops the outer 4% first, so artist-style marks in the corners never survive.
"""
import sys

import numpy as np
from PIL import Image, ImageChops, ImageFilter


def blur(a, r):
    return np.asarray(Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r)),
                      dtype=np.float32) / 255


def torn(src, dst, seed=7):
    rng = np.random.default_rng(seed)
    im = Image.open(src).convert("RGB")
    w, h = im.size
    c = int(min(w, h) * 0.04)
    im = im.crop((c, c, w - c, h - c)).resize((1024, 1024), Image.LANCZOS)
    a = np.asarray(im, dtype=np.float32) / 255
    W = H = 1024

    # 1. Subject mask: how far each pixel is from the paper colour (median of the border).
    border = np.concatenate([a[:12].reshape(-1, 3), a[-12:].reshape(-1, 3), a[:, :12].reshape(-1, 3), a[:, -12:].reshape(-1, 3)])
    paper = np.median(border, axis=0)
    diff = np.abs(a - paper).sum(axis=2)
    ink = (blur((diff > 0.18).astype(np.float32), 3) > 0.15).astype(np.float32)
    # Drop thin, small marks (stray scribbles, fake signatures) before growing the piece: erode then grow back.
    core_ink = np.asarray(Image.fromarray((ink * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(9)), dtype=np.float32) / 255
    ink = np.asarray(Image.fromarray((core_ink * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(9)), dtype=np.float32) / 255

    # 2. A generous, soft blob around the subject (the piece someone would tear out), smoothed.
    blob = blur(ink, 38)
    blob = (blob > 0.04).astype(np.float32)
    blob = blur(blob, 22)

    # 3. Ragged torn edge: displace the threshold with multi-scale noise.
    def noise(scale, amp):
        n = rng.random((H // scale + 2, W // scale + 2)).astype(np.float32)
        n = np.asarray(Image.fromarray((n * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC), dtype=np.float32) / 255
        return (n - 0.5) * amp
    field = blob + noise(64, 0.55) + noise(16, 0.22) + noise(4, 0.10)
    piece = (field > 0.5).astype(np.float32)
    # Keep the piece inside the frame with a margin.
    m = np.zeros_like(piece)
    m[40:-40, 40:-40] = 1
    piece *= blur(m, 6) > 0.5
    # Fill holes: a torn piece is one solid sheet. Everything not reachable from the outside is paper.
    outside = Image.fromarray(((1 - piece) * 255).astype(np.uint8)).convert("L")
    from PIL import ImageDraw
    ImageDraw.floodfill(outside, (0, 0), 128)
    piece = (np.asarray(outside) != 128).astype(np.float32)

    # 4. Fibrous rim: a thin band just inside the edge where the torn paper's white core shows.
    inner = (blur(piece, 2.5) > 0.98).astype(np.float32)
    rim = np.clip(piece - inner, 0, 1)
    rim = np.maximum(rim, (blur(piece, 1.5) > 0.5) * (blur(inner, 6) < 0.97) * (noise(2, 1.0) > 0.0))
    rim = np.clip(rim * piece, 0, 1)

    # 5. Compose: the illustration on its own paper, a near-white rim, paper alpha with a soft shadow below.
    rgb = a.copy()
    core = np.array([0.985, 0.975, 0.955], dtype=np.float32)
    rgb = rgb * (1 - rim[..., None] * 0.9) + core * (rim[..., None] * 0.9)
    shadow = blur(np.roll(np.roll(piece, 10, axis=0), 6, axis=1), 14) * 0.38
    alpha = np.clip(np.maximum(piece, shadow), 0, 1)
    color = rgb * piece[..., None] + np.array([0.08, 0.07, 0.06]) * (1 - piece[..., None])
    out = np.dstack([color, alpha])
    img = Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8), "RGBA")
    img = img.crop(img.getbbox() or (0, 0, W, H))
    img.save(dst)
    return dst


if __name__ == "__main__":
    seed = int(sys.argv[sys.argv.index("--seed") + 1]) if "--seed" in sys.argv else 7
    torn(sys.argv[1], sys.argv[2], seed)
