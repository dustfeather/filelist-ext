export interface Series {
    name: string;
    addedAt: number;
    strict: boolean;
}

export interface TorrentResult {
    title: string;
    link: string;
    guid: string;
    pubDate: string;
}

export interface Settings {
    passkey: string;
    username: string;
}

export interface StorageData {
    series: Series[];
    seenTorrents: Record<string, Record<string, number>>;
    settings: Settings;
    lastCheck: number;
    pollCursor: number;
    nextCycleAt: number;
}