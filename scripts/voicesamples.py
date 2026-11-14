"""Read the same short script with each candidate voice so the user can pick one by ear.

Usage: python3 scripts/voicesamples.py <engine> <outdir>
  engine kokoro: the Kokoro-82M voices below (Apache-2.0)
  engine chatterbox: Resemble AI Chatterbox (MIT), default voice at two expression levels
Writes <outdir>/<engine>-<voice>.wav
"""
import sys
from pathlib import Path

import numpy as np
import soundfile as sf

LINES = [
    "Nvidia just lost a trillion dollars in three weeks.",
    "And it wasn't earnings. Here's what actually happened.",
    "That's one of this week's five numbers. Get all five, free, every Saturday. Link in bio.",
]
KOKORO = ["af_heart", "af_bella", "am_michael", "am_fenrir", "am_puck", "bf_emma", "bm_george"]


def save(path, chunks, sr, gap=0.35):
    pad = np.zeros(int(sr * gap), dtype="float32")
    audio = np.concatenate([np.concatenate([np.asarray(c, dtype="float32").reshape(-1), pad]) for c in chunks])
    sf.write(str(path), audio / (np.max(np.abs(audio)) or 1) * 0.9, sr)
    print("wrote", path)


def main(engine, out):
    out = Path(out)
    out.mkdir(parents=True, exist_ok=True)
    if engine == "kokoro":
        from kokoro import KPipeline
        pipes = {}
        for v in KOKORO:
            lang = "b" if v.startswith("b") else "a"
            pipe = pipes.setdefault(lang, KPipeline(lang_code=lang))
            chunks = [np.concatenate([np.asarray(a) for _, _, a in pipe(t, voice=v, speed=1.1)]) for t in LINES]
            save(out / f"kokoro-{v}.wav", chunks, 24000)
    elif engine == "chatterbox":
        from chatterbox.tts import ChatterboxTTS
        model = ChatterboxTTS.from_pretrained(device="cpu")
        for name, ex, cfg in [("calm", 0.5, 0.5), ("punchy", 0.75, 0.35)]:
            chunks = [model.generate(t, exaggeration=ex, cfg_weight=cfg).squeeze(0).numpy() for t in LINES]
            save(out / f"chatterbox-{name}.wav", chunks, model.sr)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
