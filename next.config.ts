import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'export',
  distDir: 'dist', // Output to 'dist' to match the existing firebase.json public path
  images: {
    unoptimized: true, // Required for static exports
  },
  reactStrictMode: true,
  devIndicators: false,
}

export default nextConfig
