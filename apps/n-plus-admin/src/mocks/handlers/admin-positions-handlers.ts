import { http, HttpResponse } from "msw"
import { getAddress } from "viem"

const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

const ROOT_POSITION_ID = "pos-root-000"

function checkBearerAuth(request: Request): Response | null {
  const authHeader = request.headers.get("Authorization")
  if (
    authHeader === "Bearer invalid" ||
    authHeader === "Bearer expired" ||
    request.headers.get("x-mock-unauthorized") === "true"
  ) {
    return HttpResponse.json(
      { error: "unauthorized", timestamp: new Date().toISOString() },
      { status: 401 },
    )
  }
  return null
}

function errorEnvelope(code: string, status = 404) {
  return HttpResponse.json(
    { error: code, timestamp: new Date().toISOString() },
    { status },
  )
}

/**
 * Deterministic fixture tree.
 *
 * Everything about a Position is derived from its ID, and the ID encodes the path
 * from the root (`pos-root-000-L1i5` is child 5 of level 1).
 */
function hashOf(value: string): number {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }
  return hash
}

/** Depth is encoded in the ID, so a handler answers without holding a tree. */
function depthOf(positionId: string): number {
  return positionId.split("-L").length - 1
}

function childIdOf(
  parentId: string,
  index: number,
  parentDepth: number,
): string {
  return `${parentId}-L${parentDepth + 1}i${index}`
}

/** Direct downline count for a Position, stable across requests. */
function childCountOf(positionId: string): number {
  if (depthOf(positionId) >= 5) return 0
  if (positionId === ROOT_POSITION_ID) return 23 // spans three pages
  const hash = hashOf(positionId)
  if (hash % 5 === 0) return 0 // leaf
  if (hash % 5 === 1) return 1 // only child: no rail
  return (hash % 9) + 2
}

function referralCodeOf(positionId: string): string {
  if (positionId === ROOT_POSITION_ID) return "SYSTEM-ROOT"
  const match = positionId.match(/-L(\d+)i(\d+)$/)
  if (!match) return positionId
  return `NPR${match[1]}${match[2].padStart(4, "0")}`
}

function walletFor(positionId: string): string {
  const hash = hashOf(positionId).toString(16).padStart(8, "0")
  return getAddress(`0x${hash.repeat(5)}`)
}

function statusFor(positionId: string): "Active" | "Inactive" | "Suspended" {
  const hash = hashOf(positionId) % 10
  if (hash === 7) return "Suspended"
  if (hash === 3) return "Inactive"
  return "Active"
}

const subtreeStatsCache = new Map<string, { count: number; depth: number }>()

function subtreeStats(positionId: string): { count: number; depth: number } {
  const cached = subtreeStatsCache.get(positionId)
  if (cached) return cached

  const parentDepth = depthOf(positionId)
  const directCount = childCountOf(positionId)

  let count = directCount
  let depth = directCount > 0 ? 1 : 0

  for (let index = 1; index <= directCount; index += 1) {
    const child = subtreeStats(childIdOf(positionId, index, parentDepth))
    count += child.count
    depth = Math.max(depth, child.depth + 1)
  }

  const stats = { count, depth }
  subtreeStatsCache.set(positionId, stats)
  return stats
}

const positionIndex = new Map<string, string>()

function registerPosition(positionId: string): void {
  positionIndex.set(referralCodeOf(positionId).toLowerCase(), positionId)
  positionIndex.set(walletFor(positionId).toLowerCase(), positionId)
}

registerPosition(ROOT_POSITION_ID)

function describePosition(positionId: string) {
  registerPosition(positionId)
  return {
    positionId,
    referralCode: referralCodeOf(positionId),
    status: statusFor(positionId),
    walletAddress: walletFor(positionId),
    hasChildren: childCountOf(positionId) > 0,
  }
}

interface DescendantNodeDto {
  positionId: string
  referralCode: string
  status: "Active" | "Inactive" | "Suspended"
  walletAddress: string
  hasChildren: boolean
  childrenTruncated: boolean
  children: DescendantNodeDto[]
}

