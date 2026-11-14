"""Reel score: a reel is approved only when its hook AND its script both score 85+ out of 100.

Usage: python3 scripts/reelscore.py plans/<id>.json [--min 85]   (make.sh runs it; exit 1 = not approved)

HOOK (0-100): the spoken hook (scene 1 `voice`) scored by hookscore.py from the ig-reel skill
  (.claude/skills/ig-reel, MIT): length, concrete markers, stakes, payload up front, a viewer to aim at.

SCRIPT (0-100): the retention rules of the hook/script skills, checked on the plan:
  15  on-screen hook     3-6 words with a number, compressed, not the spoken line   (viral-instagram-reels: reels-hook)
  15  rehook             scene 2 or 3 opens with a turn: But / Not / Turns out...   (hooksmith rehook, viral-short-form)
  20  pace               voice about 3+ words/s, every scene <= 3.5 s before the end card
                         (pattern reset every 2-4 s: viral-short-form retention)
  10  but/therefore      no beat opens with "And then", "Also", "Next", "So basically"
  10  payoff loop        the last story scene echoes the hook's number or subject   (open loop closed)
  10  numbers            70% of story scenes show a number
  10  length             30-40 s planned
  10  one ask            the only CTA is the end card (no "follow", "comment", "link" earlier)
"""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / ".claude/skills/ig-reel"))
from hookscore import run  # noqa: E402

REHOOK = re.compile(r"^\s*(but|not|turns out|here'?s|the catch|except|instead|yet|and it wasn'?t|only)\b", re.I)
FILLER = re.compile(r"^\s*(and then|also|next|so basically|basically|now)\b", re.I)
ASK = re.compile(r"\b(follow|comment|link in bio|subscribe|sign up|newsletter)\b", re.I)
WPS = 3.3  # Kokoro af_heart at speed 1.22 reads about 3.3 words per second


def words(s):
    return re.findall(r"[A-Za-z0-9$%'’.-]+", s or "")


def caption(scene):
    return " ".join(w["t"] for w in scene.get("caption", []))


def script_score(plan):
    sc = plan["scenes"]
    story = [s for s in sc if s["type"] != "endCard"]
    hook = sc[0].get("voice", "")
    pts, notes = 0, []

    def award(n, ok, why):
        nonlocal pts
        pts += n if ok else 0
        notes.append(f"  {'+' if ok else '-'}{n:>3}  {why}")

    cap = caption(sc[0])
    cw = words(cap)
    award(15, 3 <= len(cw) <= 6 and bool(re.search(r"\d", cap)) and cap.lower().strip(" .") not in hook.lower(),
          f"on-screen hook \"{cap}\" ({len(cw)} words; want 3-6 with a number, not the spoken line)")
    award(15, any(REHOOK.search(s.get("voice", "")) for s in sc[1:3]), "rehook in scene 2 or 3 (But / Not / Turns out...)")

    # Pace: the scene lengths the voice will give them (line / WPS + 0.25 s), as prepare.ts sets them.
    lens = [max(1.8, len(words(s.get("voice"))) / WPS + 0.25) for s in story]
    slow = [i + 1 for i, d in enumerate(lens) if d > 3.5]
    award(20, not slow, "every story scene <= 3.5 s" + (f" (too long: scenes {slow})" if slow else ""))
    lazy = [i + 1 for i, s in enumerate(sc) if FILLER.search(s.get("voice", ""))]
    award(10, not lazy, "beats joined by but/therefore, not \"and then\"" + (f" (scenes {lazy})" if lazy else ""))

    key = {w.lower().strip(".,") for w in words(hook) if re.search(r"\d|^[A-Z]", w) and len(w) > 1} | \
          {w.lower().strip(".,") for w in words(cap) if re.search(r"\d", w)}
    key -= {"if", "your", "you", "not", "the", "a", "but"}
    last = (story[-1].get("voice", "") + " " + caption(story[-1])).lower()
    award(10, any(k and k in last for k in key), f"last story scene closes the loop (echoes one of {sorted(key)[:6]})")

    with_num = sum(bool(re.search(r"\d", caption(s) + json.dumps(s.get("props", {})))) for s in story[1:])
    award(10, with_num >= 0.7 * max(1, len(story) - 1), f"{with_num}/{len(story) - 1} story scenes show a number")

    total = sum(lens) + sum(s.get("seconds", 6) for s in sc if s["type"] == "endCard")
    award(10, 30 <= total <= 40, f"length about {total:.0f} s (want 30-40)")
    asks = [i + 1 for i, s in enumerate(story) if ASK.search(s.get("voice", "") + " " + caption(s))]
    award(10, not asks, "one ask, on the end card" + (f" (also in scenes {asks})" if asks else ""))
    return pts, notes, total


def main(path, floor=85):
    plan = json.load(open(path))
    hook = plan["scenes"][0].get("voice")
    if not hook:
        print("reel score: silent plan, skipped")
        return
    results, h, verdict, flags = run(hook)
    weakest = min(results, key=lambda k: results[k][0])
    s, notes, total = script_score(plan)
    print(f"HOOK   {h:5.1f}  \"{hook}\"  (weakest {weakest}: {results[weakest][1]})")
    for f in flags:
        print(f"         flag: {f}")
    print(f"SCRIPT {s:5.1f}")
    print("\n".join(notes))
    ok = h >= floor and s >= floor and not flags
    print(f"{'APPROVED' if ok else 'NOT APPROVED'}: hook {h:.0f}, script {s:.0f} (both need {floor}+)")
    if not ok:
        sys.exit(1)


if __name__ == "__main__":
    args = sys.argv[1:]
    floor = float(args[args.index("--min") + 1]) if "--min" in args else 85
    main(args[0], floor)
