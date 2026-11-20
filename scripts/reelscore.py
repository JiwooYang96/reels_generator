"""Reel score: a reel is approved only when its hook AND its script both score 85+ out of 100.

Usage: python3 scripts/reelscore.py plans/<id>.json [--min 85]   (make.sh runs it; exit 1 = not approved)

HOOK (0-100): the spoken hook (scene 1 `voice`) scored by hookscore.py from the ig-reel skill
  (.claude/skills/ig-reel, MIT): length, concrete markers, stakes, payload up front, a viewer to aim at.

SCRIPT (0-100): the retention rules of the hook/script skills, checked on the plan. The spine is the 8 blocks:
hook -> lead -> body 1 -> open loop 1 -> body 2 -> open loop 2 -> body 3 -> CTA (save card).
  15  on-screen hook     3-6 words with a number, compressed, not the spoken line   (viral-instagram-reels: reels-hook)
  10  lead               scene 2 adds a second hard number (a $, %, x or big figure, not just a year) that the
                         hook didn't show: a second mark of value straight after the hook, not set-up
  10  open loop 1        scene 2, 3 or 4 opens with a turn: But / Not / Turns out...   (hooksmith rehook)
  10  open loop 2        a second turn (or a `chapters` progress card) in the back half of the story
  15  pace               voice about 3+ words/s, every scene <= 3.5 s before the end card
                         (pattern reset every 2-4 s: viral-short-form retention)
   5  but/therefore      no beat opens with "And then", "Also", "Next", "So basically"
  10  payoff loop        the last story scene echoes the hook's number or subject   (open loop closed)
  10  numbers            70% of story scenes show a number
  10  length             24-36 s (narrated)
   5  one ask            the only CTA is the end card (no "follow", "comment", "link" earlier)
"""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / ".claude/skills/ig-reel"))
from hookscore import run  # noqa: E402

OPEN_MAX = 1.6   # first shot: winners cut to a new visual by ~0.5-1.5 s (HOOKS.md); one still for 2.5+ s bores
STAKE_MAX = 2.0  # the hook's second shot (scene 2 with "hook": true)


def hook_scenes(sc):
    """The hook is scene 1, or scenes 1-2 when scene 2 is its stake shot ("hook": true)."""
    return 2 if len(sc) > 1 and sc[1].get("hook") else 1


def hook_text(sc):
    return " ".join(s.get("voice", "") for s in sc[:hook_scenes(sc)]).strip()
HARD = []       # rules a high score can't buy back (the reel is refused whatever the total)
REHOOK = re.compile(r"^\s*(but|not|turns out|here'?s|the catch|except|instead|yet|and it wasn'?t|only|then it|that'?s when|that'?s where|it gets|wait|until|what happened next|the strange part|the twist)\b", re.I)
# A "hard" number: money, percent, multiples, scale words, or a figure that isn't just a year.
NUM = re.compile(r"([$€£¥]?)(\d[\d,]*(?:\.\d+)?)\s?(%|x\b|k\b|m\b|b\b|t\b|bn\b|million\b|billion\b|trillion\b|thousand\b)?", re.I)
SCALE = {"k": "k", "thousand": "k", "m": "m", "million": "m", "b": "b", "bn": "b", "billion": "b", "t": "t", "trillion": "t"}
FILLER = re.compile(r"^\s*(and then|also|so basically|basically|anyway)\b", re.I)
ASK = re.compile(r"\b(follow|comment|link in bio|subscribe|sign up|newsletter)\b", re.I)
WPS = 3.2  # Kokoro at speed 1.38 (1.28 measured 3.0 words per second; scaled)


def words(s):
    return re.findall(r"[A-Za-z0-9$%'’.-]+", s or "")


def caption(scene):
    return " ".join(w["t"] for w in scene.get("caption", []))


def hard_numbers(text):
    out = set()
    for cur, n, suf in NUM.findall(text or ""):
        suf = (suf or "").lower()
        digits = n.replace(",", "")
        year = re.fullmatch(r"(19|20)\d\d", digits) and not cur and not suf
        if cur or suf or (len(digits.split(".")[0]) >= 3 and not year):
            out.add(f"{cur}{digits}{SCALE.get(suf, suf)}")
    return out


def scene_text(s):
    return " ".join([s.get("voice", ""), caption(s), json.dumps(s.get("props", {}))])


def blocks(plan):
    """The 8-block check: is there a lead, and where are the open loops? (Also recorded in reel meta.)"""
    sc = plan["scenes"]
    story = [s for s in sc if s["type"] != "endCard"]
    nh = hook_scenes(sc)
    hook_nums = hard_numbers(" ".join(s.get("voice", "") + " " + caption(s) for s in sc[:nh]))
    lead_nums = hard_numbers(scene_text(story[nh])) - hook_nums if len(story) > nh else set()
    loops = [i for i, s in enumerate(story[nh:-1], start=nh)
             if REHOOK.search(s.get("voice", "")) or s["type"] == "chapters"]
    early = [i for i in loops if i <= nh + 2]
    late = [i for i in loops if i >= len(story) / 2 and i not in early[:1]]
    end = sc[-1] if sc[-1]["type"] == "endCard" else None
    return {"lead": bool(lead_nums), "leadNumbers": sorted(lead_nums), "loops": [i + 1 for i in loops],
            "loop1": bool(early), "loop2": bool(late),
            "saveCard": bool(end and end.get("props", {}).get("variant") == "save")}


