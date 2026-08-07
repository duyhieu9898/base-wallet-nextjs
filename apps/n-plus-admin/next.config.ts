import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "192.168.12.193"],
  transpilePackages: ["@nln/web3-evm"],
}

export default nextConfig
