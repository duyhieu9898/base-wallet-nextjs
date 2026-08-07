/**
 * Common Utility Primitives & Helpers
 */

export type Nullable<T> = T | null

export type Optional<T> = T | undefined

export type AsyncState<T, E = Error> = {
  data: Nullable<T>
  isLoading: boolean
  error: Nullable<E>
}

export interface SelectOption<Value = string> {
  label: string
  value: Value
  disabled?: boolean
}

export type SortOrder = "asc" | "desc"
