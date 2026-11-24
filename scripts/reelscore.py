"""Reel score: a reel is approved only when its hook AND its script both score 85+ out of 100.

Usage: python3 scripts/reelscore.py plans/<id>.json [--min 85]   (make.sh runs it; exit 1 = not approved)

HOOK (0-100): the spoken hook (scene 1 `voice`) scored by hookscore.py from the ig-reel skill
  (.claude/skills/ig-reel, MIT): length, concrete markers, stakes, payload up front. Its ADDRESS check (say "you")
  is left out of the gate since Nov 24: on a news channel it bred fake stakes ("Your fund still got paid.") that
  made the hook mean nothing. A true "you" line is still fine; it just isn't required.

SCRIPT (0-100): STORY FIRST (Nov 24: the user found reels "meaningless": a run of numbers glued with forced
"But... / Therefore... / The strangest part:" turns). A viewer must be able to retell the reel in one sentence.
  15  on-screen hook     3-6 words with a number, compressed, not the spoken line   (viral-instagram-reels: reels-hook)
   5  story sentence     the plan's "story": one plain sentence (12-35 words) with what happened and why
  10  lead               a scene right after the hook adds a second hard number the hook didn't show
  10  the why, early     one of the first 3 scenes after the hook gives the cause (because / after / as / why ...)
  10  numbers explained  80% of narrated numbers come with what they mean (vs, since, record, from, of, under...)
   5  one real turn      somewhere after the hook a line opens with a turn (But / Yet / Still...) or a chapters card
  15  pace               every scene within its cap (first shot 1.6 s, stake 2.0 s, beats 4.2 s)
   5  no filler          no beat opens with "And then", "Also", "Therefore", "The strangest part", "But the twist"
  10  payoff loop        the last story scene echoes the hook's number or subject
   5  numbers            at least half of the story scenes show a number (not every one: explanation beats need room)
   5  length             24-36 s (narrated)
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
BEAT_MAX = 4.2   # every other story beat: room for a whole cause-and-effect sentence (12 words), one idea per scene


def hook_scenes(sc):
    """The hook is scene 1, or scenes 1-2 when scene 2 is its stake shot ("hook": true)."""
    return 2 if len(sc) > 1 and sc[1].get("hook") else 1


def hook_text(sc):
    return " ".join(s.get("voice", "") for s in sc[:hook_scenes(sc)]).strip()
HARD = []       # rules a high score can't buy back (the reel is refused whatever the total)
REHOOK = re.compile(r"^\s*(but|still|not|turns out|here'?s|the catch|except|instead|yet|and it wasn'?t|only|then it|that'?s when|that'?s where|it gets|wait|until|what happened next|the strange part|the twist)\b", re.I)
# A "hard" number: money, percent, multiples, scale words, or a figure that isn't just a year.
NUM = re.compile(r"([$€£¥]?)(\d[\d,]*(?:\.\d+)?)\s?(%|x\b|k\b|m\b|b\b|t\b|bn\b|million\b|billion\b|trillion\b|thousand\b)?", re.I)
SCALE = {"k": "k", "thousand": "k", "m": "m", "million": "m", "b": "b", "bn": "b", "billion": "b", "t": "t", "trillion": "t"}
FILLER = re.compile(r"^\s*(and then|also|so basically|basically|anyway|therefore|so therefore|the strangest part|"
                    r"but the strangest part|but the twist|here'?s the twist|plot twist)\b", re.I)
# "Why" language: the cause is said, not only the move.
WHY = re.compile(r"\b(because|after|as|why|due to|thanks to|driven by|on news|when|which (meant|means|sent|cut|lifted))\b", re.I)
# A number "explained": the line says what it's compared to or what it means.
CONTEXT = re.compile(r"\b(than|vs|versus|since|record|ever|biggest|largest|smallest|worst|best|from|of|under|over|above|"
                     r"below|per|a share|in (one|a) day|in \d+|in \w+ (days?|weeks?|months?|years?)|target|times|half|double|first|most|least|only|still|back to|up to)\b", re.I)
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
    story_line = (plan.get("story") or "").strip()
    award(5, 12 <= len(words(story_line)) <= 35, "story sentence: \"story\" retells the reel in one plain sentence (12-35 words)"
          + ("" if story_line else " (missing: write it first, then make every scene serve it)"))
    nh0 = hook_scenes(sc)
    why = [i + 1 for i, s in enumerate(story[nh0:nh0 + 3], start=nh0) if WHY.search(s.get("voice", ""))]
    award(10, bool(why), "the why, early: one of the 3 scenes after the hook says the cause" +
          (f" (scene {why[0]})" if why else " (none: say what caused the move by scene 5, not only the move)"))
    numbered = [s for s in story[nh0:] if hard_numbers(s.get("voice", ""))]
    bare = [sc.index(s) + 1 for s in numbered if not CONTEXT.search(s.get("voice", ""))]
    award(10, not numbered or len(bare) <= 0.2 * len(numbered),
          "numbers explained: each spoken number says what it means (vs, since, record, from, of...)" +
          (f" (bare numbers in scenes {bare})" if bare else ""))
    award(5, bool(b["loops"]), "one real turn after the hook (But / Yet / Still..., or a chapters card)" +
          (f" (scenes {b['loops']})" if b["loops"] else ""))

    # Pace: the real narration when it exists (out/<id>/vo.json, after voice.py), else the estimate; each scene
    # lasts its line + 0.25 s, as prepare.ts sets it.
    vo = Path("out") / plan["id"] / "vo.json"
    real = {v["i"]: v["dur"] for v in json.load(open(vo))} if vo.exists() else {}
    nh = hook_scenes(sc)
    lens = [max(1.2 if i < nh else 1.8, real.get(i, len(words(s.get("voice"))) / WPS) + 0.25) for i, s in enumerate(story)]
    nh = hook_scenes(sc)
    caps = [OPEN_MAX if i == 0 else STAKE_MAX if (i == 1 and nh == 2) else BEAT_MAX for i in range(len(lens))]
    slow = [i + 1 for i, d in enumerate(lens) if d > caps[i] + 0.03]  # rounding slack
    award(15, not slow, ("narrated" if real else "estimated") + f" first shot <= {OPEN_MAX} s, stake shot <= {STAKE_MAX} s, beats <= {BEAT_MAX} s" + (f" (too long: scenes {slow})" if slow else ""))
    if slow:
        HARD.append(f"scenes {slow} run too long ({', '.join(f'{lens[i - 1]:.1f}s' for i in slow)}): the first shot is a "
                    f"{OPEN_MAX} s punch (max 4 words), the stake shot (scene 2, \"hook\": true) {STAKE_MAX} s (max 5), every "
                    f"other beat {BEAT_MAX} s (max 12). Cut words or split the beat.")
    lazy = [i + 1 for i, s in enumerate(sc) if FILLER.search(s.get("voice", ""))]
    award(5, not lazy, "no filler openers (\"And then\", \"Therefore\", \"The strangest part\", \"But the twist\")" + (f" (scenes {lazy})" if lazy else ""))

    key = {w.lower().strip(".,") for w in words(hook) if re.search(r"\d|^[A-Z]", w) and len(w) > 1} | \
          {w.lower().strip(".,") for w in words(cap) if re.search(r"\d", w)}
    key -= {"if", "your", "you", "not", "the", "a", "but"}
    last = (story[-1].get("voice", "") + " " + caption(story[-1])).lower()
    award(10, any(k and k in last for k in key), f"last story scene closes the loop (echoes one of {sorted(key)[:6]})")

    with_num = sum(bool(re.search(r"\d", caption(s) + json.dumps(s.get("props", {})))) for s in story[1:])
    award(5, with_num >= 0.5 * max(1, len(story) - 1), f"{with_num}/{len(story) - 1} story scenes show a number")

    total = sum(lens) + sum(s.get("seconds", 6) for s in sc if s["type"] == "endCard")
    award(5, 24 <= total <= 36, f"length about {total:.0f} s (want 24-36; quicker narration since Nov 20)")
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
    results.pop("ADDRESS", None)
    vals = [v[0] for v in results.values()]
    h = max(0.0, min(100.0, sum(vals) / len(vals) * 0.6 + min(vals) * 0.4 - len(flags) * 15))
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
