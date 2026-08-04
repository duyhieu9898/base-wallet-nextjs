import { authHandlers } from "./auth-handlers"
import { protectedHandlers } from "./protected-handlers"

export const handlers = [...authHandlers, ...protectedHandlers]
