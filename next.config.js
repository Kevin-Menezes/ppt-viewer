/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  basePath: '/bible-stories',
  assetPrefix: '/bible-stories',
};

module.exports = nextConfig;
