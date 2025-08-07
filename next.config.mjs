/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: { 
      allowedOrigins: ['*'] 
    }
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  }
}

export default nextConfig