"""Weekly competitor hook mining: what is winning right now in stock / finance reels, so our hooks follow real data.

Usage: python3 scripts/hookmine.py                       # needs APIFY_TOKEN; builds hookpack/ for Claude to read
       python3 scripts/hookmine.py apply hookpack/analysis.json   # Claude's reading -> HOOKS.md + data/hookmine
       python3 scripts/hookmine.py --dry                 # no API calls: rebuild HOOKS.md from the last saved run

How the reels get read: GitHub (hookmine.yml) downloads the top reels and saves, per reel, the frames at
0 / 0.5 / 1 / 2 / 3 s as one strip image plus a Whisper transcript of the first 8 s (hookpack/, kept as a
pushed to the private fbm-metrics repo under hookpack/, never to this public repo: it is other creators' work). The Monday "weekly hook analysis"
Claude task looks at every strip and transcript, writes hookpack/analysis.json and runs `apply`. Gemini
(GEMINI_API_KEY + HOOKMINE_GEMINI=1) can still read whole videos as an optional extra.

1. Fetch the last 14 days of reels from niche hashtags (apify/instagram-hashtag-scraper) and from the tracked
   accounts in data/hookmine/accounts.txt (apify/instagram-scraper, via vendor/head-of-content, MIT).
2. Rank by views against each account's own median (the outlier multiple), not raw views.
3. The top videos go to Gemini 2.5 Flash (vendor/head-of-content/analyze_videos.py) with our extra questions:
   what is on screen at frame 0, the on-screen hook text, and the spoken first line.
4. Save data/hookmine/<date>.json and rewrite the "Winning hooks in our niche" section of HOOKS.md, which the
   daily reel task reads. Owners of hashtag outliers join accounts.txt (up to 30) so the tracked list grows.

Cost: Apify free plan credit covers a weekly run (~150 results); Gemini free tier covers ~10 video analyses.
"""
import json
import os
import re
import statistics
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "vendor" / "head-of-content"))
DATA = ROOT / "data" / "hookmine"
ACCOUNTS = DATA / "accounts.txt"
HOOKS = ROOT / "HOOKS.md"
HASHTAGS = ["stockmarket", "stocks", "stocknews", "wallstreet", "nvidia", "stockmarketnews", "stocktrading", "nasdaq"]
DAYS, PER_TAG, PER_ACCOUNT, ANALYSE, PACK = 14, 25, 8, 8, 25
PACKDIR = ROOT / "hookpack"
STRIP_AT = [0, 0.5, 1, 2, 3]
START, END = "<!-- hookmine:start -->", "<!-- hookmine:end -->"

EXTRA = '''

ALSO add these keys to the same JSON object (our channel makes faceless stock-news reels, so we need them):
    "first_frame": "<exactly what is visible at the very first frame, before anything moves: text, picture, number, face, blank?>",
    "onscreen_hook": "<the on-screen text in the first 2 seconds, verbatim, or empty>",
    "spoken_first_line": "<the first spoken sentence verbatim, or empty>",
    "topic": "<company / market event the video is about>",
    "seconds": <video length in seconds>'''


# Hashtags pull in off-topic reels (comedy, film): keep only those whose caption is about stocks or markets.
ON_TOPIC = re.compile(r"\b(stocks?|shares|stock market|nasdaq|s&p|sp500|dow jones|earnings|wall street|ticker|"
                      r"nvidia|nvda|tesla|tsla|aapl|msft|amzn|googl|palantir|pltr|amd|nifty|sensex|"
                      r"market cap|ipo|fed|rate cut|bull market|bear market|sell-?off|day ?trad\w*|options)\b", re.I)


def on_topic(p):
    return bool(ON_TOPIC.search((p.get("caption") or "") + " " + " ".join(p.get("hashtags") or [])))


def views(p):
    return p.get("videoViewCount") or p.get("videoPlayCount") or 0


