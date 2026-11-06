#!/usr/bin/env bash
# One command from plan to finished video.
# Usage: scripts/make.sh plans/<id>.json [--force]
#   1. checks the plan (format + editor rules), stops on problems unless --force
#   2. builds the sound-effects track from the scenes' events
#   3. renders out/<id>.mp4 and the frame sheet out/<id>-sheet.png
set -euo pipefail
PLAN="$1"; shift || true
ID=$(node -e "console.log(require('./$PLAN').id)")

npx tsx scripts/prepare.ts "$PLAN" "$@"
mkdir -p public/sfx
python3 scripts/sfx.py "public/sfx/$ID.wav" "out/$ID/sfx.json"
scripts/render.sh PlanVideo "$ID" --props="out/$ID/props.json"
