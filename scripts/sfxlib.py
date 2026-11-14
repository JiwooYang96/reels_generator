"""Build the channel's sound-effects library once with ElevenLabs sound generation.

Usage: python3 scripts/sfxlib.py   (generates only the sounds that are missing)

Writes public/sfx/lib/<name>.mp3. scripts/sfx.py mixes these into every reel; when a file is missing it
falls back to its built-in synthesized sound. Edit a prompt and delete its file to regenerate it.
Env: ELEVENLABS_API_KEY.
"""
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

API = "https://api.elevenlabs.io/v1/sound-generation"
LIB = Path("public/sfx/lib")

# Newsroom / broadsheet palette: paper, print, stamps, a market bell. Short and dry so they sit under a voice.
SOUNDS = {
    "sting": ("Short punchy news broadcast sting, deep orchestral hit with a bright bell, 1 second, no voice", 1.5),
    "whoosh": ("Fast paper sheet swipe whoosh, crisp newspaper page flip, close up, dry", 0.6),
    "rip": ("Newspaper being torn quickly, one sharp paper rip, close up, dry", 0.8),
    "stamp": ("Heavy rubber stamp slammed on paper on a wooden desk, single thud", 0.6),
    "impact": ("Deep cinematic boom hit with a short tail, punchy, for a big number reveal", 1.2),
    "tick": ("Single mechanical typewriter key strike, dry, close", 0.3),
    "click": ("Single soft camera shutter click, dry", 0.3),
    "fall": ("Descending tension tone, falling pitch synth, ominous, 1.5 seconds", 1.6),
    "bell": ("Stock exchange closing bell, one clear ring", 1.5),
    "bed": ("Minimal tense news underscore loop, soft pulsing low synth and light ticking clock, 120 bpm, no melody, no voice", 10.0),
}


def generate(name, prompt, seconds, key):
    body = json.dumps({"text": prompt, "duration_seconds": seconds, "prompt_influence": 0.6}).encode()
    req = urllib.request.Request(API, data=body, method="POST",
                                 headers={"xi-api-key": key, "Content-Type": "application/json", "Accept": "audio/mpeg"})
    try:
        with urllib.request.urlopen(req, timeout=180) as r:
            (LIB / f"{name}.mp3").write_bytes(r.read())
            print(f"  made {name}.mp3")
    except urllib.error.HTTPError as err:
        print(f"  {name}: ElevenLabs refused ({err.code}): {err.read().decode(errors='replace')[:200]}")
        return False
    return True


def main():
    key = os.environ.get("ELEVENLABS_API_KEY", "").strip()
    if not key:
        sys.exit("ELEVENLABS_API_KEY is not set.")
    LIB.mkdir(parents=True, exist_ok=True)
    missing = {n: v for n, v in SOUNDS.items() if not (LIB / f"{n}.mp3").exists()}
    print(f"sfx library: {len(SOUNDS) - len(missing)} present, {len(missing)} to make")
    ok = all(generate(n, p, s, key) for n, (p, s) in missing.items())
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