def apify_tokens():
    return [t for t in (os.environ.get("APIFY_TOKEN"), os.environ.get("APIFY_TOKEN_2")) if t]


def run_actor(actor, run_input):
    """Run an Apify actor, moving to the backup account (APIFY_TOKEN_2) when the first is out of credit."""
    from apify_client import ApifyClient
    last = None
    for i, token in enumerate(apify_tokens()):
        client = ApifyClient(token)
        try:
            run = client.actor(actor).call(run_input=run_input)
            return list(client.dataset(run["defaultDatasetId"]).iterate_items())
        except Exception as err:
            last = err
            msg = str(err).lower()
            if any(w in msg for w in ("usage", "credit", "limit", "402", "403", "quota", "blocked")):
                print(f"apify account {i + 1} unavailable ({str(err)[:80]}); trying the next")
                continue
            raise
    raise RuntimeError(f"every Apify account failed: {str(last)[:160]}")


def fetch():
    items = []
    try:
        got = run_actor("apify/instagram-hashtag-scraper", {"hashtags": HASHTAGS, "resultsType": "reels", "resultsLimit": PER_TAG})
        for g in got:
            g["_source"] = "hashtag"
        items += got
        print(f"hashtags: {len(got)} reels")
    except Exception as err:   # one source failing must not lose the other
        print("hashtags failed:", str(err)[:200])
    accounts = [a.strip().lstrip("@") for a in ACCOUNTS.read_text().split() if a.strip()] if ACCOUNTS.exists() else []
    if accounts and os.environ.get("HOOKMINE_TRACKED") == "1":
        try:
            import fetch_instagram
            got = fetch_instagram.fetch_instagram(accounts, "reels", PER_ACCOUNT, DAYS)
            for g in got:
                g["_source"] = "tracked"
            items += got
        except BaseException as err:  # the vendored script calls sys.exit on missing tokens
            print("tracked accounts failed:", str(err)[:200])
    return items


def rank(items):
    cutoff = datetime.now(timezone.utc) - timedelta(days=DAYS)
    seen, reels = set(), []
    for p in items:
        key = p.get("shortCode") or p.get("id")
        ts = p.get("timestamp")
        if not key or key in seen or not p.get("videoUrl") or not views(p) or not on_topic(p):
            continue
        try:
            if ts and datetime.fromisoformat(ts.replace("Z", "+00:00")) < cutoff:
                continue
        except ValueError:
            pass
        seen.add(key)
        reels.append(p)
    by_owner = {}
    for p in reels:
        by_owner.setdefault((p.get("ownerUsername") or "").lower(), []).append(views(p))
    all_med = statistics.median([views(p) for p in reels]) if reels else 1
    for p in reels:
        own = by_owner.get((p.get("ownerUsername") or "").lower(), [])
        med = statistics.median(own) if len(own) >= 3 else all_med
        p["_multiple"] = round(views(p) / max(med, 1), 2)
    # An outlier is unusual for its own account AND has real reach.
    reels.sort(key=lambda p: (p["_multiple"] * min(1, views(p) / 20000)), reverse=True)
    return reels


