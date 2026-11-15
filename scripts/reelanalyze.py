"""Reels performance analyser: grades every posted reel and learns what works for @fivebeforemonday.

Usage:
  python3 scripts/reelanalyze.py [FBM_DIR]     # default ../FiveBeforeMonday or $FBM_DIR
  python3 scripts/reelanalyze.py retention <reel-key> 0:100 1:62 3:48 10:35 20:27 30:20   # from a screenshot

Inputs (FiveBeforeMonday, public):
  reels/<key>.json               posted id + meta (hook, scores, scenes, timeline; render-reel.yml writes it)
  engine/data/reel-stats.json    daily Instagram insights per reel (engine/reelstats.py)
  data/retention/<key>.json      (this repo) points read off the app's retention graph screenshots
Outputs (this repo):
  data/learnings.json   machine-readable: grades, diagnoses, patterns, A/B results, rules (reelscore.py reads it)
  docs/LEARNINGS.md     what the daily task reads before writing a reel
  data/report.json      what the weekly dashboard shows

Method (after the ig-audit skill, MIT): rank by outlier multiple and shares per reach, not raw views;
3-second hold (100 - reels_skip_rate) grades the hook; average watch time / length grades the middle, and the
scene where the average viewer leaves names the weak beat. A finding is only stated with its sample size and
confidence; with fewer than 8 settled reels nothing becomes a rule.
"""
import json
import os
import statistics
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RET = ROOT / "data" / "retention"
SETTLE_H = 48          # insights lag up to 48 h
MIN_RULES = 8          # settled reels before any pattern becomes a rule
WEIGHTS = {"hold3": 0.30, "watchPct": 0.30, "shareRate": 0.20, "saveRate": 0.10, "outlier": 0.10}


def num(x):
    try:
        return float(x)
    except (TypeError, ValueError):
        return None


def pct_rank(values, v):
    vals = [x for x in values if x is not None]
    if v is None or len(vals) < 2:
        return None
    below, same = sum(x < v for x in vals), sum(x == v for x in vals)
    return 100.0 * (below + 0.5 * (same - 1)) / (len(vals) - 1)   # 0 = worst, 100 = best, ties share


def scene_at(timeline, t):
    for s in timeline or []:
        if s["from"] <= t < s["to"]:
            return s
    return (timeline or [None])[-1]


def label(s):
    if not s:
        return ""
    words = s.get("voice") or s.get("caption") or ""
    return f"scene {s['i'] + 1} ({s['type']}, {s['from']:.0f}-{s['to']:.0f}s): \"{words[:60]}\""


def retention_info(key, timeline):
    f = RET / f"{key}.json"
    if not f.exists():
        return None
    pts = sorted(json.loads(f.read_text())["points"])
    drops = []
    for (t0, p0), (t1, p1) in zip(pts, pts[1:]):
        if t0 >= 3 and t1 > t0:
            drops.append(((p0 - p1) / (t1 - t0), t0, t1, p0 - p1))
    drops.sort(reverse=True)
    out = {"points": pts, "end": pts[-1][1], "drops": []}
    for rate, t0, t1, lost in drops[:2]:
        if lost >= 4:
            out["drops"].append({"from": t0, "to": t1, "lost": round(lost, 1), "scene": label(scene_at(timeline, (t0 + t1) / 2))})
    return out


