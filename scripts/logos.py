"""Company logos from nvstly/icons (https://github.com/nvstly/icons), stored unaltered in public/logos/.

Usage:
  python3 scripts/logos.py sync <path-to-nvstly-clone>   # S&P 500 + popular extras from a local clone
  python3 scripts/logos.py add NVDA TSM ...               # fetch extra tickers straight from GitHub
  python3 scripts/logos.py check NVDA AAPL ...            # exit 1 if any ticker has no logo

Every logo gets a manifest entry (public/logos/manifest.json): company name, which tile it needs
("light" = white tile, "dark" = near-black tile for logos that are white themselves) and its source.
"""
import csv
import io
import json
import os
import sys
import urllib.request

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "logos")
MANIFEST = os.path.join(OUT, "manifest.json")
SP500 = os.path.join(ROOT, "data", "sp500.csv")
RAW = "https://raw.githubusercontent.com/nvstly/icons/main/ticker_icons/{}.png"

# Popular US-listed names outside the S&P 500 that finance shorts often cover.
EXTRAS = {
    "TSM": "TSMC", "ASML": "ASML", "ARM": "Arm Holdings", "BABA": "Alibaba", "PDD": "PDD Holdings",
    "JD": "JD.com", "NIO": "NIO", "RIVN": "Rivian", "LCID": "Lucid", "SHOP": "Shopify", "SPOT": "Spotify",
    "SNOW": "Snowflake", "SOFI": "SoFi", "RKLB": "Rocket Lab", "GME": "GameStop", "AMC": "AMC Entertainment",
    "MSTR": "Strategy", "SMCI": "Super Micro Computer", "HOOD": "Robinhood", "NVO": "Novo Nordisk",
    "SAP": "SAP", "SONY": "Sony", "TM": "Toyota", "RBLX": "Roblox", "U": "Unity", "XYZ": "Block",
}


# Hand-checked exceptions where the automatic tile choice hides part of the logo.
TILE_OVERRIDES = {"LYV": "dark"}


def load_manifest():
    if os.path.exists(MANIFEST):
        return json.load(open(MANIFEST))
    return {}


def save_manifest(m):
    json.dump(dict(sorted(m.items())), open(MANIFEST, "w"), indent=1)


def tile_for(png_bytes):
    """'dark' if a large part of the logo is near-white (it would vanish on a white tile), else 'light'."""
    im = Image.open(io.BytesIO(png_bytes)).convert("RGBA").resize((64, 64))
    data = im.get_flattened_data() if hasattr(im, "get_flattened_data") else im.getdata()
    px = [p for p in data if p[3] > 128]
    if not px:
        return "light"

    def near_white(p):
        r, g, b, _ = p
        lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
        return lum > 0.85 and (max(r, g, b) - min(r, g, b)) / 255 < 0.15

    share = sum(1 for p in px if near_white(p)) / len(px)
    return "dark" if share > 0.3 else "light"


def sp500_names():
    return {r["Symbol"].upper(): r["Security"] for r in csv.DictReader(open(SP500))}


def store(ticker, data, name, source, m):
    os.makedirs(OUT, exist_ok=True)
    open(os.path.join(OUT, f"{ticker}.png"), "wb").write(data)
    m[ticker] = {"name": name, "tile": TILE_OVERRIDES.get(ticker) or tile_for(data), "source": source}


def sync(clone):
    import subprocess

    rev = subprocess.run(["git", "-C", clone, "rev-parse", "--short", "HEAD"], capture_output=True, text=True).stdout.strip()
    src = f"nvstly/icons@{rev}"
    m = load_manifest()
    names = {**sp500_names(), **EXTRAS}
    missing = []
    for t, name in names.items():
        f = os.path.join(clone, "ticker_icons", f"{t}.png")
        if os.path.exists(f):
            store(t, open(f, "rb").read(), name, src, m)
        else:
            missing.append(t)
    save_manifest(m)
    print(f"synced {len(names) - len(missing)} logos from {src}; {len(missing)} not in nvstly: {' '.join(missing)}")


def add(tickers):
    m = load_manifest()
    names = {**sp500_names(), **EXTRAS}
    for t in tickers:
        t = t.upper()
        try:
            data = urllib.request.urlopen(RAW.format(t), timeout=30).read()
        except Exception as e:  # noqa: BLE001
            print(f"{t}: not found in nvstly/icons ({e})")
            continue
        store(t, data, names.get(t, t), "nvstly/icons@main", m)
        print(f"{t}: added ({m[t]['tile']} tile)")
    save_manifest(m)


def check(tickers):
    m = load_manifest()
    bad = [t for t in tickers if t.upper() not in m]
    if bad:
        print("no logo for: " + " ".join(bad) + "  (try: python3 scripts/logos.py add " + " ".join(bad) + ")")
        sys.exit(1)
    print("all logos present")


if __name__ == "__main__":
    cmd, args = sys.argv[1], sys.argv[2:]
    {"sync": lambda: sync(args[0]), "add": lambda: add(args), "check": lambda: check(args)}[cmd]()
