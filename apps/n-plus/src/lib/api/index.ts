import type { ApiRequestOptions } from "./types"
import { apiRequest } from "./api-client"

export const api = {
  get<T>(path: string, options?: ApiRequestOptions) {
    return apiRequest<T>(path, {
      ...options,
      method: "GET",
    })
  },

  post<T>(path: string, body?: unknown, options?: ApiRequestOptions) {
    return apiRequest<T>(path, {
      ...options,
      method: "POST",
      body,
    })
  },

  put<T>(path: string, body?: unknown, options?: ApiRequestOptions) {
    return apiRequest<T>(path, {
      ...options,
      method: "PUT",
      body,
    })
  },

  patch<T>(path: string, body?: unknown, options?: ApiRequestOptions) {
    return apiRequest<T>(path, {
      ...options,
      method: "PATCH",
      body,
    })
  },

  delete<T>(path: string, options?: ApiRequestOptions) {
    return apiRequest<T>(path, {
      ...options,
      method: "DELETE",
    })
  },
}
