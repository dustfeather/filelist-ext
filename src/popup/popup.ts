import { storage } from "../storage";
import { Series } from "../types";

const input = document.getElementById("series-input") as HTMLInputElement;
const addBtn = document.getElementById("add-btn") as HTMLButtonElement;
const listEl = document.getElementById("series-list") as HTMLDivElement;
const emptyEl = document.getElementById("empty-state") as HTMLDivElement;
const usernameInput = document.getElementById("username-input") as HTMLInputElement;
const passkeyInput = document.getElementById("passkey-input") as HTMLInputElement;
const saveCredsBtn = document.getElementById("save-creds") as HTMLButtonElement;
const pollSelect = document.getElementById("poll-interval") as HTMLSelectElement;
const strictToggle = document.getElementById("strict-toggle") as HTMLButtonElement;
const lastCheckEl = document.getElementById("last-check") as HTMLSpanElement;
const statusDot = document.getElementById("status-dot") as HTMLSpanElement;

let addStrict = false;
strictToggle.addEventListener("click", () => {
    addStrict = !addStrict;
    strictToggle.classList.toggle("bg-accent/30", addStrict);
    strictToggle.classList.toggle("text-accent", addStrict);
    strictToggle.classList.toggle("text-white/30", !addStrict);
    strictToggle.classList.toggle("border-accent", addStrict);
    strictToggle.classList.toggle("border-surface-border", !addStrict);
});

async function renderSeries(series: Series[]) {
    listEl.innerHTML = "";
    emptyEl.classList.toggle("hidden", series.length > 0);
    const seen = await storage.getSeenTorrents();
    for (const s of series) {
        const key = s.name.toLowerCase();
        const found = Object.keys(seen[key] ?? {}).length > 0;
        const card = document.createElement("div");
        card.className = "series-card";
        card.innerHTML = `
            <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full flex-shrink-0 ${found ? "bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.5)]" : "bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.5)]"}"></span>
                <span class="series-name text-sm text-white/80 cursor-pointer hover:text-white" title="Click to edit">${escapeHtml(s.name)}</span>
            </div>
            <div class="flex items-center gap-1.5">
                <button class="search-btn px-1.5 py-0.5 rounded text-[10px] bg-surface text-white/30 hover:text-white/50 transition-colors"
                    title="Search on filelist.io">🔍</button>
                <button class="strict-btn px-1.5 py-0.5 rounded text-[10px] transition-colors
                    ${s.strict ? "bg-accent/30 text-accent" : "bg-surface text-white/30 hover:text-white/50"}"
                    data-name="${escapeHtml(s.name)}" title="Strict: season packs only">S</button>
                <button class="remove-btn" data-name="${escapeHtml(s.name)}">×</button>
            </div>
        `;
        card.querySelector(".remove-btn")!.addEventListener("click", () => removeSeries(s.name));
        card.querySelector(".strict-btn")!.addEventListener("click", () => toggleStrict(s.name));
        card.querySelector(".search-btn")!.addEventListener("click", () => {
            const q = s.name.replace(/\s+/g, "+");
            chrome.tabs.create({ url: `https://filelist.io/browse.php?search=${q}&cat=21&searchin=0&sort=2` });
        });
        card.querySelector(".series-name")!.addEventListener("click", (e) => {
            const span = e.currentTarget as HTMLSpanElement;
            const input = document.createElement("input");
            input.type = "text";
            input.value = s.name;
            input.className = "bg-transparent text-sm text-white outline-none border-b border-accent w-full";
            span.replaceWith(input);
            input.focus();
            input.select();
            const commit = async () => {
                const newName = input.value.trim();
                if (newName && newName !== s.name) {
                    await renameSeries(s.name, newName);
                } else {
                    const series = await storage.getSeries();
                    await renderSeries(series);
                }
            };
            input.addEventListener("blur", commit);
            input.addEventListener("keydown", (ev) => {
                if (ev.key === "Enter") input.blur();
                if (ev.key === "Escape") { input.value = s.name; input.blur(); }
            });
        });
        listEl.appendChild(card);
    }
}

function escapeHtml(s: string) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

async function addSeries() {
    const name = input.value.trim();
    if (!name) return;
    const series = await storage.getSeries();
    if (series.some((s) => s.name.toLowerCase() === name.toLowerCase())) return;
    series.push({ name, addedAt: Date.now(), strict: addStrict });
    await storage.setSeries(series);
    input.value = "";
    await renderSeries(series);
    chrome.runtime.sendMessage({ type: "poll-now" });
}

async function renameSeries(oldName: string, newName: string) {
    const series = await storage.getSeries();
    const entry = series.find((s) => s.name === oldName);
    if (!entry) return;
    entry.name = newName;
    await storage.setSeries(series);
    const seen = await storage.getSeenTorrents();
    delete seen[oldName.toLowerCase()];
    await storage.setSeenTorrents(seen);
    await renderSeries(series);
}

async function toggleStrict(name: string) {
    const series = await storage.getSeries();
    const entry = series.find((s) => s.name === name);
    if (!entry) return;
    entry.strict = !entry.strict;
    await storage.setSeries(series);
    await renderSeries(series);
}

async function removeSeries(name: string) {
    let series = await storage.getSeries();
    series = series.filter((s) => s.name !== name);
    await storage.setSeries(series);
    await renderSeries(series);
}

async function updateLastCheck() {
    const ts = await storage.getLastCheck();
    if (ts > 0) {
        const ago = Math.round((Date.now() - ts) / 60000);
        lastCheckEl.textContent = ago < 1 ? "just now" : `${ago}m ago`;
        statusDot.classList.replace("bg-white/20", "bg-green-400");
    }
}

async function init() {
    const series = await storage.getSeries();
    await renderSeries(series);

    const settings = await storage.getSettings();
    usernameInput.value = settings.username;
    passkeyInput.value = settings.passkey;
    pollSelect.value = String(settings.pollIntervalMinutes);

    updateLastCheck();
}

addBtn.addEventListener("click", addSeries);
input.addEventListener("keydown", (e) => { if (e.key === "Enter") addSeries(); });

saveCredsBtn.addEventListener("click", async () => {
    const settings = await storage.getSettings();
    settings.username = usernameInput.value.trim();
    settings.passkey = passkeyInput.value.trim();
    await storage.setSettings(settings);
    chrome.runtime.sendMessage({ type: "poll-now" });
});

pollSelect.addEventListener("change", async () => {
    const settings = await storage.getSettings();
    settings.pollIntervalMinutes = Number(pollSelect.value);
    await storage.setSettings(settings);
    chrome.runtime.sendMessage({ type: "update-alarm" });
});

init();