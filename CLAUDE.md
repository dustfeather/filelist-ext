# CLAUDE.md

Chrome/Firefox MV3 extension: monitors filelist.io for tracked TV series via JSON API, fires browser notifications for new results.

## Gotchas

- Service workers have no DOM (no `DOMParser`, no `document`).
- `Math.max(...largeArray)` blows service-worker call stack — use loop.

## Conventions

- All `chrome.storage.local` access through `src/storage.ts` (typed wrapper w/ defaults). `seenTorrents` = `Record<string, Record<string, number>>` (series → torrent ID → timestamp).
- Release version from git tags, not files. `package.json` + `src/manifest.json` on disk = dev placeholders; `release.yml` derives next patch from latest tag, injects at build (no commit back).

## Polling design

- filelist.io API rate limit = 150 req/hour; series cap = 150.
- Service worker polls incrementally on 1-min alarm, spreading work across 60-min cycle: `batchSize = ceil(N/60)`. `pollCursor` + `nextCycleAt` in storage track progress so service-worker restart resumes mid-cycle.
- Popup "Poll Now" sends `poll-now` → full immediate poll of all series.
- Series with no new results for 30 days auto-removed.

## Project facts

- pnpm (not npm/yarn).
- CWS listing: `chromewebstore.google.com/detail/filelist-monitor/fkklofnmhjhifmnkhgjplkkkpjoajdhj` (ext ID `fkklofnmhjhifmnkhgjplkkkpjoajdhj`).
- CWS publish secrets: `CHROME_CLIENT_ID`, `CHROME_CLIENT_SECRET`, `CHROME_EXTENSION_ID`, `CHROME_REFRESH_TOKEN`.
- AMO publish secrets: `AMO_JWT_ISSUER`, `AMO_JWT_SECRET`.
- `release.yml` sets `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true` — needed until `softprops/action-gh-release` ships v3.
