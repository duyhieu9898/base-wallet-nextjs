import { describe, expect, it } from "vitest"

import { createAuthGeneration } from "./auth-generation"

describe("createAuthGeneration", () => {
  it("invalidates a captured generation once a new one starts", () => {
    const owner = createAuthGeneration()
    const captured = owner.current()

    owner.next()

    expect(owner.isCurrent(captured)).toBe(false)
  })

  it("keeps generations isolated per instance", () => {
    const first = createAuthGeneration()
    const second = createAuthGeneration()

    first.next()

    expect(second.isCurrent(second.current())).toBe(true)
  })

  it("drops the side effect of an operation that finishes after a newer one started", async () => {
    const owner = createAuthGeneration()
    const committed: string[] = []

    async function operation(label: string, delayMs: number) {
      const generation = owner.current()

      await new Promise((resolve) => setTimeout(resolve, delayMs))

      if (!owner.isCurrent(generation)) {
        return
      }

      committed.push(label)
    }

    const slowOld = operation("old", 20)

    owner.next()

    const fastNew = operation("new", 1)

    await Promise.all([slowOld, fastNew])

    expect(committed).toEqual(["new"])
  })
})
