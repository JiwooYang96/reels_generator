"""Illustrations for reels: colored-pencil and ink drawings on torn paper, made by FLUX.1 [schnell] (Apache-2.0)
on Cloudflare Workers AI's free daily allowance.

Usage:
  python3 scripts/illustrate.py plan plans/<id>.json   # draw every `illustration` scene's subject
  python3 scripts/illustrate.py test <outdir>          # three sample subjects, for judging the style

Needs CF_ACCOUNT_ID and CF_API_TOKEN (GitHub secrets). Without them it does nothing and the scene falls back to
its caption on paper. Images are cached by prompt in public/illustrations/<hash>.jpg, so a re-render never asks
twice.

Rules (enforced here and in the plan check): subjects are things, places and scenes. No real people, no faces,
no company logos (logos come only from public/logos), no text in the image. Portraits are made by the user and
dropped in as files.
"""
import base64
import hashlib
import json
import os
import re
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / "public/illustrations"
MODEL = "@cf/black-forest-labs/flux-1-schnell"

STYLE = ("Hand-drawn editorial newspaper illustration of {subject}. Colored pencil with black ink cross-hatching, "
         "visible pencil strokes, warm cream paper grain, muted palette of ink black, {accent} and warm sepia. "
         "Single subject, centered, isolated on a plain off-white background with generous margins. "
         "No text, no letters, no numbers, no logos, no people, no faces.")
ACCENTS = {"red": "faded oxblood red", "gold": "mustard gold", "teal": "faded teal", "blue": "faded navy blue",
           "green": "sage green", "violet": "dusty violet"}

BANNED = re.compile(r"\b(portrait|face|faces|selfie|person|people|man|woman|ceo|founder|logo|brand|text|"
                    r"headline|signature|celebrity)\b", re.I)


def problems(subject):
    """Why a subject can't be drawn ([] = fine). Two capitalised words in a row look like a person's name."""
    out = []
    if BANNED.search(subject):
        out.append(f'"{BANNED.search(subject).group(0)}": illustrations show things, places and scenes, not people, logos or text')
    if re.search(r"\b[A-Z][a-z]+ [A-Z][a-z]+\b", subject):
        out.append("looks like a name; describe the object or scene instead (people are only drawn by the user)")
    return out


def prompt(subject, accent="red"):
    return STYLE.format(subject=subject.strip().rstrip("."), accent=ACCENTS.get(accent, accent))


def draw(subject, accent="red", seed=None):
    """Return the cached or freshly drawn JPEG path for a subject."""
    p = prompt(subject, accent)
    key = hashlib.sha1(f"{p}|{seed}".encode()).hexdigest()[:16]
    out = CACHE / f"{key}.jpg"
    if out.exists():
        return out
    acct, token = os.environ.get("CF_ACCOUNT_ID"), os.environ.get("CF_API_TOKEN")
    if not (acct and token):
        print("illustrate: CF_ACCOUNT_ID / CF_API_TOKEN not set; skipping")
        return None
    body = {"prompt": p, "steps": 8}
    if seed is not None:
        body["seed"] = seed
    req = urllib.request.Request(f"https://api.cloudflare.com/client/v4/accounts/{acct}/ai/run/{MODEL}",
                                 data=json.dumps(body).encode(), method="POST",
                                 headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                data = json.load(r)
            img = data.get("result", {}).get("image")
            if not img:
                raise RuntimeError(f"no image in response: {str(data)[:200]}")
            CACHE.mkdir(parents=True, exist_ok=True)
            out.write_bytes(base64.b64decode(img))
            print(f"illustrate: drew {out.name}  ({subject[:60]})")
            return out
        except Exception as err:  # noqa: BLE001
            detail = err.read().decode(errors="replace")[:300] if hasattr(err, "read") else ""
            print(f"illustrate: attempt {attempt + 1} failed: {err} {detail}")
            time.sleep(3 * (attempt + 1))
    return None


def run_plan(path):
    plan = json.load(open(path))
    bad = []
    for i, s in enumerate(plan["scenes"]):
        if s["type"] != "illustration":
            continue
        subj = s["props"]["subject"]
        bad += [f"scene {i + 1}: {p}" for p in problems(subj)]
    if bad:
        print("ILLUSTRATION CHECK:\n  - " + "\n  - ".join(bad))
        sys.exit(1)
    for s in plan["scenes"]:
        if s["type"] == "illustration":
            f = draw(s["props"]["subject"], s["props"].get("accent", "red"), s["props"].get("seed"))
            s["props"]["src"] = f"illustrations/{f.name}" if f else None
    # Hand the resolved image paths to prepare.ts.
    out = ROOT / "out" / plan["id"]
    out.mkdir(parents=True, exist_ok=True)
    srcs = {i: s["props"].get("src") for i, s in enumerate(plan["scenes"]) if s["type"] == "illustration"}
    (out / "illustrations.json").write_text(json.dumps(srcs))


def run_test(outdir):
    Path(outdir).mkdir(parents=True, exist_ok=True)
    tests = [
        ("an empty leather executive chair pushed back from a wooden desk in a dark boardroom", "red"),
        ("a 1920s brass stock ticker machine spilling a long curl of paper tape onto a floor", "gold"),
        ("a silicon computer chip wafer cracked down the middle, with a falling red arrow beside it", "teal"),
    ]
    for n, (subj, acc) in enumerate(tests, 1):
        f = draw(subj, acc, seed=n)
        if f:
            (Path(outdir) / f"test-{n}.jpg").write_bytes(f.read_bytes())


if __name__ == "__main__":
    if sys.argv[1] == "plan":
        run_plan(sys.argv[2])
    elif sys.argv[1] == "test":
        run_test(sys.argv[2])