def load(fbm):
    stats = json.loads((fbm / "engine/data/reel-stats.json").read_text()) if (fbm / "engine/data/reel-stats.json").exists() else {"reels": {}}
    reels = []
    for f in sorted((fbm / "reels").glob("*.json")):
        q = json.loads(f.read_text())
        if not (q.get("posted") or {}).get("id"):
            continue
        st = stats["reels"].get(f.stem, {})
        if st.get("gone"):
            continue                      # deleted from Instagram
        last = st.get("latest") or {}
        m = q.get("meta") or {}
        L = num(m.get("seconds"))
        views, reach = num(last.get("views")), num(last.get("reach"))
        skip = num(last.get("reels_skip_rate"))
        if skip is not None and skip <= 1:
            skip *= 100
        avg = num(last.get("ig_reels_avg_watch_time"))
        avg_s = avg / 1000 if avg is not None else None
        r = {
            "key": f.stem, "url": q["posted"].get("url"), "postedAt": q["posted"]["at"], "trial": q["posted"].get("trial"),
            "ageH": num(last.get("ageH")), "meta": m,
            "views": views, "reach": reach, "likes": num(last.get("likes")), "comments": num(last.get("comments")),
            "shares": num(last.get("shares")), "saves": num(last.get("saved")), "reposts": num(last.get("reposts")),
            "skip": skip, "hold3": None if skip is None else 100 - skip, "avgWatch": avg_s,
            "watchPct": (100 * avg_s / L) if (avg_s is not None and L) else None,
        }
        r["shareRate"] = 100 * r["shares"] / reach if reach and r["shares"] is not None else None
        r["saveRate"] = 100 * r["saves"] / reach if reach and r["saves"] is not None else None
        r["settled"] = bool(r["ageH"] and r["ageH"] >= SETTLE_H)
        r["leaveAt"] = label(scene_at(m.get("timeline"), avg_s)) if avg_s is not None else ""
        r["retention"] = retention_info(f.stem, m.get("timeline"))
        reels.append(r)
    return reels, stats


def grade(reels):
    pool = [r for r in reels if r["settled"] and r["views"] is not None] or [r for r in reels if r["views"] is not None]
    med = statistics.median([r["views"] for r in pool]) if pool else None
    for r in reels:
        r["outlier"] = (r["views"] / med) if (med and r["views"] is not None) else None
    for r in reels:
        parts = {k: pct_rank([x[k] for x in pool], r[k]) for k in WEIGHTS}
        got = {k: v for k, v in parts.items() if v is not None}
        r["score"] = round(sum(WEIGHTS[k] * v for k, v in got.items()) / sum(WEIGHTS[k] for k in got)) if got else None
        r["grade"] = None if r["score"] is None else "A" if r["score"] >= 75 else "B" if r["score"] >= 55 else "C" if r["score"] >= 40 else "D"
        r["diagnosis"] = diagnose(r, pool)
    return med


