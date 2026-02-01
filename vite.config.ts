import { defineConfig } from "vite";
import { crx } from "@crxjs/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import manifest from "./src/manifest.json";

export default defineConfig({
    plugins: [crx({ manifest }), tailwindcss()],
    build: {
        outDir: "dist",
    },
});