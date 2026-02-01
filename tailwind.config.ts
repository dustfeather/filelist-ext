import type { Config } from "tailwindcss";

export default {
    content: ["src/**/*.{html,ts}"],
    theme: {
        extend: {
            colors: {
                surface: {
                    DEFAULT: "rgba(255,255,255,0.05)",
                    hover: "rgba(255,255,255,0.08)",
                    border: "rgba(255,255,255,0.1)",
                },
                dark: {
                    DEFAULT: "#0a0a0f",
                    card: "rgba(15,15,25,0.6)",
                },
                accent: {
                    DEFAULT: "#6366f1",
                    glow: "rgba(99,102,241,0.4)",
                },
            },
        },
    },
    plugins: [],
} satisfies Config;