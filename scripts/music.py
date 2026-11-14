"""Compose the background music for one reel, to its exact length and cuts.

Usage: python3 scripts/music.py <out.wav> <sfx.json> [mood]
  mood: tense (stock fell, default), lift (stock rose), neutral

Original music written note by note here and played with the FluidR3 General MIDI soundfont (MIT licence,
Debian package fluid-soundfont-gm), so there is nothing to license and nothing for a copyright match to flag.

The arrangement follows the reel:
  0 s           hit: low piano + timpani + soft cymbal under the hook, so frame 1 has weight
  hook -> body  pulse: muted piano ostinato, warm pad, sub bass, kick and ticking hats (a newsroom clock)
  middle cut    drop: drums out for one bar (an attention reset), back in on the next downbeat
  end card      resolve: everything settles on the home chord with a bell, the sign-off
"""
import json
import subprocess
import sys
import tempfile
from pathlib import Path

import mido

SF2 = next((p for p in ["/usr/share/sounds/sf2/FluidR3_GM.sf2", "/usr/share/soundfonts/FluidR3_GM.sf2"]
            if Path(p).exists()), None)
TPB = 480

MOODS = {
    # key root (MIDI), BPM, progression as (root offset, minor?) per bar
    "tense": (57, 104, [(0, True), (-4, False), (3, False), (-2, False)]),      # Am  F  C  G
    "neutral": (62, 100, [(0, True), (-2, False), (-4, False), (-2, False)]),   # Dm  C  Bb C
    "lift": (60, 108, [(0, False), (7, False), (9, True), (5, False)]),         # C   G  Am F
}
PIANO, PAD, BASS, BELL, TIMP = 0, 89, 33, 14, 47     # GM programs
KICK, RIM, HAT, SHAKER, CRASH = 36, 37, 42, 70, 49   # GM drum notes (channel 10)


def chord(root, minor):
    return [root, root + (3 if minor else 4), root + 7]


def compose(T, cuts, mood, end_at):
    key, bpm, prog = MOODS[mood]
    beat = 60 / bpm
    ev = []  # (time s, channel, note, velocity, length s)

    def n(t, ch, note, vel, length):
        if t < T:
            ev.append((t, ch, note, vel, min(length, T - t)))

    hook_end = cuts[0] if cuts else 2.0
    mid = cuts[len(cuts) // 2] if cuts else T / 2
    bar = 4 * beat
    # Drop: the bar that starts at the bar line before the middle cut.
    drop_from = (mid // bar) * bar
    drop_to = drop_from + bar

    # Hit under the hook.
    k0, m0 = prog[0]
    n(0, 0, key - 24 + k0, 110, 2.5)
    n(0, 0, key - 12 + k0, 90, 2.5)
    n(0, 4, key - 24 + k0, 100, 1.2)
    n(0, 9, CRASH, 50, 2)
    for i, x in enumerate(chord(key + k0, m0)):
        n(0, 1, x, 55, hook_end + 0.5)

    # Body: bars until the end card.
    t0 = hook_end
    b = 0
    while t0 < end_at - 0.05:
        off, minor = prog[b % len(prog)]
        c = chord(key + off, minor)
        length = min(bar, end_at - t0)
        for x in c:
            n(t0, 1, x, 48, length)                         # pad
        n(t0, 2, key - 24 + off, 85, length * 0.9)          # bass
        arp = [c[0], c[1], c[2], c[1] + 12, c[2], c[1], c[0] + 12, c[2]]
        for i, x in enumerate(arp):                         # muted piano 8ths
            n(t0 + i * beat / 2, 0, x, 62 if i % 2 == 0 else 50, beat / 2 * 0.8)
        for i in range(8):
            t = t0 + i * beat / 2
            if drop_from <= t < drop_to or t >= end_at:
                continue
            if i % 4 == 0:
                n(t, 9, KICK, 80, 0.2)
            if i in (2, 6):
                n(t, 9, RIM, 45, 0.1)
            n(t, 9, HAT if i % 2 else SHAKER, 38 if i % 2 else 30, 0.05)
        if abs(t0 - drop_to) < 0.01:
            n(t0, 9, CRASH, 45, 1.5)
        t0 += bar
        b += 1

    # Resolve on the end card.
    off, minor = prog[0]
    home = chord(key + off, minor if mood != "tense" else True)
    for x in home:
        n(end_at, 0, x, 70, T - end_at)
        n(end_at, 1, x, 50, T - end_at)
    n(end_at, 2, key - 24 + off, 80, T - end_at)
    n(end_at, 3, key + 12 + off, 70, 3)
    n(end_at + beat, 3, key + 19 + off, 55, 3)
    return ev, bpm


def to_midi(ev, bpm, path):
    mid = mido.MidiFile(ticks_per_beat=TPB)
    tr = mido.MidiTrack()
    mid.tracks.append(tr)
    tempo = mido.bpm2tempo(bpm)
    tr.append(mido.MetaMessage("set_tempo", tempo=tempo))
    for ch, prog in [(0, PIANO), (1, PAD), (2, BASS), (3, BELL), (4, TIMP)]:
        tr.append(mido.Message("program_change", channel=ch, program=prog, time=0))
    tr.append(mido.Message("control_change", channel=0, control=7, value=90))
    tr.append(mido.Message("control_change", channel=1, control=7, value=70))
    tr.append(mido.Message("control_change", channel=0, control=91, value=60))  # reverb
    tr.append(mido.Message("control_change", channel=1, control=91, value=80))
    sec2tick = lambda s: int(round(s / (tempo / 1e6) * TPB))  # noqa: E731
    msgs = []
    for t, ch, note, vel, length in ev:
        msgs.append((sec2tick(t), 1, mido.Message("note_on", channel=ch, note=note, velocity=vel)))
        msgs.append((sec2tick(t + length), 0, mido.Message("note_off", channel=ch, note=note, velocity=0)))
    msgs.sort(key=lambda m: (m[0], m[1]))
    now = 0
    for tick, _, m in msgs:
        tr.append(m.copy(time=tick - now))
        now = tick
    mid.save(path)


def main(out_path, events_path, mood=None):
    sfx = json.load(open(events_path))
    T = float(sfx["duration"])
    mood = mood or sfx.get("mood") or "tense"
    cuts = sorted(sfx.get("cuts", []))
    end_at = float(sfx.get("endCard", T - 6 if T > 20 else T))
    ev, bpm = compose(T, cuts, mood, end_at)
    with tempfile.TemporaryDirectory() as d:
        midi = f"{d}/m.mid"
        raw = f"{d}/raw.wav"
        to_midi(ev, bpm, midi)
        subprocess.run(["fluidsynth", "-ni", "-q", "-g", "0.6", "-r", "44100", "-F", raw, SF2, midi], check=True,
                       stdout=subprocess.DEVNULL)
        # Warm it up and sit it back: roll off harsh highs, gentle room, even loudness, fade out at the end.
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", raw, "-af",
                        f"highpass=f=40,lowpass=f=9000,aecho=0.8:0.5:60:0.25,atrim=0:{T},"
                        f"afade=t=out:st={max(0, T - 1.2)}:d=1.2,loudnorm=I=-20:TP=-3,"
                        "aresample=44100", "-ac", "1", out_path], check=True)
    print(f"music: {mood}, {bpm} bpm, {T:.1f}s -> {out_path}")


if __name__ == "__main__":
    if not SF2:
        sys.exit("FluidR3_GM soundfont missing: apt-get install fluidsynth fluid-soundfont-gm")
    main(*sys.argv[1:4])
