import type { NextConfig } from 'next';

// Dev: proxy the API to the NestJS backend so cookies stay first-party.
// Production: nginx does the same (see ../nginx/default.conf).
const backend = process.env.IELTS_BACKEND_URL ?? 'http://localhost:4002';

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${backend}/:path*` }];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Permissions-Policy', value: 'microphone=(self), camera=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