def analyse(top):
    import analyze_videos
    # Google retires model names; GEMINI_MODEL overrides the default without touching the vendored script.
    # Google retires and overloads model names: try GEMINI_MODEL, then every other "flash" model the key can use,
    # retrying a busy model (503) after a pause. Gemini can't fetch Instagram's CDN links, so upload directly.
    import signal
    import time
    from google import genai

    def _timeout(*_):
        raise TimeoutError("analysis took too long")
    signal.signal(signal.SIGALRM, _timeout)
    preferred = [m for m in [os.environ.get("GEMINI_MODEL"), "gemini-3.8-flash"] if m]
    try:
        names = [m.name.split("/")[-1] for m in genai.Client(api_key=os.environ["GEMINI_API_KEY"]).models.list()]
        flash = sorted([n for n in names if "flash" in n and "image" not in n and "tts" not in n and "live" not in n], reverse=True)
        print("gemini models available:", ", ".join(flash[:8]))
    except Exception as err:
        flash = []
        print("could not list models:", str(err)[:120])
    models = list(dict.fromkeys(preferred + flash))
    orig_analyse, orig_wait = analyze_videos.analyze_video, analyze_videos.wait_for_processing

    def guarded(client, src, caption):
        if isinstance(src, str):
            raise RuntimeError("upload instead of a link")
        last = None
        for model in models[:4]:
            for attempt in range(2):
                analyze_videos.GEMINI_MODEL = model
                signal.alarm(240)
                try:
                    out = orig_analyse(client, src, caption)
                    print(f"    model {model} ok")
                    return out
                except TimeoutError as err:
                    last = err
                    break                      # slow model: try the next one
                except Exception as err:
                    last = err
                    msg = str(err)
                    if "503" in msg or "UNAVAILABLE" in msg or "429" in msg:
                        time.sleep(20 * (attempt + 1))
                        continue               # busy: retry once, then the next model
                    if "404" in msg or "NOT_FOUND" in msg:
                        break
                    raise
                finally:
                    signal.alarm(0)
        raise RuntimeError(f"all models failed: {str(last)[:160]}")
    analyze_videos.analyze_video = guarded
    analyze_videos.wait_for_processing = lambda client, file, timeout=150: orig_wait(client, file, 150)
    analyze_videos.VIDEO_ANALYSIS_PROMPT = analyze_videos.VIDEO_ANALYSIS_PROMPT.replace(
        "Focus on ACTIONABLE insights", EXTRA.replace("{", "{{").replace("}", "}}") + "\n\nFocus on ACTIONABLE insights")
    return analyze_videos.analyze_videos(top, "instagram", max_videos=ANALYSE)


def build_pack(top):
    """Frames + first-seconds transcript per reel, for Claude to read (no video model needed)."""
    import shutil
    import subprocess
    import requests
    from PIL import Image, ImageDraw
    shutil.rmtree(PACKDIR, ignore_errors=True)
    PACKDIR.mkdir(parents=True)
    whisper = None
    try:
        from faster_whisper import WhisperModel
        whisper = WhisperModel("base", device="cpu", compute_type="int8")
    except Exception as err:
        print("whisper unavailable:", str(err)[:120])
    index = []
    for n, p in enumerate(top, 1):
        tag = f"{n:02d}"
        vid = PACKDIR / f"{tag}.mp4"
        try:
            r = requests.get(p["videoUrl"], timeout=60)
            r.raise_for_status()
            vid.write_bytes(r.content)
            frames = []
            for t in STRIP_AT:
                f = PACKDIR / f"{tag}-{t}.jpg"
                subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(t), "-i", str(vid), "-frames:v", "1",
                                "-vf", "scale=270:-2", str(f)], check=True)
                frames.append(Image.open(f).convert("RGB"))
            h = max(im.height for im in frames)
            strip = Image.new("RGB", (270 * len(frames), h + 34), "white")
            d = ImageDraw.Draw(strip)
            for i, (t, im) in enumerate(zip(STRIP_AT, frames)):
                strip.paste(im, (270 * i, 34))
                d.text((270 * i + 8, 8), f"{t}s", fill="black")
            strip.save(PACKDIR / f"{tag}.jpg", quality=82)
            for t in STRIP_AT:
                (PACKDIR / f"{tag}-{t}.jpg").unlink(missing_ok=True)
            text = ""
            if whisper:
                segs, _ = whisper.transcribe(str(vid), clip_timestamps=[0, 8], vad_filter=False)
                text = " ".join(s.text.strip() for s in segs if s.start < 8).strip()
            dur = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(vid)],
                                 capture_output=True, text=True).stdout.strip()
            index.append({"n": n, "image": f"{tag}.jpg", "url": p.get("url"), "username": p.get("ownerUsername"),
                          "views": views(p), "multiple": p["_multiple"], "seconds": round(float(dur or 0), 1),
                          "caption": (p.get("caption") or "")[:400], "transcript_0_8s": text})
            print(f"  [{n}/{len(top)}] @{p.get('ownerUsername')} {views(p):,} views ({p['_multiple']}x): {text[:70]}")
        except Exception as err:
            print(f"  [{n}/{len(top)}] skipped: {str(err)[:120]}")
        finally:
            vid.unlink(missing_ok=True)
    (PACKDIR / "index.json").write_text(json.dumps(index, indent=1, ensure_ascii=False) + "\n")
    (PACKDIR / "README.md").write_text(
        "# Hook pack\n\nEach NN.jpg is one reel: frames at 0, 0.5, 1, 2 and 3 s. index.json has its views, how far it beat "
        "its account's usual views, caption and the transcript of its first 8 s.\n\nWrite analysis.json as a list of "
        '{"n", "technique", "first_frame", "onscreen_hook", "spoken_first_line", "formula", "why"} '
        "(technique: bold-claim, curiosity-gap, number-shock, question, contrarian, story-tease, direct-address, "
        "relatable-pain, visual-shock, list), then: python3 scripts/hookmine.py apply hookpack/analysis.json\n")
    return index


