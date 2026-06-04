import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Base URL for Open Graph image URLs
  env: {
    NEXT_PUBLIC_BASE_URL: 'https://idea.tail2d60.ts.net',
  },
  allowedDevOrigins: ['idea.tail2d60.ts.net', '100.115.60.6', '192.168.0.231'],
  output: 'standalone',
};

export default nextConfig;
