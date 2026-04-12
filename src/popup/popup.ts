import { storage } from "../storage";
import { Series } from "../types";

const input = document.getElementById("series-input") as HTMLInputElement;
const addBtn = document.getElementById("add-btn") as HTMLButtonElement;
const listEl = document.getElementById("series-list") as HTMLDivElement;
const emptyEl = document.getElementById("empty-state") as HTMLDivElement;
const usernameInput = document.getElementById("username-input") as HTMLInputElement;
const passkeyInput = document.getElementById("passkey-input") as HTMLInputElement;
const saveCredsBtn = document.getElementById("save-creds") as HTMLButtonElement;
const strictToggle = document.getElementById("strict-toggle") as HTMLButtonElement;
const lastCheckEl = document.getElementById("last-check") as HTMLSpanElement;
const statusDot = document.getElementById("status-dot") as HTMLSpanElement;

let addStrict = false;
strictToggle.addEventListener("click", () => {
    addStrict = !addStrict;
    strictToggle.classList.toggle("active", addStrict);
});

function updateFormState(count: number) {
    const atLimit = count >= MAX_SERIES;
    input.disabled = atLimit;
    addBtn.disabled = atLimit;
    input.placeholder = atLimit ? `Limit reached (${MAX_SERIES})` : "Add series...";
}

async function renderSeries(series: Series[]) {
    listEl.textContent = "";
    emptyEl.classList.toggle("hidden", series.length > 0);
    updateFormState(series.length);
    const seen = await storage.getSeenTorrents();
    for (const s of series) {
        const key = s.name.toLowerCase();
        const found = Object.keys(seen[key] ?? {}).length > 0;
        const item = document.createElement("div");
        item.className = "series-item";
        const leftDiv = document.createElement("div");
        leftDiv.className = "flex items-center gap-2.5 min-w-0";
        const dot = document.createElement("span");
        dot.className = `w-2 h-2 rounded-full shrink-0 ${found ? "bg-primary" : "bg-outline-variant"}`;
        const nameSpan = document.createElement("span");
        nameSpan.className = "text-[length:--font-size-body-md] leading-[--line-height-body-md] text-on-surface cursor-pointer hover:text-primary truncate";
        nameSpan.title = "Click to edit";
        nameSpan.textContent = s.name;
        leftDiv.append(dot, nameSpan);

        const rightDiv = document.createElement("div");
        rightDiv.className = "flex items-center gap-0.5 shrink-0";
        const searchBtn = document.createElement("button");
        searchBtn.className = "icon-btn text-xs";
        searchBtn.title = "Search on filelist.io";
        searchBtn.ariaLabel = "Search on filelist.io";
        searchBtn.textContent = "\u{1F50D}";
        const strictBtn = document.createElement("button");
        strictBtn.className = `icon-btn text-xs ${s.strict ? "active" : ""}`;
        strictBtn.dataset.name = s.name;
        strictBtn.title = "Strict: season packs only";
        strictBtn.ariaLabel = `Strict mode ${s.strict ? "on" : "off"}`;
        strictBtn.textContent = "S";
        const removeBtn = document.createElement("button");
        removeBtn.className = "remove-btn";
        removeBtn.dataset.name = s.name;
        removeBtn.ariaLabel = `Remove ${s.name}`;
        removeBtn.textContent = "\u00D7";
        rightDiv.append(searchBtn, strictBtn, removeBtn);

        item.append(leftDiv, rightDiv);
        removeBtn.addEventListener("click", () => removeSeries(s.name));
        strictBtn.addEventListener("click", () => toggleStrict(s.name));
        searchBtn.addEventListener("click", () => {
            const q = s.name.replace(/\s+/g, "+");
            chrome.tabs.create({ url: `https://filelist.io/browse.php?search=${q}&cat=21&searchin=0&sort=2` });
        });
        nameSpan.addEventListener("click", (e) => {
            const span = e.currentTarget as HTMLSpanElement;
            const input = document.createElement("input");
            input.type = "text";
            input.value = s.name;
            input.className = "bg-transparent text-[length:--font-size-body-md] text-on-surface outline-none border-b-2 border-primary w-full";
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
        listEl.appendChild(item);
    }
}

const MAX_SERIES = 150;

async function addSeries() {
    const name = input.value.trim();
    if (!name) return;
    const series = await storage.getSeries();
    if (series.some((s) => s.name.toLowerCase() === name.toLowerCase())) return;
    if (series.length >= MAX_SERIES) return;
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
        statusDot.classList.replace("bg-outline-variant", "bg-primary");
    }
}

async function init() {
    const series = await storage.getSeries();
    await renderSeries(series);

    const settings = await storage.getSettings();
    usernameInput.value = settings.username;
    passkeyInput.value = settings.passkey;
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

init();