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

sys.path.insert(0, str(Path(__file__).resolve().parent))

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / "public/illustrations"
MODEL = "@cf/black-forest-labs/flux-1-schnell"
ILLUSTRATED = {"illustration", "open.illustration"}

# Styles found by trial (lab/styles.json, Nov 15): FLUX schnell has no negative prompt, so each style says only
# what we want. Subjects avoid signs, screens and labels (the model invents text on them). `pencil` is the house
# style (closest to the hand-drawn reference, in the brand palette); `riso` is bolder for special editions;
# `hatch` is the newspaper-engraving look.
STYLES = {
    "pencil": "{S}, drawn in colored pencil over loose black ink cross-hatching, palette of deep navy blue, brick red, "
              "mustard yellow and warm cream, visible directional pencil strokes and paper tooth. Magazine editorial "
              "illustration, single subject centered on plain unmarked cream paper.",
    "riso": "{S}, as a risograph print in deep navy blue and brick red ink with small touches of mustard yellow, grainy "
            "halftone texture, slight misregistration, bold simple shapes. Single subject centered on plain unmarked "
            "cream paper.",
    "hatch": "{S}, fine black ink cross-hatching and stippling like a newspaper engraving, hand-tinted with soft washes "
             "of brick red, navy blue and mustard yellow. Single subject centered on plain unmarked cream paper.",
}
STYLE = None  # lab/promptlab.py sets this to try a new template

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


def prompt(subject, style="pencil"):
    if STYLE:
        return STYLE
    s = subject.strip().rstrip(".")
    return STYLES[style].replace("{S}", s[0].upper() + s[1:])


def draw(subject, style="pencil", seed=None):
    """Return the cached or freshly drawn JPEG path for a subject."""
    p = prompt(subject, style)
    key = hashlib.sha1(f"{p}|{seed}".encode()).hexdigest()[:16]
    out = CACHE / f"{key}.jpg"
    if out.exists():
        return out
    # Accounts in order: CF_ACCOUNT_ID/CF_API_TOKEN, then CF_ACCOUNT_ID_2/CF_API_TOKEN_2 when the first is out of
    # its daily free allowance (HTTP 429) or fails.
    accounts = [(os.environ.get(f"CF_ACCOUNT_ID{x}"), os.environ.get(f"CF_API_TOKEN{x}")) for x in ("", "_2")]
    accounts = [a for a in accounts if a[0] and a[1]]
    if not accounts:
        print("illustrate: CF_ACCOUNT_ID / CF_API_TOKEN not set; skipping")
        return None
    # The model takes only prompt and steps (no seed); `seed` just varies the cache key for a fresh draw.
    body = json.dumps({"prompt": p, "steps": 4}).encode()  # schnell is distilled for 4 steps; 8 costs twice the quota
    for n, (acct, token) in enumerate(accounts, 1):
        req = urllib.request.Request(f"https://api.cloudflare.com/client/v4/accounts/{acct}/ai/run/{MODEL}",
                                     data=body, method="POST",
                                     headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
        for attempt in range(2):
            try:
                with urllib.request.urlopen(req, timeout=120) as r:
                    data = json.load(r)
                img = data.get("result", {}).get("image")
                if not img:
                    raise RuntimeError(f"no image in response: {str(data)[:200]}")
                CACHE.mkdir(parents=True, exist_ok=True)
                out.write_bytes(base64.b64decode(img))
                print(f"illustrate: drew {out.name} on account {n}  ({subject[:60]})")
                return out
            except Exception as err:  # noqa: BLE001
                code = getattr(err, "code", None)
                detail = err.read().decode(errors="replace")[:160] if hasattr(err, "read") else ""
                print(f"illustrate: account {n} attempt {attempt + 1} failed: {err} {detail}")
                if code == 429:
                    break  # out of quota on this account: try the next one
                time.sleep(3 * (attempt + 1))
    return None


def run_plan(path):
    plan = json.load(open(path))
    bad = []
    for i, s in enumerate(plan["scenes"]):
        if s["type"] not in ILLUSTRATED:
            continue
        if s["props"].get("file"):
            # User-supplied portrait: must be one of their files in public/portraits; never generated.
            if not (ROOT / "public" / s["props"]["file"]).exists():
                bad.append(f"scene {i + 1}: {s['props']['file']} not found in public/")
            continue
        subj = s["props"]["subject"]
        bad += [f"scene {i + 1}: {p}" for p in problems(subj)]
    if bad:
        print("ILLUSTRATION CHECK:\n  - " + "\n  - ".join(bad))
        sys.exit(1)
    srcs = {}
    for i, s in enumerate(plan["scenes"]):
        if s["type"] not in ILLUSTRATED:
            continue
        if s["props"].get("file"):
            srcs[i] = s["props"]["file"]
            continue
        f = draw(s["props"]["subject"], s["props"].get("style", "pencil"), s["props"].get("seed"))
        if f:
            png = f.with_suffix(".png")
            if not png.exists():
                from tornpaper import torn
                torn(str(f), str(png), seed=int(hashlib.sha1(f.name.encode()).hexdigest()[:6], 16) % 1000)
            srcs[i] = f"illustrations/{png.name}"
    # Hand the torn-paper cutouts to prepare.ts, which puts them in the scenes' props.
    out = ROOT / "out" / plan["id"]
    out.mkdir(parents=True, exist_ok=True)
    (out / "illustrations.json").write_text(json.dumps(srcs))
    want = sum(1 for s in plan["scenes"] if s["type"] in ILLUSTRATED)
    print(f"illustrate: {len(srcs)} of {want} illustration(s) ready")
    if want and len(srcs) < want and os.environ.get("GITHUB_STEP_SUMMARY"):
        with open(os.environ["GITHUB_STEP_SUMMARY"], "a") as fh:
            fh.write(f"Illustrations: {len(srcs)} of {want} drawn (free quota or API error); the rest use the no-drawing fallback.\n")


def run_test(outdir):
    Path(outdir).mkdir(parents=True, exist_ok=True)
    tests = [
        ("an empty leather executive chair pushed back from a wooden desk in a dark boardroom", "red"),
        ("a 1920s brass stock ticker machine on a wooden stand, a long curl of blank paper tape spilling onto the floor", "gold"),
        ("a round silicon wafer covered in tiny square chips, split by a jagged crack across the middle", "teal"),
    ]
    for n, (subj, _) in enumerate(tests, 1):
        f = draw(subj, "pencil", seed=n)
        if f:
            (Path(outdir) / f"test-{n}.jpg").write_bytes(f.read_bytes())


if __name__ == "__main__":
    if sys.argv[1] == "plan":
        run_plan(sys.argv[2])
    elif sys.argv[1] == "test":
        run_test(sys.argv[2])
