import { storage } from "../storage";
import { Series } from "../types";

const ALARM_NAME = "poll-api";
const API_URL = "https://filelist.io/api.php";
const MY_URL = "https://filelist.io/my.php";
const CYCLE_MINUTES = 60;

async function setupAlarm() {
    await chrome.alarms.clear(ALARM_NAME);
    chrome.alarms.create(ALARM_NAME, { periodInMinutes: 1 });
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

async function getCredentials() {
    const settings = await storage.getSettings();
    if (!settings.passkey || !settings.username) {
        const creds = await discoverCredentials();
        if (creds) {
            settings.passkey = creds.passkey;
            settings.username = creds.username;
            await storage.setSettings(settings);
        } else {
            return null;
        }
    }
    return settings;
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

async function expireOldSeries() {
    const seriesList = await storage.getSeries();
    const seen = await storage.getSeenTorrents();
    const now = Date.now();
    const TTL = 30 * 24 * 60 * 60 * 1000;
    const expired: string[] = [];

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
    }
}

async function pollSeriesList(seriesList: Series[], username: string, passkey: string) {
    const seen = await storage.getSeenTorrents();
    let updated = false;
    const now = Date.now();

    for (const series of seriesList) {
        const key = series.name.toLowerCase();
        const seenMap = seen[key] ?? {};

        const results = await searchSeries(username, passkey, series.name);

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
}

// Incremental polling: processes one batch per minute, completes a full cycle in ~1 hour
async function pollTick() {
    const settings = await getCredentials();
    if (!settings) return;

    let seriesList = await storage.getSeries();
    if (seriesList.length === 0) return;

    let cursor = await storage.getPollCursor();
    const nextCycleAt = await storage.getNextCycleAt();

    // Wait for next cycle if we just finished one
    if (cursor === 0 && Date.now() < nextCycleAt) return;

    // Clamp cursor if series list changed since last tick
    if (cursor >= seriesList.length) cursor = 0;

    // Run expiry check at the start of each cycle
    if (cursor === 0) {
        await expireOldSeries();
        seriesList = await storage.getSeries();
        if (seriesList.length === 0) return;
    }

    const batchSize = Math.max(1, Math.ceil(seriesList.length / CYCLE_MINUTES));
    const end = Math.min(cursor + batchSize, seriesList.length);

    await pollSeriesList(seriesList.slice(cursor, end), settings.username, settings.passkey);

    const newCursor = end >= seriesList.length ? 0 : end;
    await storage.setPollCursor(newCursor);

    if (newCursor === 0) {
        await storage.setNextCycleAt(Date.now() + CYCLE_MINUTES * 60 * 1000);
    }

    await storage.setLastCheck(Date.now());
}

// Full immediate poll (manual trigger from popup)
async function poll() {
    const settings = await getCredentials();
    if (!settings) return;

    await expireOldSeries();
    const seriesList = await storage.getSeries();

    await pollSeriesList(seriesList, settings.username, settings.passkey);

    await storage.setPollCursor(0);
    await storage.setNextCycleAt(Date.now() + CYCLE_MINUTES * 60 * 1000);
    await storage.setLastCheck(Date.now());
}

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === ALARM_NAME) pollTick();
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
});
