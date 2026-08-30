import type { NextConfig } from "next";

const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline' https://accounts.google.com https://checkout.razorpay.com https://api.razorpay.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' data: https://fonts.gstatic.com;
  img-src 'self' data: blob: https://lh3.googleusercontent.com https://res.cloudinary.com https://*.razorpay.com;
  connect-src 'self' https://accounts.google.com https://api.razorpay.com https://lumberjack.razorpay.com https://lumberjack-cx.razorpay.com https://checkout.razorpay.com;
  frame-src 'self' https://accounts.google.com https://api.razorpay.com https://checkout.razorpay.com;
`.replace(/\s{2,}/g, ' ').trim();

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  headers: async () => [{
     source: '/(.*)',
     headers: [
       { key: 'X-Content-Type-Options', value: 'nosniff' },
       { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
       { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
       { key: 'Content-Security-Policy', value: cspHeader }
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
