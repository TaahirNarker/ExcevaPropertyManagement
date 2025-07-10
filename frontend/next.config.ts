/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    serverActions: true,
  },
  // Ensure static files are properly handled
  assetPrefix: process.env.NODE_ENV === 'production' ? 'https://propman.exceva.capital' : '',
  // Disable image optimization in production as we'll handle it via nginx
  images: {
    unoptimized: process.env.NODE_ENV === 'production',
  }
};

export default nextConfig;
