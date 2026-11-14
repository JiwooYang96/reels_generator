"""Narration for a plan: one clip per scene, read by an open-source voice model (free, no API key).

Usage: python3 scripts/voice.py plans/<id>.json

Writes public/vo/<id>/<n>.wav and out/<id>/vo.json ([{i, src, dur}]); scripts/prepare.ts then stretches
each scene to fit its line and places the clips. Each scene says its `voice` text, or its caption words.

Engines (the ones VoiceStudio / OmniVoice Studio bundles, run directly so they work headless on GitHub):
  kokoro     (default) Kokoro-82M, Apache-2.0 weights, so it is fine for a paid product. British newsreader
             voice "bm_george" (set VOICE_NAME to change, e.g. bm_lewis, bm_daniel). Fast on a CPU.
  omnivoice  k2-fsa OmniVoice with voice design from VOICE_INSTRUCT. Its official weights are CC-BY-NC
             (non-commercial), so only use it if that licence fits.
  elevenlabs paid API, used only when VOICE_ENGINE=elevenlabs and ELEVENLABS_API_KEY are set.
Set VOICE_ENGINE=none (or leave the engine uninstalled) for a silent preview render.
"""
import json
import os
import re
import subprocess
import sys
import urllib.request
from pathlib import Path

ENGINE = os.environ.get("VOICE_ENGINE", "kokoro").lower()
VOICE_NAME = os.environ.get("VOICE_NAME", "bm_george")
VOICE_SPEED = float(os.environ.get("VOICE_SPEED", "1.12"))  # a brisk newsreader pace
VOICE_INSTRUCT = os.environ.get("VOICE_INSTRUCT", "male, british accent, middle-aged, calm, news presenter")


def spoken(scene):
    """The line to read: the scene's `voice`, else its caption, cleaned up for speech."""
    text = scene.get("voice") or " ".join(w["t"] for w in scene["caption"])
    text = text.replace("−", "minus ").replace("→", "").replace("·", ",").replace("&", "and")
    # ALL-CAPS emphasis words read better in normal case ("NVIDIA" -> "Nvidia"); short tickers stay.
    text = re.sub(r"\b([A-Z]{5,})\b", lambda m: m.group(1).capitalize(), text)
    return re.sub(r"\s+", " ", text).strip()


def write_wav(path, audio, sr):
    import numpy as np
    import soundfile as sf

    audio = np.asarray(audio, dtype="float32").reshape(-1)
    peak = float(np.max(np.abs(audio))) or 1.0
    sf.write(str(path), audio / peak * 0.9, sr)


def kokoro_engine():
    import numpy as np
    from kokoro import KPipeline

    pipe = KPipeline(lang_code="b" if VOICE_NAME.startswith("b") else "a")

    def say(text, path):
        chunks = [np.asarray(audio) for _, _, audio in pipe(text, voice=VOICE_NAME, speed=VOICE_SPEED)]
        write_wav(path, np.concatenate(chunks), 24000)
    return say


def omnivoice_engine():
    import torch
    from omnivoice import OmniVoice

    model = OmniVoice.from_pretrained("k2-fsa/OmniVoice", dtype=torch.float32)

    def say(text, path):
        audio = model.generate(text=text, instruct=VOICE_INSTRUCT)
        write_wav(path, audio[0] if isinstance(audio, (list, tuple)) else audio, 24000)
    return say


def elevenlabs_engine():
    key = os.environ["ELEVENLABS_API_KEY"]
    voice = os.environ.get("ELEVEN_VOICE_ID", "onwK4e9ZLuTAKqWW03F9")

    def say(text, path):
        body = json.dumps({"text": text, "model_id": "eleven_multilingual_v2",
                           "voice_settings": {"stability": 0.5, "similarity_boost": 0.8}}).encode()
        req = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{voice}?output_format=mp3_44100_128",
                                     data=body, method="POST",
                                     headers={"xi-api-key": key, "Content-Type": "application/json"})
        mp3 = path.with_suffix(".mp3")
        with urllib.request.urlopen(req, timeout=120) as r:
            mp3.write_bytes(r.read())
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(mp3), str(path)], check=True)
        mp3.unlink()
    return say


def load_engine():
    if ENGINE in ("", "none", "off"):
        return None
    try:
        return {"kokoro": kokoro_engine, "omnivoice": omnivoice_engine, "elevenlabs": elevenlabs_engine}[ENGINE]()
    except (ImportError, KeyError) as err:
        print(f"Voice engine '{ENGINE}' is not available here ({err}); silent preview.")
        return None


def duration(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
                         capture_output=True, text=True, check=True)
    return round(float(out.stdout.strip()), 3)


def main(plan_path):
    plan = json.loads(Path(plan_path).read_text())
    vo_json = Path("out") / plan["id"] / "vo.json"
    vo_json.parent.mkdir(parents=True, exist_ok=True)
    say = load_engine()
    if say is None:
        vo_json.unlink(missing_ok=True)
        return
    out_dir = Path("public/vo") / plan["id"]
    out_dir.mkdir(parents=True, exist_ok=True)
    clips = []
    for i, scene in enumerate(plan["scenes"]):
        text = spoken(scene)
        if not text:
            continue
        path = out_dir / f"{i + 1}.wav"
        say(text, path)
        clips.append({"i": i, "src": f"vo/{plan['id']}/{i + 1}.wav", "dur": duration(path)})
        print(f"  scene {i + 1}: {clips[-1]['dur']:.1f}s  {text}")
    vo_json.write_text(json.dumps(clips, indent=2))
    print(f"narration ({ENGINE}): {len(clips)} clips, {sum(c['dur'] for c in clips):.1f}s")


if __name__ == "__main__":
    main(sys.argv[1])
