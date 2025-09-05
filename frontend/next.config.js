/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: { appDir: true },
  // Ensure the dev server binds to all interfaces for preview
  devIndicators: {
    buildActivity: false
  }
};
module.exports = nextConfig;
