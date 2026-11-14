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

When the newsroom library exists (public/sfx/lib: *.wav from scripts/sfxsynth.py, or ElevenLabs *.mp3 from
scripts/sfxlib.py, which win), its sounds replace the inline ones: a news sting on the first frame, paper whooshes on cuts, boom + stamp on impacts, typewriter
ticks, a falling tone, and a low news underscore as the bed. "voice": true (set by prepare.ts when there is
narration) turns the bed down so the voice sits on top.
"""
import json
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np

SR = 44100
LIB = Path(__file__).resolve().parent.parent / "public/sfx/lib"


def load(name):
    """Decode public/sfx/lib/<name>.mp3 (ElevenLabs, preferred) or .wav (scripts/sfxsynth.py) to mono float
    samples, or None when neither is there."""
    f = next((LIB / f"{name}.{ext}" for ext in ("mp3", "wav") if (LIB / f"{name}.{ext}").exists()), None)
    if f is None:
        return None
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(f), "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"],
                         capture_output=True, check=True).stdout
    x = np.frombuffer(raw, dtype=np.int16).astype(np.float64) / 32768
    peak = np.max(np.abs(x)) or 1
    return x / peak


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

    lib = {n: load(n) for n in ("sting", "whoosh", "rip", "stamp", "impact", "tick", "click", "fall", "bed")}
    voiced = bool(ev.get("voice"))
    g = lambda name, a: None if lib.get(name) is None else a * lib[name]  # noqa: E731

    # Music (scripts/music.py, passed as "music": path) replaces the bed. It dips about 6 dB while the narrator
    # speaks (fast 0.12 s ramps, so it breathes back up between lines).
    music = ev.get("music")
    if music and Path(music).exists():
        raw = subprocess.run(["ffmpeg", "-v", "error", "-i", music, "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"],
                             capture_output=True, check=True).stdout
        m = np.frombuffer(raw, dtype=np.int16).astype(np.float64) / 32768
        m = m[:n] / (np.max(np.abs(m)) or 1)
        gain = np.ones(len(m))
        for a, b in ev.get("vo", []):
            gain[int(a * SR):int(b * SR)] = 0.5
        k = int(SR * 0.12)
        gain = np.convolve(gain, np.ones(k) / k, "same")
        out[:len(m)] += m * gain * (0.9 if voiced else 1.0)
    # Bed: the ElevenLabs underscore looped, or the synthesized kick/hat pattern.
    elif lib["bed"] is not None:
        bed = lib["bed"] * (0.16 if voiced else 0.3)
        fade = int(SR * 0.25)
        bed[:fade] *= np.linspace(0, 1, fade)
        bed[-fade:] *= np.linspace(1, 0, fade)
        for start in np.arange(0, T, len(bed) / SR - 0.25):
            add(bed, start)
    else:
        for b in np.arange(0, T, 0.5):
            add(kick(a=0.2 if voiced else 0.33), b)
        for b in np.arange(0.25, T, 0.5):
            add(noise(0.06, 0.05, 80), b)
        out += 0.04 * np.sin(2 * np.pi * 49 * t) * np.minimum(1, t / 0.5) * np.minimum(1, (T - t) / 0.5)

    if lib["sting"] is not None:
        add(0.6 * lib["sting"], 0)
    # The paper rip goes on the rehook tear when there is one (it rips about 0.25 s after the cut), else on the
    # middle cut; whooshes on the other cuts.
    cuts = ev.get("cuts", [])
    tear = ev.get("tear")
    rip_k = min(range(len(cuts)), key=lambda k: abs(cuts[k] + 0.25 - tear)) if tear and cuts else len(cuts) // 2
    for k, c in enumerate(cuts):
        if k == rip_k and lib["rip"] is not None:
            add(0.55 * lib["rip"], max(0, c + (0.0 if tear else -0.25)))
        else:
            s_ = g("whoosh", 0.4)
            add(s_ if s_ is not None else whoosh(), max(0, c - 0.25))
    for s in ev.get("fall", []):
        add(g("fall", 0.35) if lib["fall"] is not None else fall(), s)
    for start, end, step in ev.get("ticks", []):
        for k in np.arange(start, end, step * 2 if lib["tick"] is not None else step):
            add(g("tick", 0.18) if lib["tick"] is not None else tick(0.07, 1800 + (k - start) * 600), k)
    for h in ev.get("impacts", []):
        if lib["impact"] is not None:
            add(0.7 * lib["impact"], h)
            if lib["stamp"] is not None:
                add(0.45 * lib["stamp"], h)
        else:
            add(kick(0.5, 180, 35, 0.9), h)
            add(noise(0.25, 0.25, 18), h)
    for h in ev.get("clicks", []):
        add(g("click", 0.3) if lib["click"] is not None else tick(0.22, 1500), h)

    out = out / np.max(np.abs(out)) * 0.85
    with wave.open(out_path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((out * 32767).astype(np.int16).tobytes())
    print(f"wrote {out_path} ({T:.1f}s)")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
