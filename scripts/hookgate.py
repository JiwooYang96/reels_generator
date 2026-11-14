"""Hook gate: a reel does not render until its opening holds up.

Usage: python3 scripts/hookgate.py plans/<id>.json   (make.sh runs it; exit 1 = rewrite the hook)

1. The spoken hook (scene 1 `voice`) is scored with hookscore.py from the ig-reel skill (MIT, Jake Schincariol,
   .claude/skills/ig-reel): length, a concrete number or name, stakes, payload up front, a viewer to aim at.
   It needs 60+. The scorer is good at catching weak hooks (AUC 0.83) and poor at ranking two decent ones, so
   it is a floor, not a judge: the hooksmith pass in CLAUDE.md picks between the good ones.
2. The on-screen hook (scene 1 caption) must say something the voice does not repeat word for word: the eye
   reads it before the ear hears the line.
3. A rehook lands between 3 and 10 s: scene 2 or 3 opens a turn ("But", "Not", "Turns out", "Here's",
   "The catch", "Except", "Instead") so the viewer who stayed for the hook gets a second reason to stay.
"""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / ".claude/skills/ig-reel"))
from hookscore import run  # noqa: E402

FLOOR = 60
REHOOK = re.compile(r"^\s*(but|not|turns out|here'?s|the catch|except|instead|yet|and it wasn'?t|only)\b", re.I)


def main(path):
    plan = json.load(open(path))
    scenes = plan["scenes"]
    problems = []
    hook = scenes[0].get("voice")
    if not hook:
        print("hook gate: silent plan, skipped")
        return
    results, overall, verdict, flags = run(hook)
    weakest = min(results, key=lambda k: results[k][0])
    print(f"hook: {overall:.0f} {verdict}  \"{hook}\"  (weakest {weakest}: {results[weakest][1]})")
    if overall < FLOOR:
        problems.append(f"hook scores {overall:.0f} (< {FLOOR}); weakest is {weakest}. Write 3 hook systems with "
                        "hooksmith, score them with .claude/skills/ig-reel/hookscore.py, use the best")
    problems += [f"hook: {f}" for f in flags]
    cap = " ".join(w["t"] for w in scenes[0].get("caption", [])).lower()
    if cap and cap.strip(" .") in hook.lower():
        problems.append("on-screen hook just repeats the spoken line; give the eye a different, shorter hook")
    if not any(REHOOK.search(s.get("voice", "")) for s in scenes[1:3]):
        problems.append('no rehook: scene 2 or 3 should open with a turn ("But...", "Not...", "Turns out...")')
    if problems:
        print("HOOK GATE: " + str(len(problems)) + " problem(s)")
        for p in problems:
            print("  - " + p)
        sys.exit(1)


if __name__ == "__main__":
    main(sys.argv[1])
