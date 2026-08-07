/// <reference types="vitest/config" />
import path from "node:path"

import tailwindcss from "@tailwindcss/vite"
import { tanstackRouter } from "@tanstack/router-plugin/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [
    // Must run before the React plugin: it generates routeTree.gen.ts that
    // main.tsx imports, so React would otherwise compile a missing module.
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react(),
    tailwindcss(),
  ],

  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "./src") },
  },

  server: { port: 3001 },
  preview: { port: 3001 },

  // Vitest reads this file now that the app builds with Vite; the separate
  // vitest.config.mts is gone, along with its PostCSS workaround — Tailwind runs
  // as a Vite plugin here, so the test runner never loads a PostCSS config.
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    clearMocks: true,
    restoreMocks: true,
  },
})
