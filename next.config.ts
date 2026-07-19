import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  generateBuildId: async () => {
    return process.env.GIT_HASH ?? null
  },
  output: 'export',
  distDir: 'dist',
  images: {
    unoptimized: true, // Required for static exports
  },
  reactStrictMode: true,
  devIndicators: false,
}

export default nextConfig
