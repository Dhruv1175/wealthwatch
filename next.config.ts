import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  headers: async () => [{
     source: '/(.*)',
     headers: [
       { key: 'X-Content-Type-Options', value: 'nosniff' },
       { key: 'X-Frame-Options', value: 'DENY' },
       { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' }
     ]
   }],
   images: {
    remotePatterns: [
      {
        // Google profile images (OAuth via NextAuth)
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
      {
        // Cloudinary CDN (profile photo uploads)
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
