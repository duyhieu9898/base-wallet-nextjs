import "@testing-library/jest-dom/vitest"

import { afterEach } from "vitest"

import { resetSolanaRuntime } from "../src/config"

afterEach(() => {
  // The installed config is module-scoped, so one test file's cluster registry
  // would otherwise leak into the next.
  resetSolanaRuntime()
})
