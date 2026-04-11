# Privacy Policy

**FileList Monitor** is a browser extension that tracks TV series on filelist.io. This policy explains what data the extension handles and how.

## Data collected

The extension stores the following data **locally in your browser** via `chrome.storage.local`:

- Series names you add for tracking
- Your filelist.io username and passkey (entered manually or auto-discovered from your active session)
- IDs and timestamps of previously seen torrents (used for deduplication)
- Your polling interval preference

## How data is used

- **Series names** are sent as search queries to the filelist.io API (`search-torrents` endpoint) to check for new torrents.
- **Credentials** (username + passkey) are sent to filelist.io to authenticate API requests.
- **Seen torrent IDs** are compared locally to avoid duplicate notifications.

## Data sharing

The extension does **not**:

- Send any data to third-party servers, analytics services, or tracking platforms
- Collect or transmit browsing history, personal information, or usage statistics
- Use cookies, fingerprinting, or any form of user tracking
- Communicate with any server other than filelist.io

## Data storage

All data is stored locally in your browser using the Web Extensions storage API. No data leaves your device except for API requests to filelist.io.

Uninstalling the extension removes all stored data.

## Permissions

| Permission | Reason |
|------------|--------|
| `storage` | Store series list, credentials, and seen torrents locally |
| `alarms` | Schedule periodic polling |
| `notifications` | Show desktop notifications for new torrents |
| `host_permissions` (filelist.io) | Fetch search results and auto-discover credentials |

## Changes

Updates to this policy will be reflected in this document. The date below indicates the last revision.

*Last updated: April 11, 2026*
