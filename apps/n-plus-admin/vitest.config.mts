import react from "@vitejs/plugin-react"
import tsconfigPaths from "vite-tsconfig-paths"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  // A component importing a `.module.css` file makes Vite run the project's
  // PostCSS config, and the Tailwind v4 plugin cannot load under the test
  // runner. Tests assert behaviour, not styling, so an empty plugin list is
  // enough: CSS modules still resolve to class-name objects.
  css: { postcss: { plugins: [] } },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    clearMocks: true,
    restoreMocks: true,
  },
})
