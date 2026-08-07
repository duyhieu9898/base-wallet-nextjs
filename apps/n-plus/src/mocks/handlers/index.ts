import { authHandlers } from "./auth-handlers"
import { healthHandlers } from "./health-handlers"
import { positionsHandlers } from "./positions-handlers"
import { protectedHandlers } from "./protected-handlers"
import { registrationHandlers } from "./registration-handlers"

const isGlobalApiMockingEnabled =
  process.env.NEXT_PUBLIC_API_MOCKING !== "disabled"

/**
 * Per-module MSW Mocking Configuration for Product App.
 * Set any module flag to `false` to disable mocking for that specific module
 * (e.g. when connecting to a real backend endpoint for that module).
 */
export const moduleMockConfig = {
  health: true,
  auth: true,
  protected: true,
  registration: true,
  positions: true,
} as const

export const handlers = isGlobalApiMockingEnabled
  ? [
      ...(moduleMockConfig.health ? healthHandlers : []),
      ...(moduleMockConfig.auth ? authHandlers : []),
      ...(moduleMockConfig.protected ? protectedHandlers : []),
      ...(moduleMockConfig.registration ? registrationHandlers : []),
      ...(moduleMockConfig.positions ? positionsHandlers : []),
    ]
  : []
