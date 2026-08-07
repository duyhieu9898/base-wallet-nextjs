import { API_BASE_URL } from "@/config/api.config"

import type {
  OrganizationDescendantsResponse,
  OrganizationRootResponse,
} from "./organization-tree.types"

export const ORGANIZATION_CHILDREN_PER_PAGE = 8

/**
 * Fetch one page of a Position's direct downlines.
 *
 * One level, one page — see `organization-tree.types.ts` for why the tree is not
 * fetched whole.
 */
export async function fetchOrganizationChildren(
  positionId: string,
  page: number,
  signal?: AbortSignal,
): Promise<OrganizationDescendantsResponse> {
  const url = new URL(
    `/api/admin/positions/${encodeURIComponent(positionId)}/descendants`,
    API_BASE_URL,
  )
  url.searchParams.set("page", String(page))
  url.searchParams.set("perPage", String(ORGANIZATION_CHILDREN_PER_PAGE))

  const response = await fetch(url, { signal })
  if (!response.ok) {
    throw new Error(`Failed to load downlines for position ${positionId}.`)
  }

  return (await response.json()) as OrganizationDescendantsResponse
}

/**
 * Resolve the tree's root: the system root Position, or the Position matching a
 * search term when the map is re-rooted (`C050101` §5, Search Position in Map).
 */
export async function fetchOrganizationRoot(
  query: string,
  signal?: AbortSignal,
): Promise<OrganizationRootResponse> {
  const url = new URL("/api/admin/positions/root", API_BASE_URL)
  if (query) url.searchParams.set("query", query)

  const response = await fetch(url, { signal })
  if (!response.ok) {
    // Surface the server's reason when it gives one: "No position matches X" tells
    // the admin their search term was wrong, where a generic string does not.
    const message = await response
      .json()
      .then((body: { message?: string }) => body?.message)
      .catch(() => undefined)
    throw new Error(message ?? "Position not found.")
  }

  return (await response.json()) as OrganizationRootResponse
}
