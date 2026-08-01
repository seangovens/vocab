import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export', // Tells Next.js to generate static HTML/CSS/JS
  images: {
    unoptimized: true, // Required because static hosting can't optimize images on-the-fly
  },
};

export default nextConfig;
