"""Synthesize the channel's newsroom sound library (free, ours, no API): public/sfx/lib/<name>.wav.

Usage: python3 scripts/sfxsynth.py

scripts/sfx.py mixes these into every reel. An ElevenLabs-made <name>.mp3 (scripts/sfxlib.py), if present,
takes priority over the .wav of the same name.
"""
from pathlib import Path
import wave

import numpy as np

SR = 44100
LIB = Path(__file__).resolve().parent.parent / "public/sfx/lib"
rng = np.random.default_rng(11)


def t(d):
    return np.arange(int(SR * d)) / SR


def band(x, lo, hi):
    """Band-pass by FFT mask (cheap, fine for effects)."""
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X[(f < lo) | (f > hi)] = 0
    return np.fft.irfft(X, len(x))


def sweep(d, f0, f1, k=6):
    tt = t(d)
    f = f1 + (f0 - f1) * np.exp(-tt * k)
    return np.sin(2 * np.pi * np.cumsum(f) / SR)


def env(d, attack=0.005, decay=6.0):
    tt = t(d)
    return np.minimum(1, tt / attack) * np.exp(-tt * decay)


def norm(x, peak=0.9):
    return x / (np.max(np.abs(x)) or 1) * peak


def sting():
    d = 1.6
    boom = sweep(d, 90, 38, 4) * env(d, 0.004, 3.2)
    bell = sum(a * np.sin(2 * np.pi * f * t(d)) * env(d, 0.002, k) for f, a, k in
               [(880, 0.35, 3.0), (1318, 0.25, 3.5), (1760, 0.15, 4.5), (2637, 0.1, 6.0)])
    hit = band(rng.standard_normal(len(t(d))), 200, 6000) * env(d, 0.001, 30) * 0.6
    return norm(boom * 0.9 + bell + hit)


def whoosh():
    d = 0.5
    tt = t(d)
    shape = np.sin(np.pi * tt / d) ** 2
    paper = band(rng.standard_normal(len(tt)), 1200, 7000) * shape
    crackle = np.zeros(len(tt))
    for i in rng.integers(0, len(tt) - 200, 70):
        crackle[i:i + 60] += rng.standard_normal(60) * np.exp(-np.arange(60) / 12)
    return norm(paper + band(crackle, 2000, 9000) * 0.6 * shape)


def rip():
    d = 0.7
    tt = t(d)
    x = np.zeros(len(tt))
    for i in np.sort(rng.integers(0, int(len(tt) * 0.8), 260)):
        n = int(rng.integers(30, 120))
        x[i:i + n] += rng.standard_normal(min(n, len(tt) - i)) * np.exp(-np.arange(min(n, len(tt) - i)) / 25)
    return norm(band(x, 900, 10000) * np.minimum(1, tt / 0.03) * np.exp(-tt * 2.5))


def stamp():
    d = 0.4
    thump = sweep(d, 140, 50, 18) * env(d, 0.002, 14)
    slap = band(rng.standard_normal(len(t(d))), 300, 5000) * env(d, 0.001, 60)
    return norm(thump + slap * 0.7)


def impact():
    d = 1.1
    sub = sweep(d, 70, 32, 3) * env(d, 0.003, 3.0)
    body = sweep(d, 180, 60, 12) * env(d, 0.002, 9)
    tail = band(rng.standard_normal(len(t(d))), 80, 1500) * env(d, 0.002, 7) * 0.5
    return norm(sub + body * 0.6 + tail)


def tick():
    d = 0.12
    click = band(rng.standard_normal(len(t(d))), 1500, 9000) * env(d, 0.0005, 160)
    ring = np.sin(2 * np.pi * 3150 * t(d)) * env(d, 0.0005, 70) * 0.4
    return norm(click + ring, 0.8)


def click():
    d = 0.15
    a = band(rng.standard_normal(len(t(d))), 2000, 10000) * env(d, 0.0005, 120)
    b = np.roll(a, int(SR * 0.045)) * 0.6
    return norm(a + b, 0.7)


def fall():
    d = 1.6
    tt = t(d)
    f = 120 + 520 * np.exp(-tt * 1.8)
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * (0.8 + 0.2 * np.sin(2 * np.pi * 7 * tt))
    return norm(tone * np.minimum(1, tt / 0.08) * np.exp(-tt * 1.1), 0.7)


def bed():
    d = 8.0  # loops cleanly at 120 bpm (16 beats)
    tt = t(d)
    x = np.zeros(len(tt))
    pad = sum(np.sin(2 * np.pi * f * tt + p) for f, p in [(110, 0), (130.81, 1), (164.81, 2), (220, 0.5)])
    x += pad * (0.55 + 0.45 * np.sin(2 * np.pi * tt / d)) * 0.08
    for b in np.arange(0, d, 0.5):  # soft pulse
        i = int(b * SR)
        p = sweep(0.3, 75, 48, 20) * env(0.3, 0.003, 12) * 0.5
        x[i:i + len(p)] += p[: len(tt) - i]
    for b in np.arange(0.25, d, 0.5):  # clock tick
        i = int(b * SR)
        k = band(rng.standard_normal(1200), 4000, 11000) * np.exp(-np.arange(1200) / 120) * 0.12
        x[i:i + len(k)] += k[: len(tt) - i]
    return norm(x, 0.6)


def save(name, x):
    LIB.mkdir(parents=True, exist_ok=True)
    with wave.open(str(LIB / f"{name}.wav"), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes())
    print(f"  {name}.wav {len(x) / SR:.2f}s")


if __name__ == "__main__":
    for fn in (sting, whoosh, rip, stamp, impact, tick, click, fall, bed):
        save(fn.__name__, fn())
