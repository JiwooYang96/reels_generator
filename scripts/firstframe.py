"""First-frame check: the reel's frame 0 must already show the hook (text and picture), not a blank page.

Usage: python3 scripts/firstframe.py out/<id>.mp4      exits 1 if frame 0 looks empty

Viewers decide to skip before anything animates in, and a blank or near-blank opening frame looks like a video
that hasn't started. Measures how much of frame 0 is "ink" (edges + strong colour) against the paper texture.
"""
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageFilter, ImageStat

MIN_INK = 1.0   # % of the frame with strong edges; a blank broadsheet page scores 0.2, a drawn opening 1.3-6


def ink(img):
    g = img.convert("L").resize((270, 480))
    edges = g.filter(ImageFilter.FIND_EDGES)
    import numpy as np
    strong = int((np.asarray(edges) > 60).sum())
    return 100.0 * strong / (270 * 480)


def frame(mp4, t, out):
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(t), "-i", str(mp4), "-frames:v", "1", str(out)], check=True)
    return Image.open(out)


def main(mp4):
    with tempfile.TemporaryDirectory() as d:
        f0 = ink(frame(mp4, 0, Path(d) / "f0.png"))
        # 1.2 s: still inside the first shot (max 1.6 s since the split hook), so we compare the opening with itself
        f2 = ink(frame(mp4, 1.2, Path(d) / "f2.png"))
    ok = f0 >= MIN_INK and f0 >= 0.6 * f2
    print(f"FIRST FRAME: ink {f0:.1f}% at 0 s vs {f2:.1f}% at 1.2 s -> {'OK' if ok else 'TOO EMPTY: the hook must be on screen at frame 0'}")
    return 0 if ok else 1


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    sys.exit(main(sys.argv[1]))
