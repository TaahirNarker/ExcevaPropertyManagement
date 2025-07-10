/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    serverActions: {
      allowedOrigins: ['propman.exceva.capital', 'localhost:3000', 'localhost:3001']
    }
  },
  // Ensure static files are properly handled
  assetPrefix: process.env.NODE_ENV === 'production' ? 'https://propman.exceva.capital' : '',
  // Disable image optimization in production as we'll handle it via nginx
  images: {
    unoptimized: process.env.NODE_ENV === 'production',
  },
  // Temporarily disable type checking and linting for production build
  typescript: {
    ignoreBuildErrors: true
  },
  eslint: {
    ignoreDuringBuilds: true
  }
};

export default nextConfig;
