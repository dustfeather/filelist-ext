import { storage } from "../storage";

const ALARM_NAME = "poll-api";
const API_URL = "https://filelist.io/api.php";
const MY_URL = "https://filelist.io/my.php";

async function setupAlarm() {
    const settings = await storage.getSettings();
    const series = await storage.getSeries();
    const minInterval = Math.ceil((series.length * 60) / 150) || 1;
    const interval = Math.max(settings.pollIntervalMinutes, minInterval);
    await chrome.alarms.clear(ALARM_NAME);
    chrome.alarms.create(ALARM_NAME, { periodInMinutes: interval });
}

async function discoverCredentials(): Promise<{ username: string; passkey: string } | null> {
    try {
        const resp = await fetch(MY_URL, { credentials: "include" });
        if (!resp.ok) return null;
        const html = await resp.text();
        const passkeyMatch = html.match(/name=["']resetpasskey["'][^>]*>\s*([a-f0-9]{32})/i);
        const usernameMatch = html.match(/<h2>Hi,\s*<a[^>]*>([^<]+)<\/a>/i);
        if (!passkeyMatch || !usernameMatch) return null;
        return { passkey: passkeyMatch[1], username: usernameMatch[1] };
    } catch {
        return null;
    }
}

interface ApiTorrent {
    id: number;
    name: string;
    download_link: string;
    upload_date: string;
}

async function searchSeries(username: string, passkey: string, query: string): Promise<ApiTorrent[]> {
    const url = `${API_URL}?username=${encodeURIComponent(username)}&passkey=${encodeURIComponent(passkey)}&action=search-torrents&type=name&query=${encodeURIComponent(query)}&category=21,27`;
    try {
        const resp = await fetch(url);
        if (!resp.ok) return [];
        return await resp.json();
    } catch {
        return [];
    }
}

async function poll() {
    const settings = await storage.getSettings();
    if (!settings.passkey || !settings.username) {
        const creds = await discoverCredentials();
        if (creds) {
            settings.passkey = creds.passkey;
            settings.username = creds.username;
            await storage.setSettings(settings);
        } else {
            return;
        }
    }

    const seriesList = await storage.getSeries();
    const seen = await storage.getSeenTorrents();
    let updated = false;

    const now = Date.now();
    const TTL = 30 * 24 * 60 * 60 * 1000; // 30 days
    const expired: string[] = [];

    // Remove series whose latest notification is over 30 days ago
    for (const series of seriesList) {
        const seenMap = seen[series.name.toLowerCase()];
        if (!seenMap) continue;
        let latest = 0;
        for (const ts of Object.values(seenMap)) {
            if (ts > latest) latest = ts;
        }
        if (latest > 0 && now - latest > TTL) {
            expired.push(series.name);
        }
    }

    if (expired.length > 0) {
        for (const name of expired) {
            delete seen[name.toLowerCase()];
        }
        const remaining = seriesList.filter((s) => !expired.includes(s.name));
        await storage.setSeries(remaining);
        await storage.setSeenTorrents(seen);
        await setupAlarm();
        // Continue polling with remaining series
        seriesList.length = 0;
        seriesList.push(...remaining);
    }

    for (const series of seriesList) {
        const key = series.name.toLowerCase();
        const seenMap = seen[key] ?? {};

        const results = await searchSeries(settings.username, settings.passkey, series.name);

        // Apply strict mode: exclude individual episodes
        const filtered = series.strict
            ? results.filter((r) => !/S\d{2,}E\d{2,}/i.test(r.name))
            : results;

        for (const torrent of filtered) {
            const id = String(torrent.id);
            if (!(id in seenMap)) {
                seenMap[id] = now;
                updated = true;
                chrome.notifications.create(`fl-${Date.now()}`, {
                    type: "basic",
                    iconUrl: chrome.runtime.getURL("icons/icon128.png"),
                    title: `New: ${series.name}`,
                    message: torrent.name,
                });
            }
        }
        seen[key] = seenMap;
    }

    if (updated) {
        await storage.setSeenTorrents(seen);
    }
    await storage.setLastCheck(Date.now());
}

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === ALARM_NAME) poll();
});

chrome.runtime.onInstalled.addListener(() => {
    setupAlarm();
    poll();
});

chrome.runtime.onStartup.addListener(() => {
    setupAlarm();
});

chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "poll-now") poll();
    if (msg.type === "update-alarm") setupAlarm();
});