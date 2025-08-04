/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: { 
      allowedOrigins: ['*'] 
    }
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  }
}

export default nextConfig