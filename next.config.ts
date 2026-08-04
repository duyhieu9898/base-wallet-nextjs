import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Playwright (và các công cụ khác) truy cập dev server qua 127.0.0.1, khác
  // với hostname khởi tạo mặc định là localhost → bị Next.js 16 chặn dev assets.
  allowedDevOrigins: ["127.0.0.1"],
}

export default nextConfig
