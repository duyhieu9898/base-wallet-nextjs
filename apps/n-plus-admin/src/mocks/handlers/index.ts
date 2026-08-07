import { adminAdminsHandlers } from "./admin-admins-handlers"
import { adminAuthHandlers } from "./admin-auth-handlers"
import { adminBonusesHandlers } from "./admin-bonuses-handlers"
import { adminHealthHandlers } from "./admin-health-handlers"
import { adminHistoryHandlers } from "./admin-history-handlers"
import { adminMembersHandlers } from "./admin-members-handlers"
import { adminOverviewHandlers } from "./admin-overview-handlers"
import { adminPoolsHandlers } from "./admin-pools-handlers"
import { adminPositionsDirHandlers } from "./admin-positions-dir-handlers"
import { adminPositionsHandlers } from "./admin-positions-handlers"
import { adminSystemHandlers } from "./admin-system-handlers"
import { adminWalletsHandlers } from "./admin-wallets-handlers"

const isGlobalApiMockingEnabled =
  import.meta.env.VITE_API_MOCKING !== "disabled"

/**
 * Per-module MSW Mocking Configuration for Admin App.
 * Set any module flag to `false` to disable mocking for that specific module.
 */
export const moduleMockConfig = {
  health: true,
  auth: true,
  admins: true,
  positions: true,
  positionsDir: true,
  wallets: true,
  bonuses: true,
  history: true,
  overview: true,
  members: true,
  pools: true,
  system: true,
} as const

export const handlers = isGlobalApiMockingEnabled
  ? [
      ...(moduleMockConfig.health ? adminHealthHandlers : []),
      ...(moduleMockConfig.auth ? adminAuthHandlers : []),
      ...(moduleMockConfig.admins ? adminAdminsHandlers : []),
      ...(moduleMockConfig.positions ? adminPositionsHandlers : []),
      ...(moduleMockConfig.positionsDir ? adminPositionsDirHandlers : []),
      ...(moduleMockConfig.wallets ? adminWalletsHandlers : []),
      ...(moduleMockConfig.bonuses ? adminBonusesHandlers : []),
      ...(moduleMockConfig.history ? adminHistoryHandlers : []),
      ...(moduleMockConfig.overview ? adminOverviewHandlers : []),
      ...(moduleMockConfig.members ? adminMembersHandlers : []),
      ...(moduleMockConfig.pools ? adminPoolsHandlers : []),
      ...(moduleMockConfig.system ? adminSystemHandlers : []),
    ]
  : []
