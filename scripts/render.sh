#!/usr/bin/env bash
# Render a composition to out/<name>.mp4 and build a QA contact sheet.
# Usage: scripts/render.sh <CompositionId> <output-name>
set -euo pipefail
ID="$1"; NAME="$2"
mkdir -p out

# Remotion can't download its own browser in the cloud workspace; use the pre-installed one.
BROWSER="${REMOTION_BROWSER:-$(ls -d /opt/pw-browsers/chromium_headless_shell*/*/chrome-headless-shell 2>/dev/null | head -1 || true)}"
ARGS=()
if [ -n "$BROWSER" ]; then ARGS+=(--browser-executable="$BROWSER"); fi

npx remotion render src/index.ts "$ID" "out/$NAME.mp4" "${ARGS[@]}" --log=error

# Contact sheet: 8 evenly spaced frames, 4x2.
FRAMES=$(ffprobe -v error -count_packets -select_streams v:0 -show_entries stream=nb_read_packets -of default=nk=1:nw=1 "out/$NAME.mp4" | head -1 | tr -dc '0-9')
SEL=""
for i in 0 1 2 3 4 5 6 7; do
  N=$(( (FRAMES - 2) * (2 * i + 1) / 16 ))
  SEL+="eq(n\\,$N)+"
done
SEL="${SEL%+}"
ffmpeg -v error -y -i "out/$NAME.mp4" -vf "select='$SEL',scale=360:-1,tile=4x2" -frames:v 1 -vsync vfr "out/$NAME-sheet.png"
echo "rendered out/$NAME.mp4 and out/$NAME-sheet.png"