def apply(path):
    """Claude's reading of the hook pack -> data/hookmine/<date>.json and HOOKS.md."""
    rows = json.loads(Path(path).read_text())
    index = {r["n"]: r for r in json.loads((Path(path).parent / "index.json").read_text())}
    analysed = []
    for a in rows:
        meta = index.get(a.get("n"), {})
        analysed.append({"username": meta.get("username"), "url": meta.get("url"), "views": meta.get("views"),
                         "_multiple": meta.get("multiple"), "seconds": meta.get("seconds"),
                         "analysis": {"hook": {"technique": a.get("technique"), "replicable_formula": a.get("formula")},
                                      "first_frame": a.get("first_frame"), "onscreen_hook": a.get("onscreen_hook"),
                                      "spoken_first_line": a.get("spoken_first_line"), "why_it_works": a.get("why")}})
    date = datetime.now(timezone.utc).date().isoformat()
    runs = sorted(DATA.glob("20*.json"))
    run = json.loads(runs[-1].read_text()) if runs else {}
    run.update({"date": date, "analysed": analysed, "reader": "claude (frames + transcript)", "fetched": run.get("fetched", len(index))})
    DATA.mkdir(parents=True, exist_ok=True)
    (DATA / f"{date}.json").write_text(json.dumps(run, indent=1, ensure_ascii=False) + "\n")
    write_hooks(run)
    print(f"applied {len(analysed)} readings -> HOOKS.md")


def grow_accounts(reels):
    have = [a.strip() for a in ACCOUNTS.read_text().split()] if ACCOUNTS.exists() else []
    for p in reels[:20]:
        u = (p.get("ownerUsername") or "").lower()
        if u and u not in have and u != "fivebeforemonday" and p.get("_source") == "hashtag" and views(p) >= 20000:
            have.append(u)
    ACCOUNTS.write_text("\n".join(have[:30]) + "\n")


