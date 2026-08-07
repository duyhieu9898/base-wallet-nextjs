import "@testing-library/jest-dom/vitest"

/**
 * jsdom implements no media queries, and the sidebar reads one through
 * `useIsMobile` to decide between the desktop rail and the mobile sheet. Without
 * this the shell cannot mount at all under test.
 *
 * Defaults to desktop. A test that needs the mobile branch overrides
 * `matches` for itself.
 */
/**
 * jsdom implements neither of these layout APIs, and the organization map uses
 * both to keep a wide tree readable: a ResizeObserver centres the scroll viewport
 * once the tree overflows, and `scrollIntoView` brings an expanded node back into
 * view. Neither has an observable effect in a layout-less DOM, so the stubs are
 * inert — they exist so the component can mount at all.
 */
Object.defineProperty(window, "ResizeObserver", {
  writable: true,
  value: class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
})

Object.defineProperty(Element.prototype, "scrollIntoView", {
  writable: true,
  value: () => {},
})

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }),
})
