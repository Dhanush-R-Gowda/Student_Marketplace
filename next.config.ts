import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Allow local uploads directory
    remotePatterns: [],
    localPatterns: [{ pathname: "/uploads/**" }],
  },
  // Allow serving uploaded images from /public/uploads
  async headers() {
    return [
      {
        source: "/uploads/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
