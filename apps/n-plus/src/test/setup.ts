import "@testing-library/jest-dom/vitest"

import { afterAll, afterEach, beforeAll } from "vitest"

import { evmRuntimeConfig } from "@/config/web3.config"
import { resetMockAuthState } from "@/mocks/data/auth-session"
import { server } from "@/mocks/server"
import { configureEvmRuntime } from "@nln/web3-evm/config"

// The EVM registry is consumer-injected, and many test files read it at module
// scope (`const network = getDefaultEvmNetwork()`). Setup files run before the
// test module graph is evaluated, so installing here is what makes those reads
// resolve — the same install `EvmProvider` performs in the running app.
//
// Imported through the React-free `@nln/web3-evm/config` leaf on purpose: pulling
// the main barrel here would instantiate hook modules during setup, and a test
// file's `vi.mock` could no longer replace them.
configureEvmRuntime(evmRuntimeConfig)

beforeAll(() =>
  server.listen({
    onUnhandledRequest: "error",
  }),
)

afterEach(() => {
  server.resetHandlers()
  // Nonce records, refresh sessions, failure modes and request counters are all required
  // clean: a consumed nonce or a remaining failure mode will be tested later
  // fail in a way that is very difficult to trace.
  resetMockAuthState()
})

afterAll(() => server.close())
