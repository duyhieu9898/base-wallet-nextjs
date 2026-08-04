export type ApiRequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown
  accessToken?: string
  timeout?: number
}
