import type { NextConfig } from 'next';

// The API is its own server, but the browser only ever talks to this one:
// /api/* is proxied through, so every request the browser makes is same-origin.
// That is what lets the session cookie work with no CORS involved, and keeps it
// working when the two halves are deployed to different hosts. Server-side var,
// not NEXT_PUBLIC — only the Next server needs to know where the API lives.
const API_URL = process.env.API_URL ?? 'http://localhost:4000';

const nextConfig: NextConfig = {
    async rewrites() {
        return [{ source: '/api/:path*', destination: `${API_URL}/:path*` }];
    },
};

export default nextConfig;
