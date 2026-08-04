import "@testing-library/jest-dom/vitest"

import { afterAll, afterEach, beforeAll } from "vitest"

import { resetMockAuthState } from "@/mocks/data/auth-session"
import { server } from "@/mocks/server"

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
