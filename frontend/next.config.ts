/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    serverActions: {
      allowedOrigins: ['propman.exceva.capital', 'localhost:3000', 'localhost:3001']
    }
  },
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
  },
  // Configure static file handling
  distDir: '.next',
  poweredByHeader: false,
  generateEtags: false,
  compress: true
};

export default nextConfig;
