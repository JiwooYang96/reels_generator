"""Narration for a plan with ElevenLabs text-to-speech: one clip per scene.

Usage: python3 scripts/voice.py plans/<id>.json

Writes public/vo/<id>/<n>.mp3 and out/<id>/vo.json ([{i, src, dur}]); scripts/prepare.ts then stretches
each scene to fit its line and places the clips. Each scene says its `voice` text, or its caption words.

Env: ELEVENLABS_API_KEY (skips quietly when missing, so local preview renders still work),
     ELEVEN_VOICE_ID (default: Daniel, a steady British newsreader voice), ELEVEN_MODEL.
"""
import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

API = "https://api.elevenlabs.io/v1/text-to-speech/{voice}?output_format=mp3_44100_128"
VOICE = os.environ.get("ELEVEN_VOICE_ID", "onwK4e9ZLuTAKqWW03F9")  # Daniel (premade)
MODEL = os.environ.get("ELEVEN_MODEL", "eleven_multilingual_v2")


def spoken(scene):
    """The line to read: the scene's `voice`, else its caption, cleaned up for speech."""
    text = scene.get("voice") or " ".join(w["t"] for w in scene["caption"])
    text = text.replace("−", "minus ").replace("→", "").replace("·", ",")
    # ALL-CAPS emphasis words read better in normal case ("NVIDIA" -> "Nvidia"), tickers of 4 letters or fewer stay.
    text = re.sub(r"\b([A-Z]{5,})\b", lambda m: m.group(1).capitalize(), text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def tts(text, key):
    body = json.dumps({
        "text": text,
        "model_id": MODEL,
        "voice_settings": {"stability": 0.45, "similarity_boost": 0.8, "style": 0.25, "use_speaker_boost": True},
    }).encode()
    req = urllib.request.Request(API.format(voice=VOICE), data=body, method="POST",
                                 headers={"xi-api-key": key, "Content-Type": "application/json", "Accept": "audio/mpeg"})
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return r.read()
    except urllib.error.HTTPError as err:
        sys.exit(f"ElevenLabs refused the narration ({err.code}): {err.read().decode(errors='replace')[:300]}")


def duration(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
                         capture_output=True, text=True, check=True)
    return round(float(out.stdout.strip()), 3)


def main(plan_path):
    key = os.environ.get("ELEVENLABS_API_KEY", "").strip()
    plan = json.loads(Path(plan_path).read_text())
    vo_json = Path("out") / plan["id"] / "vo.json"
    if not key:
        print("ELEVENLABS_API_KEY not set: no narration (preview render).")
        vo_json.unlink(missing_ok=True)
        return
    out_dir = Path("public/vo") / plan["id"]
    out_dir.mkdir(parents=True, exist_ok=True)
    clips = []
    for i, scene in enumerate(plan["scenes"]):
        text = spoken(scene)
        if not text:
            continue
        path = out_dir / f"{i + 1}.mp3"
        path.write_bytes(tts(text, key))
        clips.append({"i": i, "src": f"vo/{plan['id']}/{i + 1}.mp3", "dur": duration(path)})
        print(f"  scene {i + 1}: {clips[-1]['dur']:.1f}s  {text}")
    vo_json.parent.mkdir(parents=True, exist_ok=True)
    vo_json.write_text(json.dumps(clips, indent=2))
    print(f"narration: {len(clips)} clips, {sum(c['dur'] for c in clips):.1f}s")


if __name__ == "__main__":
    main(sys.argv[1])