def third(pool, k, v, low=True):
    vals = sorted(x[k] for x in pool if x[k] is not None)
    if v is None or len(vals) < 3:
        return False
    if vals[0] == vals[-1]:
        return False                      # everyone is the same (e.g. 0 shares): no best or worst third
    cut = vals[len(vals) // 3] if low else vals[-(len(vals) // 3) - 1]
    return (v <= cut and v < vals[-1]) if low else (v >= cut and v > vals[0])


def diagnose(r, pool):
    if r["views"] is None:
        return "no data yet"
    out = []
    if not r["settled"]:
        out.append("still settling (<48 h)")
    if third(pool, "hold3", r["hold3"]):
        out.append(f"HOOK problem: only {r['hold3']:.0f}% stayed past 3 s. Check the first frame, the cover and line 1.")
    elif third(pool, "watchPct", r["watchPct"]):
        out.append(f"MIDDLE problem: hook held ({r['hold3']:.0f}%) but the average viewer left at {r['avgWatch']:.1f}s, {r['leaveAt']}.")
    if r["retention"] and r["retention"]["drops"]:
        d = r["retention"]["drops"][0]
        out.append(f"Graph: biggest drop {d['from']:.0f}-{d['to']:.0f}s (-{d['lost']} pts) at {d['scene']}.")
    if third(pool, "watchPct", r["watchPct"], low=False) and third(pool, "shareRate", r["shareRate"]):
        out.append("Watched but not shared: the payoff or the reason to send it is weak.")
    if third(pool, "hold3", r["hold3"], low=False) and third(pool, "outlier", r["outlier"]):
        out.append("Held well but low reach: distribution (topic, cover, timing), not the hook.")
    if third(pool, "outlier", r["outlier"], low=False) and third(pool, "shareRate", r["shareRate"], low=False):
        out.append("Winner: high reach and shared.")
    return " ".join(out) or "middle of the pack"


def fam(m):
    f = (m.get("hookFamilyMain") or "").strip()
    return f[:-1] if f.endswith("s") else f or None   # "stakes" and "stake" are one family


FEATURES = {
    "kind": lambda m: m.get("kind"),
    "hook family": lambda m: fam(m),
    "opening": lambda m: m.get("opening"),
    "structure": lambda m: (m.get("structure") or "").split(" (")[0] or None,
    "music": lambda m: m.get("music"),
    "drawings": lambda m: "with drawings" if m.get("illustrations") else "no drawings",
    "length": lambda m: None if not m.get("seconds") else "<25s" if m["seconds"] < 25 else "25-35s" if m["seconds"] <= 35 else ">35s",
}


def patterns(reels):
    pool = [r for r in reels if r["settled"] and r["score"] is not None]
    n = len(pool)
    found = []
    for name, f in FEATURES.items():
        groups = {}
        for r in pool:
            v = f(r["meta"])
            if v:
                groups.setdefault(v, []).append(r)
        if len(groups) < 2:
            continue
        for v, g in groups.items():
            rest = [r for r in pool if r not in g and f(r["meta"])]
            if not rest:
                continue
            a = statistics.mean(r["score"] for r in g)
            b = statistics.mean(r["score"] for r in rest)
            h_a = [r["hold3"] for r in g if r["hold3"] is not None]
            h_b = [r["hold3"] for r in rest if r["hold3"] is not None]
            diff = a - b
            conf = "too early"
            if n >= MIN_RULES and min(len(g), len(rest)) >= 3 and abs(diff) >= 15:
                conf = "high" if min(len(g), len(rest)) >= 5 else "medium"
            found.append({
                "feature": name, "value": v, "n": len(g), "nRest": len(rest), "score": round(a), "scoreRest": round(b),
                "hold3": round(statistics.mean(h_a)) if h_a else None, "hold3Rest": round(statistics.mean(h_b)) if h_b else None,
                "diff": round(diff), "confidence": conf,
            })
    found.sort(key=lambda p: (p["confidence"] == "too early", -abs(p["diff"])))
    return found


def spearman(xs, ys):
    def ranks(v):
        order = sorted(range(len(v)), key=lambda i: v[i])
        r = [0.0] * len(v)
        i = 0
        while i < len(v):
            j = i
            while j + 1 < len(v) and v[order[j + 1]] == v[order[i]]:
                j += 1
            for k in range(i, j + 1):
                r[order[k]] = (i + j) / 2
            i = j + 1
        return r
    rx, ry = ranks(xs), ranks(ys)
    if len(set(rx)) < 2 or len(set(ry)) < 2:
        return None
    mx, my = statistics.mean(rx), statistics.mean(ry)
    num_ = sum((a - mx) * (b - my) for a, b in zip(rx, ry))
    den = (sum((a - mx) ** 2 for a in rx) * sum((b - my) ** 2 for b in ry)) ** 0.5
    return num_ / den if den else None


def calibration(reels):
    pts = [(r["meta"].get("hookScore"), r["hold3"]) for r in reels if r["settled"] and r["hold3"] is not None and r["meta"].get("hookScore") is not None]
    out = {"n": len(pts)}
    if not pts:
        out["note"] = "No scored reels with data yet."
        return out
    scores = [p[0] for p in pts]
    if len(set(scores)) == 1:
        out["note"] = (f"Every scored reel got hook {scores[0]:.0f}, so the hook score can't tell good hooks from bad ones here. "
                       "Judge hooks by real 3-second hold until the rubric is tightened.")
        return out
    rho = spearman(scores, [p[1] for p in pts])
    out["rho"] = None if rho is None else round(rho, 2)
    if len(pts) < MIN_RULES:
        out["note"] = f"Only {len(pts)} reels: too few to judge the hook score."
    elif rho is not None and rho < 0.2:
        out["note"] = f"Hook score barely predicts 3-second hold (rho {rho:.2f}); tighten the rubric toward what held."
    else:
        out["note"] = f"Hook score predicts 3-second hold reasonably (rho {rho:.2f})."
    return out


def ab_results(reels):
    groups = {}
    for r in reels:
        ab = r["meta"].get("ab")
        if ab:
            groups.setdefault(ab["group"], []).append(r)
    out = []
    for g, rs in groups.items():
        if len(rs) < 2 or any(r["hold3"] is None for r in rs):
            out.append({"group": g, "status": "waiting for data", "variants": [r["key"] for r in rs]})
            continue
        rs = sorted(rs, key=lambda r: (r["hold3"], r["watchPct"] or 0), reverse=True)
        w, l = rs[0], rs[-1]
        margin = w["hold3"] - l["hold3"]
        out.append({
            "group": g, "testing": w["meta"]["ab"].get("testing", "hook"), "settled": all(r["settled"] for r in rs),
            "winner": w["key"], "winnerHook": w["meta"].get("hookVoice"), "winnerFamily": fam(w["meta"]),
            "loser": l["key"], "loserHook": l["meta"].get("hookVoice"), "loserFamily": fam(l["meta"]),
            "hold3": [round(w["hold3"]), round(l["hold3"])], "margin": round(margin, 1),
            "clear": margin >= 5,
        })
    return out


def rules(pats, abs_, reels, calib):
    settled = sum(r["settled"] for r in reels)
    do, avoid, notes = [], [], []
    for p in pats:
        if p["confidence"] == "too early":
            continue
        txt = (f"{p['feature']} = {p['value']}: score {p['score']} vs {p['scoreRest']} for the rest, 3-s hold {p['hold3']}% vs "
               f"{p['hold3Rest']}% (n={p['n']} vs {p['nRest']}, {p['confidence']} confidence)")
        (do if p["diff"] > 0 else avoid).append({"feature": p["feature"], "value": p["value"], "text": txt, "confidence": p["confidence"]})
    wins = {}
    for a in abs_:
        if a.get("clear") and a.get("settled"):
            wins.setdefault(a["winnerFamily"], 0)
            wins[a["winnerFamily"]] += 1
            notes.append(f"A/B {a['group']}: \"{a['winnerHook']}\" held {a['hold3'][0]}% vs {a['hold3'][1]}% for \"{a['loserHook']}\".")
    if settled < MIN_RULES:
        notes.insert(0, f"{settled} settled reels so far: patterns become rules at {MIN_RULES}+. Until then, keep rotating.")
    notes.append(calib.get("note", ""))
    tried = {}
    for r in reels:
        f = fam(r["meta"])
        if f:
            tried[f] = tried.get(f, 0) + 1
    under = [f for f in ["number", "stake", "contrarian", "identity", "versus", "callout", "belief"] if tried.get(f, 0) < 2]
    experiments = [f"Hook family '{f}' has fewer than 2 reels; A/B it against the current best." for f in under[:3]]
    return {"doMore": do, "avoid": avoid, "notes": [n for n in notes if n], "experiments": experiments}


def fmt(v, unit="", d=0):
    return "-" if v is None else f"{v:.{d}f}{unit}"


def write(reels, med, pats, abs_, calib, rl, stats):
    now = datetime.now(timezone.utc).isoformat(timespec="minutes")
    ranked = sorted([r for r in reels if r["score"] is not None], key=lambda r: -r["score"])
    slim = [{k: r[k] for k in ("key", "url", "postedAt", "ageH", "settled", "trial", "views", "reach", "likes", "comments", "shares",
                               "saves", "reposts", "skip", "hold3", "avgWatch", "watchPct", "shareRate", "saveRate", "outlier",
                               "score", "grade", "diagnosis", "leaveAt")} | {
                "title": r["meta"].get("title"), "hook": r["meta"].get("hookVoice"), "hookFamily": r["meta"].get("hookFamilyMain"),
                "opening": r["meta"].get("opening"), "kind": r["meta"].get("kind"), "seconds": r["meta"].get("seconds"),
                "hookScore": r["meta"].get("hookScore"), "retention": r["retention"]} for r in reels]
    want = [r["key"] for r in (ranked[:2] + ranked[-2:]) if r["settled"] and not r["retention"]]
    data = {"updated": now, "medianViews": med, "reels": slim, "patterns": pats, "ab": abs_, "calibration": calib,
            "rules": rl, "screenshotsWanted": list(dict.fromkeys(want)), "followers": stats.get("account", [])[-30:]}
    (ROOT / "data").mkdir(exist_ok=True)
    (ROOT / "data/learnings.json").write_text(json.dumps({k: data[k] for k in ("updated", "rules", "patterns", "ab", "calibration")}, indent=1, ensure_ascii=False) + "\n")
    (ROOT / "data/report.json").write_text(json.dumps(data, indent=1, ensure_ascii=False) + "\n")

    L = [f"# What works on @fivebeforemonday", "",
         f"_Updated {now} by `scripts/reelanalyze.py` from Instagram insights. The daily task reads this before writing._", "",
         "## Rules from our own data", ""]
    L += [f"- DO MORE: {d['text']}" for d in rl["doMore"]] or []
    L += [f"- AVOID: {a['text']}" for a in rl["avoid"]] or []
    if not rl["doMore"] and not rl["avoid"]:
        L.append("- None yet (not enough settled reels). Follow HOOKS.md and keep rotating.")
    L += ["", "## Notes", ""] + [f"- {n}" for n in rl["notes"]]
    L += ["", "## Next experiments (A/B as trial reels, see docs/LEARNING.md)", ""] + [f"- {e}" for e in rl["experiments"]]
    L += ["", "## Reels, best first", "", "| Grade | Reel | Views | 3-s hold | Avg watch | Shares/reach | Diagnosis |", "| --- | --- | --- | --- | --- | --- | --- |"]
    for r in ranked:
        L.append(f"| {r['grade']} {r['score']} | [{r['key']}]({r['url']}) | {fmt(r['views'])} | {fmt(r['hold3'], '%')} | "
                 f"{fmt(r['avgWatch'], 's', 1)} ({fmt(r['watchPct'], '%')}) | {fmt(r['shareRate'], '%', 1)} | {r['diagnosis']} |")
    pending = [r for r in reels if r["score"] is None]
    if pending:
        L += ["", "No data yet: " + ", ".join(r["key"] for r in pending)]
    (ROOT / "docs/LEARNINGS.md").write_text("\n".join(L) + "\n")
    return data


def add_retention(key, pairs):
    RET.mkdir(parents=True, exist_ok=True)
    pts = [[float(a), float(b)] for a, b in (p.split(":") for p in pairs)]
    (RET / f"{key}.json").write_text(json.dumps({"reel": key, "points": pts,
                                                  "from": f"app screenshot, {datetime.now(timezone.utc).date()}"}, indent=1) + "\n")
    print(f"saved {len(pts)} points for {key}")


def main(fbm):
    reels, stats = load(fbm)
    med = grade(reels)
    pats = patterns(reels)
    abs_ = ab_results(reels)
    calib = calibration(reels)
    rl = rules(pats, abs_, reels, calib)
    data = write(reels, med, pats, abs_, calib, rl, stats)
    print((ROOT / "docs/LEARNINGS.md").read_text())
    if data["screenshotsWanted"]:
        print("Retention screenshots wanted:", ", ".join(data["screenshotsWanted"]))


if __name__ == "__main__":
    a = sys.argv[1:]
    if a and a[0] == "retention":
        add_retention(a[1], a[2:])
    else:
        main(Path(a[0] if a else os.environ.get("FBM_DIR", ROOT.parent / "FiveBeforeMonday")))