function buildDescendantNode(
  positionId: string,
  currentDepth: number,
  maxDepth: number,
  limit: number,
): DescendantNodeDto {
  registerPosition(positionId)
  const totalChildren = childCountOf(positionId)
  const hasChildren = totalChildren > 0
  const parentDepth = depthOf(positionId)

  if (currentDepth >= maxDepth || !hasChildren) {
    return {
      ...describePosition(positionId),
      childrenTruncated: false,
      children: [],
    }
  }

  const fetchCount = Math.min(limit, totalChildren)
  const childrenTruncated = fetchCount < totalChildren

  const children = Array.from({ length: fetchCount }, (_, offset) => {
    const childId = childIdOf(positionId, offset + 1, parentDepth)
    return buildDescendantNode(childId, currentDepth + 1, maxDepth, limit)
  })

  return {
    ...describePosition(positionId),
    childrenTruncated,
    children,
  }
}

export const adminPositionsHandlers = [
  // System root position, or the position a search re-roots the map at.
  http.get(`${baseUrl}/api/admin/positions/root`, ({ request }) => {
    const authError = checkBearerAuth(request)
    if (authError) return authError

    const url = new URL(request.url)
    const query = url.searchParams.get("query")?.trim() ?? ""

    const positionId = query
      ? positionIndex.get(query.toLowerCase())
      : ROOT_POSITION_ID

    if (!positionId) {
      return errorEnvelope("resourceNotFound", 404)
    }

    const stats = subtreeStats(positionId)

    return HttpResponse.json({
      ...describePosition(positionId),
      joinedAt: "2026-01-01T00:00:00.000Z",
      rootPositionId: ROOT_POSITION_ID,
      depth: depthOf(positionId),
      isRoot: positionId === ROOT_POSITION_ID,
      descendantCount: stats.count,
      maxDepth: stats.depth,
      timestamp: new Date().toISOString(),
    })
  }),

  // Descendants up to maxDepth levels, nested (DescendantsTreeDto & OrganizationDescendantsResponse compatible)
  http.get(
    `${baseUrl}/api/admin/positions/:positionId/descendants`,
    ({ params, request }) => {
      const authError = checkBearerAuth(request)
      if (authError) return authError

      const positionId = String(params.positionId)
      const url = new URL(request.url)

      const pageParam = url.searchParams.get("page")
      const perPageParam = url.searchParams.get("perPage")
      const limitParam = url.searchParams.get("limit")
      const lastId = url.searchParams.get("lastId")
      const maxDepth = Math.max(
        1,
        Number(url.searchParams.get("maxDepth") ?? "1"),
      )

      const parentDepth = depthOf(positionId)
      const totalChildren = childCountOf(positionId)

      let startOffset = 0
      let perPage = 8

      if (pageParam || perPageParam) {
        const currentPage = Number(pageParam ?? "1")
        perPage = Number(perPageParam ?? "8")
        startOffset = (currentPage - 1) * perPage
      } else if (lastId) {
        const match = lastId.match(/i(\d+)$/)
        if (match) {
          startOffset = Number(match[1])
        }
        perPage = Number(limitParam ?? "10")
      } else {
        perPage = Number(limitParam ?? "10")
      }

      const fetchCount = Math.min(
        perPage,
        Math.max(0, totalChildren - startOffset),
      )
      const childrenTruncated = startOffset + fetchCount < totalChildren

      const children = Array.from({ length: fetchCount }, (_, offset) => {
        const childId = childIdOf(
          positionId,
          startOffset + offset + 1,
          parentDepth,
        )
        return buildDescendantNode(childId, 1, maxDepth, perPage)
      })

      const currentPage = Math.floor(startOffset / perPage) + 1

      return HttpResponse.json({
        children,
        childrenTruncated,
        meta: {
          currentPage,
          perPage,
          total: totalChildren,
        },
        timestamp: new Date().toISOString(),
      })
    },
  ),
]
