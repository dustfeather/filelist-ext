# CLAUDE.md

Chrome/Firefox MV3 extension: monitors filelist.io for tracked TV series via
its JSON API and fires browser notifications for new results.

## Gotchas

- Service workers have no DOM (no `DOMParser`, no `document`).
- `Math.max(...largeArray)` blows the service-worker call stack — use a loop.

## Conventions

- All `chrome.storage.local` access goes through `src/storage.ts` (typed wrapper
  with defaults). `seenTorrents` is `Record<string, Record<string, number>>`
  (series → torrent ID → timestamp).
- Release version comes from git tags, not files. The versions in `package.json`
  and `src/manifest.json` on disk are dev placeholders; `release.yml` derives the
  next patch from the latest tag and injects it at build time (no commit back).

## Polling design

- filelist.io API rate limit is 150 requests/hour; series cap is 150.
- Service worker polls incrementally on a 1-minute alarm, spreading work across a
  60-minute cycle: `batchSize = ceil(N/60)`. `pollCursor` + `nextCycleAt` in
  storage track progress so a service-worker restart resumes mid-cycle.
- Popup "Poll Now" sends `poll-now`, triggering a full immediate poll of all series.
- Series with no new results for 30 days are auto-removed.
