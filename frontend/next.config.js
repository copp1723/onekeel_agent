/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  // Configure assetPrefix for Replit
  assetPrefix: process.env.NODE_ENV === 'production' ? '.' : undefined,
  // Make sure Next.js listens on 0.0.0.0 to be accessible outside the container
  env: {
    HOST: '0.0.0.0',
  },
};

module.exports = nextConfig;