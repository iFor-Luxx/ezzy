import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Proxy local: evita bloqueos CORS del navegador al consultar tu key.
    proxy: {
        "/oc-api": {
          target: "https://opencode.ai/inference/go",
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/oc-api/, ""),
        },
      },
  },
});
