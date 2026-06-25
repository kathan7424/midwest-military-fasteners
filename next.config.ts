import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  devIndicators: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "dev-mmf-wp.pantheonsite.io",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
