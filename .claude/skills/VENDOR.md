# Vendored skills

| Skill | Source | Licence | Local changes |
|---|---|---|---|
| hooksmith, teach-hooksmith | arhamhi/hooksmith | MIT | none |
| viral-short-form | vyralcontent/content-skills | MIT | none |
| viral-hooks, viral-instagram-reels | vyralcontent/content-skills | MIT | none |
| ig-reel, ig-human, ig-caption | Jakeschincariol/instagram-agent-skill | MIT | `ig-reel/hookscore.py`: weak openers match whole words only (upstream matched "yo" inside "your", docking every "Your..." hook 30 points) |
| instagram-research, video-content-analyzer (scripts in `vendor/head-of-content/`) | bradautomates/head-of-content | MIT | none; `scripts/hookmine.py` drives them and adds our questions (frame 0, on-screen hook, first line) to the Gemini prompt at run time |
| remotion-* | remotion-dev/skills | see each | none |
