import { Series, Settings, StorageData } from "./types";

const DEFAULTS: StorageData = {
    series: [],
    seenTorrents: {},
    settings: { pollIntervalMinutes: 10, passkey: "", username: "" },
    lastCheck: 0,
};

async function get<K extends keyof StorageData>(key: K): Promise<StorageData[K]> {
    const result = await chrome.storage.local.get(key);
    return (result[key] ?? DEFAULTS[key]) as StorageData[K];
}

async function set<K extends keyof StorageData>(key: K, value: StorageData[K]): Promise<void> {
    await chrome.storage.local.set({ [key]: value });
}

export const storage = {
    getSeries: () => get("series"),
    setSeries: (v: Series[]) => set("series", v),

    getSeenTorrents: () => get("seenTorrents"),
    setSeenTorrents: (v: Record<string, Record<string, number>>) => set("seenTorrents", v),

    getSettings: () => get("settings"),
    setSettings: (v: Settings) => set("settings", v),

    getLastCheck: () => get("lastCheck"),
    setLastCheck: (v: number) => set("lastCheck", v),
};