/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // WP-53 stage 2: the coach board consumes the engine's pure rollUp (workspace JS/ESM).
  transpilePackages: ["@performance-os/engine"],
};

export default nextConfig;
