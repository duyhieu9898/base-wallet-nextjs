/**
 * Generic API Response Wrapper
 */
export interface ApiResponse<T = unknown> {
  success: boolean
  code: number | string
  message: string
  data: T
  meta?: PaginationMeta
}

/**
 * Pagination Metadata
 */
export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages?: number
}

/**
 * Paginated API Response Wrapper
 */
export interface ApiPaginatedResponse<T = unknown> extends ApiResponse<T[]> {
  meta: PaginationMeta
}

/**
 * Standard API Error Payload format
 */
export interface ApiErrorPayload {
  code?: string
  message?: string
  details?: unknown
}

/**
 * Options passed to apiRequest calls
 */
export type ApiRequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown
  accessToken?: string
  timeout?: number
}
