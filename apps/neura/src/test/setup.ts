import "@testing-library/jest-dom/vitest"

/**
 * `n-plus` also installs the EVM runtime config and an MSW server here. Neither
 * is copied: there is no Solana runtime to configure yet, and no API to mock.
 * Both get added at the point they exist, so this file never claims setup that
 * does nothing.
 */
