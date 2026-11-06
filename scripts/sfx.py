"""Generate a sound-effects track for a short.

Usage:
  python3 scripts/sfx.py public/sfx-<name>.wav events.json

events.json example (times in seconds = frame / 30):
  {"duration": 10, "cuts": [2.33, 5.0, 7.5], "impacts": [1.33, 3.67],
   "ticks": [[0.15, 1.33, 0.06]], "clicks": [5.47, 5.67], "fall": [0.15]}

- cuts:    whoosh 0.3 s before each cut
- impacts: kick + noise hit (slams, badges, stamps)
- ticks:   [start, end, step] counter ticks
- clicks:  single bright ticks (rows popping in)
- fall:    falling-pitch tension tone (bad-news hooks)
A soft 120 bpm kick/hat bed and a low drone always play.
"""
import json
import sys
import wave

import numpy as np

SR = 44100


def main(out_path: str, events_path: str) -> None:
    ev = json.load(open(events_path))
    T = float(ev.get("duration", 10))
    n = int(SR * T)
    out = np.zeros(n)
    t = np.arange(n) / SR
    rng = np.random.default_rng(7)

    def add(s, at):
        i = int(at * SR)
        if i >= n:
            return
        m = min(len(s), n - i)
        out[i:i + m] += s[:m]

    def kick(d=0.35, f0=120, f1=40, a=0.7):
        tt = np.arange(int(SR * d)) / SR
        f = f1 + (f0 - f1) * np.exp(-tt * 25)
        return a * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 9)

    def noise(d, a, dec):
        tt = np.arange(int(SR * d)) / SR
        s = np.diff(np.concatenate([[0], rng.standard_normal(len(tt))]))
        return a * s * np.exp(-tt * dec)

    def whoosh(d=0.35, a=0.25):
        tt = np.arange(int(SR * d)) / SR
        s = np.convolve(rng.standard_normal(len(tt)), np.ones(30) / 30, "same")
        return a * 3 * s * np.sin(np.pi * tt / d) ** 2

    def tick(a=0.1, f=2400):
        tt = np.arange(int(SR * 0.05)) / SR
        return a * np.sin(2 * np.pi * f * tt) * np.exp(-tt * 120)

    def fall(d=1.2, a=0.18):
        tt = np.arange(int(SR * d)) / SR
        f = 400 * np.exp(-tt * 1.6) + 60
        return a * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.minimum(1, tt / 0.1) * np.exp(-tt * 1.2)

    for b in np.arange(0, T, 0.5):
        add(kick(a=0.33), b)
    for b in np.arange(0.25, T, 0.5):
        add(noise(0.06, 0.05, 80), b)
    for c in ev.get("cuts", []):
        add(whoosh(), max(0, c - 0.3))
    for s in ev.get("fall", []):
        add(fall(), s)
    for start, end, step in ev.get("ticks", []):
        for k in np.arange(start, end, step):
            add(tick(0.07, 1800 + (k - start) * 600), k)
    for h in ev.get("impacts", []):
        add(kick(0.5, 180, 35, 0.9), h)
        add(noise(0.25, 0.25, 18), h)
    for h in ev.get("clicks", []):
        add(tick(0.22, 1500), h)

    out += 0.04 * np.sin(2 * np.pi * 49 * t) * np.minimum(1, t / 0.5) * np.minimum(1, (T - t) / 0.5)
    out = out / np.max(np.abs(out)) * 0.85
    with wave.open(out_path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((out * 32767).astype(np.int16).tobytes())
    print(f"wrote {out_path} ({T:.1f}s)")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
