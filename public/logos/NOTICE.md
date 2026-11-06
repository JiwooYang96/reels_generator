# Company logos

Source: [nvstly/icons](https://github.com/nvstly/icons), `ticker_icons/`, commit 3ba2624 (July 2026). Files are copied unaltered; `scripts/logos.py add <TICKER>` fetches more from the same repo.

Coverage: 448 of 503 S&P 500 tickers (list in `data/sp500.csv`, from [datasets/s-and-p-500-companies](https://github.com/datasets/s-and-p-500-companies)) plus 24 popular non-S&P names (TSMC, ASML, Arm, Alibaba, Shopify, Spotify, DraftKings...). The 55 S&P tickers nvstly lacks (e.g. BRK.B, YUM, XEL) show a gold ticker tile instead. `manifest.json` records each logo's company name, tile colour and source.

## Licence and trademarks

The nvstly/icons repository has no licence file. Every logo is a trademark of its company; neither that repository nor this one grants any right to the marks.

These logos are used only to identify the company a news story is about (nominative use). Rules for using them are in `CLAUDE.md` ("Logos"). If a company asks for its logo to be removed, delete the file and its manifest entry; plans that use it will then fail the check and fall back to the ticker tile when the logo field is removed.
