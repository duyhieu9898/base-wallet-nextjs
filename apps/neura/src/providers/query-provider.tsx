import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState, type ReactNode } from "react"

type QueryProviderProps = {
  children: ReactNode
}

/**
 * `n-plus` additionally passes a `retry` predicate that stops retrying on HTTP
 * 4xx. It is not copied here because it keys on that application's `ApiError`,
 * and this application has no API layer yet — copying it would mean copying a
 * client for a backend Neura does not talk to. Add the predicate together with
 * the API layer, not before it.
 */
function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 15_000,
        refetchOnWindowFocus: false,
      },

      mutations: {
        retry: false,
      },
    },
  })
}

export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(createQueryClient)

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}
