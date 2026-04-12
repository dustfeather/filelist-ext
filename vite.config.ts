import { defineConfig, Plugin } from "vite";
import { crx } from "@crxjs/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import fs from "node:fs";
import path from "node:path";
import manifest from "./src/manifest.json";

function firefoxBackgroundScripts(): Plugin {
    return {
        name: "firefox-background-scripts",
        writeBundle(options) {
            const outDir = options.dir ?? "dist";
            const manifestPath = path.resolve(outDir, "manifest.json");
            const m = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
            if (m.background?.service_worker && !m.background.scripts) {
                m.background.scripts = [m.background.service_worker];
                fs.writeFileSync(manifestPath, JSON.stringify(m, null, 2) + "\n");
            }
        },
    };
}

export default defineConfig({
    plugins: [crx({ manifest }), tailwindcss(), firefoxBackgroundScripts()],
    build: {
        outDir: "dist",
    },
    css: {
        preprocessorOptions: {
            scss: {
                silenceDeprecations: ["import"],
            },
        },
    },
});