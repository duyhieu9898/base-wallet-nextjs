import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { createRouter, RouterProvider } from "@tanstack/react-router"

import "@fontsource-variable/inter"
import "@/styles/globals.css"

import { routeTree } from "./routeTree.gen"

const router = createRouter({ routeTree })

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

/**
 * MSW must be running before the first request leaves the app, not merely
 * mounted alongside it. Under Next this was a provider effect; in a static
 * bundle the whole tree renders on the first tick, so the worker starts here and
 * `createRoot` waits for it.
 */
async function enableMocking(): Promise<void> {
  if (import.meta.env.VITE_API_MOCKING !== "enabled") return

  const { worker } = await import("@/mocks/browser")

  await worker.start({ onUnhandledRequest: "bypass" })
}

const rootElement = document.getElementById("root")

if (!rootElement) {
  throw new Error("Root element #root is missing from index.html.")
}

void enableMocking().then(() => {
  createRoot(rootElement).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  )
})