def script_score(plan):
    sc = plan["scenes"]
    story = [s for s in sc if s["type"] != "endCard"]
    hook = hook_text(sc)
    pts, notes = 0, []

    def award(n, ok, why):
        nonlocal pts
        pts += n if ok else 0
        notes.append(f"  {'+' if ok else '-'}{n:>3}  {why}")

    cap = caption(sc[0])
    cw = words(cap)
    award(15, 3 <= len(cw) <= 6 and bool(re.search(r"\d", cap)) and cap.lower().strip(" .") not in hook.lower(),
          f"on-screen hook \"{cap}\" ({len(cw)} words; want 3-6 with a number, not the spoken line)")
    b = blocks(plan)
    award(10, b["lead"], "lead: the scene after the hook adds a new hard number" + (f" ({', '.join(b['leadNumbers'][:3])})" if b["lead"]
          else " (none: make scene 2 a second surprising $/%/x figure, not set-up)"))
    award(10, b["loop1"], "open loop 1: one of the 3 scenes after the hook opens with a turn (But / Not / Turns out...)")
    award(10, b["loop2"], "open loop 2: a second turn in the back half" + (f" (turns at scenes {b['loops']})" if b["loops"] else ""))

    # Pace: the real narration when it exists (out/<id>/vo.json, after voice.py), else the estimate; each scene
    # lasts its line + 0.25 s, as prepare.ts sets it.
    vo = Path("out") / plan["id"] / "vo.json"
    real = {v["i"]: v["dur"] for v in json.load(open(vo))} if vo.exists() else {}
    nh = hook_scenes(sc)
    lens = [max(1.2 if i < nh else 1.8, real.get(i, len(words(s.get("voice"))) / WPS) + 0.25) for i, s in enumerate(story)]
    nh = hook_scenes(sc)
    caps = [OPEN_MAX if i == 0 else STAKE_MAX if (i == 1 and nh == 2) else 3.5 for i in range(len(lens))]
    slow = [i + 1 for i, d in enumerate(lens) if d > caps[i] + 0.03]  # rounding slack
    award(15, not slow, ("narrated" if real else "estimated") + f" first shot <= {OPEN_MAX} s, stake shot <= {STAKE_MAX} s, beats <= 3.5 s" + (f" (too long: scenes {slow})" if slow else ""))
    if slow:
        HARD.append(f"scenes {slow} run too long ({', '.join(f'{lens[i - 1]:.1f}s' for i in slow)}): the first shot is a "
                    f"{OPEN_MAX} s punch (max 4 words), the stake shot (scene 2, \"hook\": true) {STAKE_MAX} s (max 5), every "
                    "other beat 3.5 s (max 9). Cut words or split the beat.")
    lazy = [i + 1 for i, s in enumerate(sc) if FILLER.search(s.get("voice", ""))]
    award(5, not lazy, "beats joined by but/therefore, not \"and then\"" + (f" (scenes {lazy})" if lazy else ""))

    key = {w.lower().strip(".,") for w in words(hook) if re.search(r"\d|^[A-Z]", w) and len(w) > 1} | \
          {w.lower().strip(".,") for w in words(cap) if re.search(r"\d", w)}
    key -= {"if", "your", "you", "not", "the", "a", "but"}
    last = (story[-1].get("voice", "") + " " + caption(story[-1])).lower()
    award(10, any(k and k in last for k in key), f"last story scene closes the loop (echoes one of {sorted(key)[:6]})")

    with_num = sum(bool(re.search(r"\d", caption(s) + json.dumps(s.get("props", {})))) for s in story[1:])
    award(10, with_num >= 0.7 * max(1, len(story) - 1), f"{with_num}/{len(story) - 1} story scenes show a number")

    total = sum(lens) + sum(s.get("seconds", 6) for s in sc if s["type"] == "endCard")
    award(10, 24 <= total <= 36, f"length about {total:.0f} s (want 24-36; quicker narration since Nov 20)")
    asks = [i + 1 for i, s in enumerate(story) if ASK.search(s.get("voice", "") + " " + caption(s))]
    award(5, not asks, "one ask, on the end card" + (f" (also in scenes {asks})" if asks else ""))
    return pts, notes, total


def learned(plan):
    """What our own reels taught us (data/learnings.json, scripts/reelanalyze.py): a warning, not a gate."""
    f = Path(__file__).resolve().parent.parent / "data/learnings.json"
    if not f.exists():
        return
    rules = json.loads(f.read_text()).get("rules", {})
    fam = (plan.get("hookFamily") or "").lower()
    mine = {"hook family": fam, "opening": plan["scenes"][0]["type"], "music": plan.get("music", "tense"),
            "structure": (plan.get("structure") or "").split(" (")[0]}
    for a in rules.get("avoid", []):
        v = mine.get(a["feature"], "")
        if v and str(a["value"]).lower() in v.lower():
            print(f"LEARNED: our data says avoid this ({a['text']}). Pick another unless this is an A/B test.")
    for d in rules.get("doMore", []):
        v = mine.get(d["feature"], "")
        if v and str(d["value"]).lower() in v.lower():
            print(f"LEARNED: matches what works ({d['text']}).")


def main(path, floor=85):
    plan = json.load(open(path))
    hook = hook_text(plan["scenes"]) or None
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
    learned(plan)
    for hard in HARD:
        print(f"HARD RULE: {hard}")
    ok = h >= floor and s >= floor and not flags and not HARD
    print(f"{'APPROVED' if ok else 'NOT APPROVED'}: hook {h:.0f}, script {s:.0f} (both need {floor}+)" +
          (" and the hard rules above" if HARD else ""))
    if not ok:
        sys.exit(1)


if __name__ == "__main__":
    args = sys.argv[1:]
    floor = float(args[args.index("--min") + 1]) if "--min" in args else 85
    main(args[0], floor)