def section(run):
    res = [r for r in run.get("analysed", []) if r.get("analysis")]
    lines = [START, "## Winning hooks in our niche (auto, weekly)", "",
             f"_Updated {run['date']} by `scripts/hookmine.py`: the stock/finance reels that beat their own account's "
             f"normal views most in the last {DAYS} days ({run.get('fetched', 0)} reels checked), hooks read by "
             f"{run.get('reader', 'Gemini')}. "
             "Adapt the formulas; never copy a line, a claim or a number._", ""]
    if not res:
        lines += ["No analysed reels yet.", END]
        return "\n".join(lines)
    tech = {}
    ff = []
    for r in res:
        a = r["analysis"]
        t = (a.get("hook") or {}).get("technique") or "?"
        tech[t] = tech.get(t, 0) + 1
        ff.append(a.get("first_frame") or "")
    lines.append("Techniques this week: " + ", ".join(f"{k} x{v}" for k, v in sorted(tech.items(), key=lambda kv: -kv[1])) + ".")
    lines.append("")
    text0 = sum(1 for x in ff if x and re.search(r"text|number|\$|%|headline|caption", x, re.I))
    lines.append(f"Frame 0 already shows text or a number in {text0} of {len(res)}.")
    lines.append("")
    res.sort(key=lambda r: -(r.get("_multiple") or 0))
    for r in res:
        a, h = r["analysis"], r["analysis"].get("hook") or {}
        lines.append(f"- **{h.get('technique', '?')}**, {r.get('views') or 0:,} views ({r.get('_multiple', '?')}x its account), "
                     f"[@{r.get('username')}]({r.get('url')})")
        if a.get("onscreen_hook"):
            lines.append(f"  - On screen: \"{a['onscreen_hook']}\"")
        if a.get("spoken_first_line"):
            lines.append(f"  - Said: \"{a['spoken_first_line']}\"")
        if a.get("first_frame"):
            lines.append(f"  - Frame 0: {a['first_frame']}")
        if h.get("replicable_formula"):
            lines.append(f"  - Formula: {h['replicable_formula']}")
        if a.get("why_it_works"):
            lines.append(f"  - Why: {a['why_it_works']}")
    lines += ["", END]
    return "\n".join(lines)


def write_hooks(run):
    text = HOOKS.read_text()
    block = section(run)
    if START in text:
        text = re.sub(re.escape(START) + r".*?" + re.escape(END), lambda _: block, text, flags=re.S)
    else:
        text = text.rstrip() + "\n\n" + block + "\n"
    HOOKS.write_text(text)


def main(dry=False):
    DATA.mkdir(parents=True, exist_ok=True)
    date = datetime.now(timezone.utc).date().isoformat()
    if dry:
        runs = sorted(DATA.glob("20*.json"))
        run = json.loads(runs[-1].read_text()) if runs else {"date": date, "analysed": []}
        write_hooks(run)
        print(section(run))
        return
    if not apify_tokens():
        sys.exit("APIFY_TOKEN is not set (add it as a GitHub secret; APIFY_TOKEN_2 is the backup account).")
    reels = rank(fetch())
    grow_accounts(reels)
    top = reels[:PACK]
    print(f"building the hook pack for {len(top)} reels")
    index = build_pack(top)
    run = {"date": date, "fetched": len(reels), "hashtags": HASHTAGS, "packed": len(index),
           "top": [{"url": p.get("url"), "owner": p.get("ownerUsername"), "views": views(p), "multiple": p["_multiple"],
                    "caption": (p.get("caption") or "")[:200]} for p in reels[:30]],
           "analysed": []}
    if os.environ.get("HOOKMINE_GEMINI") == "1" and os.environ.get("GEMINI_API_KEY"):
        analysed = analyse(reels[:ANALYSE])
        mult = {(p.get("shortCode") or p.get("id")): p["_multiple"] for p in reels[:ANALYSE]}
        for r in analysed:
            r["_multiple"] = mult.get(r.get("post_id"))
        run["analysed"], run["reader"] = analysed, "Gemini"
    (DATA / f"{date}.json").write_text(json.dumps(run, indent=1, ensure_ascii=False) + "\n")
    if any(r.get("analysis") for r in run["analysed"]):
        write_hooks(run)
    print(f"hookmine: {len(reels)} reels ranked, {len(index)} packed for Claude")


if __name__ == "__main__":
    if len(sys.argv) > 2 and sys.argv[1] == "apply":
        apply(sys.argv[2])
    else:
        main(dry="--dry" in sys.argv)
