/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === "production";

// Only wrap with next-pwa in production builds
const baseConfig = {
  reactStrictMode: true,
  turbopack: {},           // suppress Turbopack/webpack warning
  experimental: {
    serverActions: { allowedOrigins: ["localhost:3000"] },
  },
};

let nextConfig = baseConfig;

if (isProd) {
  const withPWA = require("next-pwa")({
    dest: "public",
    register: true,
    skipWaiting: true,
    sw: "sw.js",
    fallbacks: { document: "/offline" },
  });
  nextConfig = withPWA(baseConfig);
}

module.exports = nextConfig;
