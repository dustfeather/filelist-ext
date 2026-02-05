# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

```bash
pnpm install              # Install dependencies
pnpm run build            # Type-check (tsc) then Vite build → dist/
pnpm run dev              # Vite dev server with HMR
```

Load `dist/` as an unpacked extension in Chrome or temporary add-on in Firefox.

## Architecture

Chrome/Firefox MV3 extension that monitors filelist.io for tracked TV series via the JSON API and sends browser notifications for new results.

**Data flow:** Popup stores series names (max 150) in `chrome.storage.local` → service worker incrementally polls filelist.io API (`search-torrents`) in batches over a 1-hour cycle → deduplicates via stored torrent IDs with timestamps → fires notifications. Series with no new results for 30 days are auto-removed.

**API rate limit:** 150 requests/hour. The service worker uses a 1-minute alarm and spreads polls across a 60-minute cycle (`batchSize = ceil(N/60)`), supporting up to 150 series. A `pollCursor` and `nextCycleAt` timestamp in storage track cycle progress across service worker restarts. The popup "Poll Now" button triggers a full immediate poll of all series.

### Key modules

- **`src/background/service-worker.ts`** — Incremental batch polling (`pollTick`) on a 1-minute alarm, full immediate poll (`poll`) on manual trigger, credential auto-discovery from filelist.io/my.php, strict mode filtering, notification dispatch. Listens for `poll-now` message from popup.
- **`src/storage.ts`** — Typed wrapper around `chrome.storage.local` with default values. All storage access goes through this module. `seenTorrents` stores `Record<string, Record<string, number>>` (series → torrent ID → timestamp).
- **`src/types.ts`** — Shared interfaces: `Series`, `TorrentResult`, `Settings`, `StorageData`.
- **`src/popup/`** — Dark glassmorphism UI built with Tailwind CSS. Manages series list (add/edit/remove/strict toggle/search link, max 150 entries) and credential config.

### Build system

Vite + `@crxjs/vite-plugin` handles manifest processing and extension bundling. Tailwind CSS with custom color tokens (surface, dark, accent) defined in `tailwind.config.ts`.

### Key constraints

- Service workers have no DOM access (no DOMParser, no document).
- `Math.max(...largeArray)` blows the call stack in service workers — use loops instead.

## CI/CD

- **build.yml** — Runs on push/PR to main. Builds and uploads artifact.
- **release.yml** — Runs on push to main. Auto-bumps patch version in `package.json` + `src/manifest.json`, commits with `[skip ci]`, tags, and creates a GitHub Release with `.zip` (Chrome) and `.xpi` (Firefox) assets.

## Style

- 4-space indentation, UTF-8, LF line endings (see `.editorconfig`)
- TypeScript strict mode, ES2020 target