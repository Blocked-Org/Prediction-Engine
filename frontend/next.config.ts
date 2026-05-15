import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    optimizeCss: true,
  },
  headers: async () => [
    {
      source: '/api/forecast',
      headers: [
        { key: 'Cache-Control', value: 'public, s-maxage=300, stale-while-revalidate=600' },
      ],
    },
    {
      source: '/api/report',
      headers: [
        { key: 'Cache-Control', value: 'public, s-maxage=120, stale-while-revalidate=300' },
      ],
    },
  ],
};

export default withNextIntl(nextConfig);
