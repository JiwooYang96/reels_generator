"""What a reel was made of, saved with it when it is queued, so the performance analyser can learn from it.

Usage: python3 scripts/reelmeta.py plans/<id>.json            # prints the JSON
       (render-reel.yml stores it as "meta" in FiveBeforeMonday reels/<date>.json)

Fields: plan, id, kind (daily / special), title, structure, hookFamily, music, opening (first scene type),
hookVoice, hookCaption, hookScore, scriptScore, scenes (types), illustrations, portrait, endCard variant,
seconds, timeline (each scene's from/to in seconds; "narrated" after a render, else "planned"), ab, trial.
"""
import contextlib
import io
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
import reelscore  # noqa: E402
import variety  # noqa: E402


def meta(path):
    plan = json.loads(Path(path).read_text())
    sc = plan["scenes"]
    hook = sc[0].get("voice", "")
    hook_score = script = None
    if hook:
        with contextlib.redirect_stdout(io.StringIO()):
            _, hook_score, _, _ = reelscore.run(hook)
            script, _, _ = reelscore.script_score(plan)
    tl_path = ROOT / "out" / plan["id"] / "timeline.json"
    if tl_path.exists():
        timeline, timing = json.loads(tl_path.read_text()), "narrated"
    else:
        t, timeline = 0.0, []
        for i, s in enumerate(sc):
            d = float(s.get("seconds", 3))
            timeline.append({"i": i, "type": s["type"], "from": round(t, 2), "to": round(t + d, 2),
                             "voice": s.get("voice", ""), "caption": reelscore.caption(s)})
            t += d
        timing = "planned"
    end = next((s for s in sc if s["type"] == "endCard"), None)
    family = (plan.get("hookFamily") or "").lower()
    return {
        "plan": str(Path(path).as_posix()),
        "id": plan["id"],
        "kind": "special" if "special" in plan["id"] else "daily",
        "title": plan.get("title", ""),
        "structure": plan.get("structure", ""),
        "hookFamily": family,
        "hookFamilyMain": re.split(r"[ /+(]", family.strip())[0] if family else "",
        "music": plan.get("music", "tense"),
        "opening": sc[0]["type"],
        "hookVoice": hook,
        "hookCaption": reelscore.caption(sc[0]),
        "hookScore": hook_score,
        "scriptScore": script,
        "scenes": [s["type"] for s in sc],
        "illustrations": sum(s["type"] in ("illustration", "open.illustration") for s in sc),
        "portrait": any((s.get("props") or {}).get("file", "").startswith("portraits/") for s in sc),
        "endCard": (end or {}).get("props", {}).get("variant", "free") if end else None,
        "seconds": timeline[-1]["to"] if timeline else None,
        "timing": timing,
        "timeline": timeline,
        "narrator": ((ROOT / "out" / plan["id"] / "narrator.txt").read_text().strip()
                     if (ROOT / "out" / plan["id"] / "narrator.txt").exists() else variety.narrator(plan)),
        "drawingStyle": next((s["props"].get("style") for s in sc if s["type"] in ("illustration", "open.illustration")
                              and s["props"].get("style")), variety.drawing_style(plan)),
        "openingLayout": sc[0]["props"].get("layout") or (variety.opening_layout(plan) if sc[0]["type"] == "open.illustration" else None),
        "firstFrameFix": True,
        "ab": plan.get("ab"),
        "trial": (plan.get("post") or {}).get("trial"),
    }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    print(json.dumps(meta(sys.argv[1]), indent=1, ensure_ascii=False))
