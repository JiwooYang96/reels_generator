"""Draw every style x subject in lab/styles.json into <outdir>/<style>-<n>.jpg (Cloudflare Workers AI, FLUX schnell)."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))
import illustrate  # noqa: E402

cfg = json.load(open(Path(__file__).with_name("styles.json")))
out = Path(sys.argv[1])
out.mkdir(parents=True, exist_ok=True)
for name, tmpl in cfg["styles"].items():
    for n, s in enumerate(cfg["subjects"], 1):
        illustrate.STYLE = tmpl.replace("{S}", s[0].upper() + s[1:]).replace("{s}", s)
        f = illustrate.draw(s, seed=f"{name}-{n}")
        if f:
            (out / f"{name}-{n}.jpg").write_bytes(f.read_bytes())
