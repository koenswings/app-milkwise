import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Base URL for Open Graph image URLs
  env: {
    NEXT_PUBLIC_BASE_URL: 'https://idea.tail2d60.ts.net',
  },
  allowedDevOrigins: ['idea.tail2d60.ts.net', '100.115.60.6', '192.168.0.231'],
  output: 'standalone',
  // Prevent browsers from caching HTML pages — JS/CSS chunks are content-hashed
  // and cache fine, but the HTML shell must always be revalidated so that after
  // a new deploy the browser fetches the shell with updated chunk references.
  async headers() {
    return [
      {
        source: '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$|.*\\.json$).*)',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
        ],
      },
    ];
  },
};

export default nextConfig;
