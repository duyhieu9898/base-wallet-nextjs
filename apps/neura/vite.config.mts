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

  // 3000 is n-plus and 3001 is n-plus-admin, so `pnpm dev:all` can run every
  // application at once without a port collision.
  server: { port: 3002 },
  preview: { port: 3002 },

  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    clearMocks: true,
    restoreMocks: true,
  },
})
