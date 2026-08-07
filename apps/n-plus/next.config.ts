import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Playwright (and other tools) access the dev server via 127.0.0.1, which differs
  // from the default initialized hostname localhost → dev assets blocked by Next.js 16.
  allowedDevOrigins: ["127.0.0.1"],
  transpilePackages: ["@nln/web3-evm"],
}

export default nextConfig
