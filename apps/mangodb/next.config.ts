import type { NextConfig } from 'next';

// The API is its own server, but the browser only ever talks to this one:
// /api/* is proxied through, so every request the browser makes is same-origin.
// That is what lets the session cookie work with no CORS involved, and keeps it
// working when the two halves are deployed to different hosts. Server-side var,
// not NEXT_PUBLIC — only the Next server needs to know where the API lives.
const API_URL = process.env.API_URL ?? 'http://localhost:4000';

const nextConfig: NextConfig = {
    // For the Docker image: next build copies only the files the server needs
    // into .next/standalone, so the image ships without the full node_modules.
    output: 'standalone',

    // No "X-Powered-By: Next.js": it only tells a scanner what to try.
    poweredByHeader: false,

    // Browser hardening on every page. Proxied /api/* answers do not get these:
    // a rewrite to another server skips them, and JSON is not framed or run.
    // frame-ancestors only: a script CSP needs per-request nonces for Next's
    // inline scripts, which is a bigger change than these headers.
    async headers() {
        return [
            {
                source: '/:path*',
                headers: [
                    // No other site may put these pages in a frame (clickjacking).
                    { key: 'X-Frame-Options', value: 'DENY' },
                    {
                        key: 'Content-Security-Policy',
                        value: "frame-ancestors 'none'",
                    },
                    // Use the Content-Type as sent, never guess one.
                    { key: 'X-Content-Type-Options', value: 'nosniff' },
                    // Other sites see only our origin, never a full URL with ids.
                    {
                        key: 'Referrer-Policy',
                        value: 'strict-origin-when-cross-origin',
                    },
                    // HTTPS only for two years. Browsers ignore it on plain http.
                    {
                        key: 'Strict-Transport-Security',
                        value: 'max-age=63072000; includeSubDomains',
                    },
                ],
            },
        ];
    },

    // portfolioImage is a Supabase public URL, and next/image refuses to load
    // a host it was not told about.
    images: {
        remotePatterns: [{ protocol: 'https', hostname: '*.supabase.co' }],
    },

    async rewrites() {
        return [{ source: '/api/:path*', destination: `${API_URL}/:path*` }];
    },
};

export default nextConfig;
