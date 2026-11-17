"""Day-to-day variety, so no two reels in a row look and sound the same (Instagram ranks templated, identical-
looking video down). The pick is deterministic per reel id: the same plan always renders the same way.

  narrator(plan)        Kokoro voice: plan["narrator"], else rotated (VOICE_ROTATION env, else ROTATION below)
  drawing_style(plan)   house drawing style for scenes that leave "style" out
  opening_layout(plan)  "stack" / "flip" for open.illustration when "layout" is left out
  palette(plan)         plan["palette"], else the account's rotation (src/brand.ts ACCOUNTS; prepare.ts matches)
"""
import hashlib
import re
import os

# af_heart is the channel voice (picked by ear); af_bella is Kokoro's next best-graded voice, bf_emma a British
# alternative. Heart keeps the most days so the channel still sounds like itself.
ROTATION = ["af_heart", "af_bella", "af_heart", "bf_emma", "af_heart", "af_bella"]
STYLES = ["pencil", "riso", "pencil", "hatch"]
LAYOUTS = ["stack", "flip"]
PALETTES = {"@5beforemonday": ["terminal", "gold", "editorial", "midnight", "broadsheet"]}  # keep in step with src/brand.ts


def _pick(plan_id, salt, options):
    h = int(hashlib.sha1(f"{salt}:{plan_id}".encode()).hexdigest(), 16)
    return options[h % len(options)]


def narrator(plan):
    if plan.get("narrator"):
        return plan["narrator"]
    fixed = os.environ.get("VOICE_NAME", "").strip()
    rot = [v.strip() for v in os.environ.get("VOICE_ROTATION", "").split(",") if v.strip()] or ROTATION
    if fixed and not os.environ.get("VOICE_ROTATION") and os.environ.get("VOICE_FIXED") == "1":
        return fixed
    return _pick(plan["id"], "voice", rot)


def drawing_style(plan):
    return "riso" if "special" in plan["id"] else _pick(plan["id"], "style", STYLES)


def opening_layout(plan):
    return _pick(plan["id"], "layout", LAYOUTS)


def palette(plan):
    if plan.get("palette"):
        return plan["palette"]
    rot = PALETTES.get(plan.get("handle") or "@fivebeforemonday")
    if not rot:
        return "broadsheet"
    # Round-robin by the date in the id, so each look gets the same number of days (a fair test for the analyser).
    m = re.search(r"(\d{4})-(\d{2})-(\d{2})", plan["id"])
    if m:
        from datetime import date
        return rot[date(*map(int, m.groups())).toordinal() % len(rot)]
    return _pick(plan["id"], "palette", rot)


if __name__ == "__main__":
    import json
    import sys
    p = json.load(open(sys.argv[1]))
    print(json.dumps({"narrator": narrator(p), "style": drawing_style(p), "layout": opening_layout(p), "palette": palette(p)}))
