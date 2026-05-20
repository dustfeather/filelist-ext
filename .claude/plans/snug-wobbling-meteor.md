# Switch from RSS to FileList API

Replace the single RSS feed poll with per-series API search calls so we search the full catalog.

## What changes

### `src/types.ts`
- Add `username: string` to `Settings`

### `src/storage.ts`
- Add `username: ""` to defaults

### `src/background/service-worker.ts`
- Remove `RSS_URL`, `parseRSS`, `getTag`
- Replace with per-series API calls: `api.php?username=...&passkey=...&action=search-torrents&type=name&query=<name>&category=21,27`
- Parse JSON instead of XML
- Rename `discoverPasskey()` → `discoverCredentials()`, also extract username via `/<h2>Hi,\s*<a[^>]*>([^<]+)<\/a>/i`
- Auto-adjust alarm interval: `Math.max(userInterval, Math.ceil(seriesCount * 60 / 150))` to stay under 150 req/hr

### `src/popup/popup.html` + `src/popup/popup.ts`
- Add username field in Settings
- Show effective poll interval in status bar

## Verification
- `pnpm run build` succeeds
- API calls visible in service worker Network tab
- Notifications fire, strict mode works