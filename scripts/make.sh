#!/usr/bin/env bash
# One command from plan to finished video.
# Usage: scripts/make.sh plans/<id>.json [--force]
#   0. narrates each scene with ElevenLabs (when ELEVENLABS_API_KEY is set)
#   1. checks the plan (format + editor rules), stops on problems unless --force
#   2. builds the sound-effects track from the scenes' events
#   3. renders out/<id>.mp4 and the frame sheet out/<id>-sheet.png
set -euo pipefail
PLAN="$1"; shift || true
ID=$(node -e "console.log(require('./$PLAN').id)")

python3 scripts/reelscore.py "$PLAN"
python3 scripts/voice.py "$PLAN"
# Score again with the real narration lengths: the pace must hold once it is read aloud.
[ -s "out/$ID/vo.json" ] && python3 scripts/reelscore.py "$PLAN"
# Illustrations (free FLUX on Cloudflare when CF_ACCOUNT_ID/CF_API_TOKEN are set; placeholders otherwise).
python3 scripts/illustrate.py plan "$PLAN"
npx tsx scripts/prepare.ts "$PLAN" "$@"
mkdir -p public/sfx
# Music: composed to the reel's cuts (skipped when the plan says "music": "none" or fluidsynth is missing).
MOOD=$(node -e "console.log(require('./out/$ID/sfx.json').mood || 'tense')")
if [ "$MOOD" != none ] && command -v fluidsynth >/dev/null; then
  python3 scripts/music.py "out/$ID/music.wav" "out/$ID/sfx.json" "$MOOD"
  node -e "const f='out/$ID/sfx.json',j=require('./'+f);j.music='out/$ID/music.wav';require('fs').writeFileSync(f,JSON.stringify(j,null,2))"
fi
python3 scripts/sfx.py "public/sfx/$ID.wav" "out/$ID/sfx.json"
scripts/render.sh PlanVideo "$ID" --props="out/$ID/props.json"
