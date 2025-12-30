import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    // Only proxy to local Python server during development
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/api/:path*',
          destination: 'http://127.0.0.1:5328/api/:path*',
        },
      ];
    }
    // In production (Vercel), standard routing applies
    return [];
  },
};

export default nextConfig;
